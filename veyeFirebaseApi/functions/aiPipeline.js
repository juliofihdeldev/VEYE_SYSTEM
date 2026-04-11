/**
 * AI Processing Pipeline for VEYe
 *
 * Processes raw social media posts (Telegram/Facebook) through:
 * 1. Relevance filter - "Is this a safety incident in Haiti?"
 * 2. Data extraction - Incident type, location, victim, severity
 * 3. Geocoding - Convert location text to lat/lng
 * 4. Deduplication - Embeddings similarity vs existing reports
 * 5. Write to Firestore - ZoneDanger or Viktim
 *
 * Uses Google Gemini for all AI steps (filter, extract, embeddings).
 * Uses Google Geocoding for location.
 *
 * Config: GOOGLE_GEMINI_API_KEY, GOOGLE_GEOCODING_API_KEY
 */

const axios = require('axios');
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { sendOneSignalNotification } = require('./notificationHelper');

const COLLECTION_ZONE_DANGER = 'ZoneDanger';
const COLLECTION_EMBEDDINGS = 'AIPipelineEmbeddings';
const COLLECTION_KIDNAPING_ALERT = 'KidnapingAlert';



// Similarity threshold for deduplication (0-1)
const DEDUPE_THRESHOLD = 0.85;
const DEDUPE_LOOKBACK_HOURS = 72;

/**
 * Get config from env or Firebase functions config
 */
function getConfig() {
  const config = (typeof require('firebase-functions') !== 'undefined')
    ? require('firebase-functions').config()
    : {};
  return {
    geocodingKey: process.env.GOOGLE_GEOCODING_API_KEY || config.ai?.geocoding_key,
    googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || config.ai?.google_gemini_api_key,
  };
}

/**
 * Get Gemini client (lazy init)
 */
function getGeminiClient() {
  const { googleGeminiApiKey } = getConfig();
  if (!googleGeminiApiKey) return null;
  const { GoogleGenAI } = require('@google/genai');
  return new GoogleGenAI({ apiKey: googleGeminiApiKey });
}

/**
 * Step 1: Filter relevance - Is this about a safety incident in Haiti?
 * Returns { relevant: boolean, confidence: number }
 */
async function filterRelevance(text) {
  const { googleGeminiApiKey } = getConfig();
  functions.logger.info('filterRelevance: start', { hasGeminiKey: !!googleGeminiApiKey, textLength: (text || '').length });

  const prompt = `You are a filter for a Haiti safety alert app. The text below is from a social media post (possibly in Kreyòl, French, or English).

Is this text about a REAL-TIME safety or security incident in Haiti? Examples: shootings, kidnappings, robberies, road blocks, gang activity, disappearances, violence, danger zones.

Reply with ONLY valid JSON: {"relevant": true/false, "confidence": 0.0-1.0}
- relevant: true only if it describes a current/recent safety incident in Haiti
- confidence: how sure you are (0-1)
- Reject: news summaries, opinions, old events, non-Haiti, non-safety topics

Text:
---
${(text || '').slice(0, 2000)}
---`;

  if (!googleGeminiApiKey) {
    functions.logger.warn('filterRelevance: GOOGLE_GEMINI_API_KEY not set, defaulting to relevant');
    return { relevant: true, confidence: 0.5 };
  }

  try {
    const genAI = getGeminiClient();
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const content = (typeof response.text === 'function' ? response.text() : response.text) || '{}';
    const result = parseJsonResponse(content);
    functions.logger.info('filterRelevance: Gemini response', { result });
    return result;
  } catch (err) {
    functions.logger.error('filterRelevance: Gemini failed', { err: err.message });
    return { relevant: true, confidence: 0.5 };
  }
}

/**
 * Step 2: Extract structured data from relevant post
 */
async function extractData(text, sourceMetadata = {}) {
  const { googleGeminiApiKey } = getConfig();
  functions.logger.info('extractData: start', { hasGeminiKey: !!googleGeminiApiKey, textLength: (text || '').length });

  const prompt = `Extract incident data from this Haiti safety-related post. Reply with ONLY valid JSON.

Output schema:
{
  "docType": "zone_danger" | "viktim" | "news",
  "incidentType": "shooting" | "kidnapping" | "robbery" | "road_block" | "gang_activity" | "violence" | "disappearance" | "other",
  "locationText": "extracted location mention or null",
  "victimName": "name if mentioned or null",
  "severity": "high" | "medium" | "low",
  "summary": "brief 1-2 sentence summary",
  "name": "short zone/location name for ZoneDanger"
}

- docType: "zone_danger" = danger zone/alert, "viktim" = victim-specific (kidnapping, etc), "news" = general news
- locationText: e.g. "bò mache Petyon Vil", "Delmas 33", "Port-au-Prince"
- If no clear location, use "Haiti" or null

Text:
---
${(text || '').slice(0, 3000)}
---`;

  if (!googleGeminiApiKey) {
    functions.logger.warn('extractData: GOOGLE_GEMINI_API_KEY not set, using fallback');
    return { docType: 'news', incidentType: 'other', locationText: null, victimName: null, severity: 'low', summary: text?.slice(0, 500) || '', name: 'Haiti', ...sourceMetadata };
  }

  try {
    const genAI = getGeminiClient();
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const content = (typeof response.text === 'function' ? response.text() : response.text) || response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const result = { ...parseJsonResponse(content), ...sourceMetadata };
    functions.logger.info('extractData: Gemini response', { docType: result.docType, incidentType: result.incidentType, locationText: result.locationText });
    return result;
  } catch (err) {
    functions.logger.error('extractData: Gemini failed', { err: err.message });
    return { docType: 'news', incidentType: 'other', locationText: null, victimName: null, severity: 'low', summary: text?.slice(0, 500) || '', name: 'Haiti', ...sourceMetadata };
  }
}

/**
 * Step 3: Geocode location text to lat/lng (bias toward Haiti)
 */
async function geocodeLocation(address) {
  if (!address || address.trim().length < 2) return null;
  const { geocodingKey } = getConfig();
  if (!geocodingKey) return null;

  try {
    const addressWithHaiti = address.trim().toLowerCase().includes('haiti')
      ? address.trim()
      : `${address.trim()}, Haiti`;
    const res = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address: addressWithHaiti,
          key: geocodingKey,
          region: 'ht',
        },
      }
    );
    const result = res.data?.results?.[0];
    const loc = result?.geometry?.location;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
      functions.logger.warn('geocodeLocation: no valid result', { address: addressWithHaiti, status: res.data?.status });
      return null;
    }
    const components = result?.address_components || [];
    const cityComponent = components.find(c =>
      c.types.includes('locality') || c.types.includes('administrative_area_level_2')
    );
    const city = cityComponent?.long_name || null;
    functions.logger.info('geocodeLocation: success', { latitude: loc.lat, longitude: loc.lng, city });
    return { latitude: loc.lat, longitude: loc.lng, city };
  } catch (err) {
    functions.logger.error('geocodeLocation: failed', { err: err.message });
    return null;
  }
}

/**
 * Step 4: Get embedding for text (Gemini)
 */
async function getEmbedding(text) {
  const { googleGeminiApiKey } = getConfig();
  if (!googleGeminiApiKey) {
    functions.logger.info('getEmbedding: GOOGLE_GEMINI_API_KEY not set, skipping');
    return null;
  }

  try {
    const genAI = getGeminiClient();
    const response = await genAI.models.embedContent({
      model: 'gemini-embedding-001',
      contents: [(text || '').slice(0, 8000)],
    });
    const embedding = response.embeddings?.[0]?.values ?? response.embeddings?.[0]?.embedding ?? null;
    functions.logger.info('getEmbedding: success', { hasEmbedding: !!embedding, dims: embedding?.length });
    return embedding;
  } catch (err) {
    functions.logger.warn('getEmbedding: Gemini failed', { err: err.message });
    return null;
  }
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Step 5: Check for duplicate - compare embedding to recent docs
 */
async function isDuplicate(db, embedding, text) {
  if (!embedding) return false;

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - DEDUPE_LOOKBACK_HOURS);
  const cutoffTs = admin.firestore.Timestamp.fromDate(cutoff);

  const zoneSnap = await db
    .collection(COLLECTION_ZONE_DANGER)
    .where('date', '>=', cutoffTs)
    .limit(50)
    .get();

  const kidnapingSnap = await db
    .collection(COLLECTION_KIDNAPING_ALERT)
    .where('date', '>=', cutoffTs)
    .limit(50)
    .get();


  const candidates = [
    ...zoneSnap.docs.map((d) => ({ ...d.data(), id: d.id })),
    ...kidnapingSnap.docs.map((d) => ({ ...d.data(), id: d.id })),
  ];

  for (const doc of candidates) {
    let docEmbedding = null;
    const cached = await db
      .collection(COLLECTION_EMBEDDINGS)
      .doc(doc.id)
      .get();
    if (cached.exists) {
      docEmbedding = cached.data().embedding;
    } else {
      const docText = [doc.rezon, doc.details, doc.summary, doc.name]
        .filter(Boolean)
        .join(' ');
      docEmbedding = await getEmbedding(docText);
      if (docEmbedding) {
        await db.collection(COLLECTION_EMBEDDINGS).doc(doc.id).set({
          embedding: docEmbedding,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
    if (docEmbedding) {
      const sim = cosineSimilarity(embedding, docEmbedding);
      if (sim >= DEDUPE_THRESHOLD) return true;
    }
  }

  return false;
}

/**
 * Step 6: Build and write Firestore document
 */
async function writeToFirestore(db, extracted, sourceMetadata) {
  const {
    docType,
    incidentType,
    locationText,
    victimName,
    severity,
    summary,
    name,
    latitude,
    longitude,
  } = extracted;

  const baseDoc = {
    source: sourceMetadata.source || 'telegram',
    sourceUrl: sourceMetadata.sourceUrl || null,
    verified: false,
    aiConfidence: extracted.confidence ?? 0.8,
    date: admin.firestore.Timestamp.fromDate(new Date()),
    rezon: summary || sourceMetadata.summary,
    telegramChannelId: sourceMetadata.telegramChannelId ?? null,
    telegramMessageId: sourceMetadata.telegramMessageId ?? null,
  };


  const zoneDoc = {
    ...baseDoc,
    name: name || locationText || 'Zone danger',
    address: locationText || 'Haiti',
    city: extracted.city || null,
    latitude: latitude || null,
    longitude: longitude || null,
    rezon: `[${incidentType}] ${summary || baseDoc.rezon}`,
  };

  const zoneRef = await db.collection(COLLECTION_ZONE_DANGER).add(zoneDoc);

  const notificationMessage = `Nan ${zoneDoc.address || 'Haiti'} ${zoneDoc.rezon}`;
  const position = {
    latitude: latitude || null,
    longitude: longitude || null,
  };
  sendOneSignalNotification(notificationMessage, position).catch(err => {
    functions.logger.warn('writeToFirestore: notification failed', { err: err.message });
  });

  if (docType === 'viktim' || incidentType === 'kidnapping') {
    const viktimDoc = {
      ...baseDoc,
      name: name || locationText || 'Zone danger',
      address: locationText || 'Haiti',
      latitude: latitude || null,
      longitude: longitude || null,
      rezon: `[${incidentType}] ${summary || baseDoc.rezon}`,
    };
    const viktimRef = await db.collection(COLLECTION_KIDNAPING_ALERT).add(viktimDoc);
    return { collection: COLLECTION_KIDNAPING_ALERT, id: viktimRef.id, zoneId: zoneRef.id };
  }

  return { collection: COLLECTION_ZONE_DANGER, id: zoneRef.id };
}

/**
 * Parse JSON from model response (handle markdown code blocks)
 */
function parseJsonResponse(text) {
  if (!text || typeof text !== 'string') return {};
  const cleaned = text.replace(/```json?\s*/g, '').replace(/```\s*$/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

// Number of spam strikes before a user is blocked
const SPAM_STRIKE_LIMIT = 3;
// Window in hours within which strikes are counted
const SPAM_WINDOW_HOURS = 24;
// Hours after which a block expires automatically
const BLOCK_COOLDOWN_HOURS = 72;

/**
 * Check if a user is currently blocked from submitting reports.
 * Auto-unblocks if the block cooldown period has passed.
 * Returns { blocked: boolean, unblockedAt: number | null }
 * where unblockedAt is the Unix ms timestamp when the block expires.
 */
async function isUserBlocked(db, userId) {
  if (!userId) return { blocked: false, unblockedAt: null };
  const ref = db.collection('UserModerations').doc(userId);
  const doc = await ref.get();
  if (!doc.exists) return { blocked: false, unblockedAt: null };

  const data = doc.data();
  if (!data.blocked) return { blocked: false, unblockedAt: null };

  // Auto-unblock if cooldown has passed
  const blockedAt = data.blockedAt?.toMillis?.() ?? null;
  if (blockedAt) {
    const cooldownMs = BLOCK_COOLDOWN_HOURS * 60 * 60 * 1000;
    if (Date.now() - blockedAt >= cooldownMs) {
      await ref.update({
        blocked: false,
        strikes: [],
        strikeCount: 0,
        unblockedAt: admin.firestore.FieldValue.serverTimestamp(),
        unblockReason: 'cooldown_expired',
      });
      functions.logger.info('isUserBlocked: auto-unblocked after cooldown', { userId });
      return { blocked: false, unblockedAt: null };
    }
    return { blocked: true, unblockedAt: blockedAt + cooldownMs };
  }

  return { blocked: true, unblockedAt: null };
}

/**
 * Manually unblock a user and reset their strike record.
 */
async function unblockUser(db, userId) {
  if (!userId) throw new Error('userId is required');
  await db.collection('UserModerations').doc(userId).set({
    blocked: false,
    strikes: [],
    strikeCount: 0,
    unblockedAt: admin.firestore.FieldValue.serverTimestamp(),
    unblockReason: 'manual_admin',
  }, { merge: true });
  functions.logger.info('unblockUser: user unblocked by admin', { userId });
}

/**
 * Record a spam strike for a user.
 * Automatically blocks the user after SPAM_STRIKE_LIMIT strikes within SPAM_WINDOW_HOURS.
 */
async function recordSpamStrike(db, userId, reason) {
  if (!userId) return;

  const ref = db.collection('UserModerations').doc(userId);
  const doc = await ref.get();
  const now = Date.now();
  const windowMs = SPAM_WINDOW_HOURS * 60 * 60 * 1000;

  let strikes = doc.exists ? (doc.data().strikes || []) : [];

  // Drop strikes outside the rolling window
  strikes = strikes.filter(ts => now - ts < windowMs);
  strikes.push(now);

  const shouldBlock = strikes.length >= SPAM_STRIKE_LIMIT;

  await ref.set({
    userId,
    strikes,
    strikeCount: strikes.length,
    blocked: shouldBlock,
    lastStrikeReason: reason,
    lastStrikeAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(shouldBlock ? { blockedAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
  }, { merge: true });

  functions.logger.warn('recordSpamStrike', { userId, strikeCount: strikes.length, blocked: shouldBlock, reason });
}

/**
 * Run full pipeline on a single post
 * Returns { processed: boolean, written?: { collection, id }, skipped?: reason }
 */
async function processPost(db, postPayload, isSentByUser = false) {

  const config = getConfig();
  const aiEnabled = !!config.googleGeminiApiKey;
  const text = postPayload.summary || postPayload.title || '';
  const userId = postPayload.userId || null;

  functions.logger.info('processPost: start', { aiEnabled, isSentByUser, userId, textLength: text.length });

  if (!aiEnabled) {
    functions.logger.warn('processPost: GOOGLE_GEMINI_API_KEY not configured, skipping');
    return { processed: false, skipped: 'no_ai_config' };
  }

  // Block check — always enforced for user submissions
  if (isSentByUser && userId) {
    const blockInfo = await isUserBlocked(db, userId);
    if (blockInfo.blocked) {
      functions.logger.warn('processPost: blocked user attempted to submit', { userId });
      return { processed: false, skipped: 'user_blocked', unblockedAt: blockInfo.unblockedAt };
    }
  }

  // Relevance filter — runs for everyone including user submissions to prevent trolling
  const step1 = await filterRelevance(text);
  functions.logger.info('processPost: filterRelevance result', { relevant: step1.relevant, confidence: step1.confidence });
  if (!step1.relevant || (step1.confidence || 0) < 0.6) {
    // Record a spam strike if a real user submitted irrelevant content
    if (isSentByUser && userId) {
      await recordSpamStrike(db, userId, 'not_relevant');
    }
    return { processed: true, skipped: 'not_relevant', confidence: step1.confidence };
  }

  const sourceMetadata = {
    source: postPayload.source,
    sourceUrl: postPayload.sourceUrl,
    summary: postPayload.summary,
    imageSource: postPayload.imageSource,
    telegramChannelId: postPayload.telegramChannelId,
    telegramMessageId: postPayload.telegramMessageId,
  };
  const step2 = await extractData(text, sourceMetadata);

  // If the post was sent by a real user, trust their GPS coords directly
  if (isSentByUser && postPayload.position?.latitude) {
    step2.latitude = postPayload.position.latitude;
    step2.longitude = postPayload.position.longitude;
  }

  // Always try geocoding to get city name; also use lat/lng if no user GPS
  let latLng = null;
  if (step2.locationText) {
    latLng = await geocodeLocation(step2.locationText);
  }
  if (latLng) {
    if (!step2.latitude) step2.latitude = latLng.latitude;
    if (!step2.longitude) step2.longitude = latLng.longitude;
    if (latLng.city) step2.city = latLng.city;
  }

  const embedding = await getEmbedding(text);
  const duplicate = await isDuplicate(db, embedding, text);
  if (duplicate) {
    if (isSentByUser && userId) {
      await recordSpamStrike(db, userId, 'duplicate');
    }
    return { processed: true, skipped: 'duplicate' };
  }

  const written = await writeToFirestore(db, step2, sourceMetadata);
  functions.logger.info('processPost: wrote to Firestore', { collection: written.collection, id: written.id });
  return { processed: true, written };
}

module.exports = {
  filterRelevance,
  extractData,
  geocodeLocation,
  getEmbedding,
  isDuplicate,
  writeToFirestore,
  processPost,
  isUserBlocked,
  unblockUser,
  recordSpamStrike,
  getConfig,
};
