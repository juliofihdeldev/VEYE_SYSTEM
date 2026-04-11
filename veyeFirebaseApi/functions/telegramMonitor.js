/**
 * Telegram Channel Monitor
 *
 * Scheduled Cloud Function that fetches new posts from configured Telegram
 * channels, runs them through the AI pipeline, and writes to Firestore.
 *
 * Flow:
 * 1. Fetch new posts from Telegram
 * 2. For each post: run AI pipeline (filter → extract → geocode → dedupe)
 * 3. Relevant incidents → ZoneDanger or Viktim
 * 4. Non-relevant or AI disabled → News (fallback)
 *
 * Setup:
 * 1. Create a bot via @BotFather and get TELEGRAM_BOT_TOKEN
 * 2. Add the bot as admin to target channels
 * 3. Set TELEGRAM_BOT_TOKEN and optionally TELEGRAM_CHANNEL_IDS
 * 4. For AI: set OPENAI_API_KEY, GOOGLE_GEOCODING_API_KEY
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const { processPost } = require('./aiPipeline');

const COLLECTION_NEWS = 'News';
const COLLECTION_TELEGRAM_STATE = 'TelegramMonitorState';

/**
 * Fetch updates from Telegram Bot API
 * @param {string} botToken - Telegram bot token
 * @param {number} offset - Last update_id + 1 to fetch only new updates
 * @returns {Promise<Array>} Array of updates
 */
async function getTelegramUpdates(botToken, offset = 0) {
  const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
  const params = { offset, timeout: 30 };
  const { data } = await axios.get(url, { params });
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || 'Unknown'}`);
  }
  return data.result || [];
}

/**
 * Get last processed update_id from Firestore
 */
async function getLastUpdateId(db) {
  const doc = await db.collection(COLLECTION_TELEGRAM_STATE).doc('cursor').get();
  return doc.exists ? doc.data().lastUpdateId || 0 : 0;
}

/**
 * Save last processed update_id to Firestore
 */
async function saveLastUpdateId(db, updateId) {
  await db.collection(COLLECTION_TELEGRAM_STATE).doc('cursor').set({
    lastUpdateId: updateId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Normalize update to a post-like object (works for channel_post and group message)
 */
function getPostFromUpdate(update) {
  const post = update.channel_post || update.edited_channel_post || update.message || update.edited_message;
  return post;
}

/**
 * Classify where the update came from (Telegram chat type).
 * @returns {'channel'|'group'|'supergroup'|'private'|'none'}
 */
function classifyChatSource(update) {
  if (update.channel_post || update.edited_channel_post) {
    return 'channel';
  }
  const post = getPostFromUpdate(update);
  if (!post || !post.chat) return 'none';
  const t = post.chat.type;
  if (t === 'private') return 'private';
  if (t === 'group') return 'group';
  if (t === 'supergroup') return 'supergroup';
  if (t === 'channel') return 'channel';
  return 'none';
}

function emptySourceCounts() {
  return { channel: 0, group: 0, supergroup: 0, private: 0, none: 0 };
}

/**
 * Extract text and metadata from a channel post or group message
 */
function parseChannelPost(post, botToken) {
  const text = post.text || post.caption || '';
  const chat = post.chat || {};
  const channelId = chat.id;
  const channelTitle = chat.title || `Channel ${channelId}`;
  const messageId = post.message_id;
  const date = post.date ? new Date(post.date * 1000) : new Date();

  // Build source URL: t.me/username/msgId for public, t.me/c/chatId/msgId for private
  const safeChannelId = channelId.toString().replace(/^-100/, '');
  const sourceUrl = chat.username
    ? `https://t.me/${chat.username}/${messageId}`
    : `https://t.me/c/${safeChannelId}/${messageId}`;

  const imageSource = post.photo && post.photo.length > 0 ? 'photo_present' : null;

  return {
    source: 'telegram',
    sourceUrl,
    channelName: channelTitle,
    channelId: channelId.toString(),
    title: text.slice(0, 200) || channelTitle,
    summary: text,
    imageSource,
    date: admin.firestore.Timestamp.fromDate(date),
    telegramMessageId: messageId,
    telegramChannelId: channelId,
  };
}

/**
 * Check if we already have this post in Firestore (raw deduplication by telegram ids)
 */
async function isDuplicate(db, channelId, messageId) {
  for (const coll of [COLLECTION_NEWS, 'ZoneDanger', 'Viktim']) {
    const snapshot = await db
      .collection(coll)
      .where('telegramChannelId', '==', channelId)
      .where('telegramMessageId', '==', messageId)
      .limit(1)
      .get();
    if (!snapshot.empty) return true;
  }
  return false;
}

/**
 * Main monitor logic
 * Runs each post through AI pipeline; falls back to News if AI skips or is disabled
 */
async function runMonitor(db, botToken, channelFilter) {
  let lastUpdateId = await getLastUpdateId(db);
  functions.logger.info('Telegram monitor starting', { lastUpdateId, channelFilter: channelFilter || 'none (all channels)' });

  const updates = await getTelegramUpdates(botToken, lastUpdateId);
  functions.logger.info('Telegram getUpdates returned', {
    count: updates.length,
    firstUpdateId: updates[0]?.update_id,
    lastUpdateId: updates[updates.length - 1]?.update_id,
    sampleKeys: updates[0] ? Object.keys(updates[0]) : [],
  });
  if (updates.length === 0) {
    functions.logger.info('No updates from Telegram. Possible causes: 1) Bot not admin in channel 2) Using a Group (not Channel) - only Channels send channel_post 3) No new messages since last run');
  }

  let processed = 0;
  let writtenNews = 0;
  let writtenZoneDanger = 0;
  let writtenViktim = 0;
  let skippedRelevant = 0;
  let skippedDuplicate = 0;

  const updatesReceivedByType = emptySourceCounts();
  /** One row per Telegram update (for dashboard UI) */
  const updateDetails = [];

  for (const update of updates) {
    processed++;
    if (update.update_id > lastUpdateId) {
      lastUpdateId = update.update_id;
    }

    const chatSource = classifyChatSource(update);
    updatesReceivedByType[chatSource] = (updatesReceivedByType[chatSource] || 0) + 1;

    const pushDetail = (outcome, extra = {}) => {
      const post = getPostFromUpdate(update);
      const title =
        post?.chat?.title ||
        (post?.chat?.username ? `@${post.chat.username}` : null) ||
        (chatSource === 'private' ? 'Discussion privée' : null) ||
        '—';
      updateDetails.push({
        updateId: update.update_id,
        chatSource,
        chatTitle: title,
        chatId: post?.chat?.id ?? null,
        textPreview: (post?.text || post?.caption || '').slice(0, 160),
        outcome,
        ...extra,
      });
    };

    const post = getPostFromUpdate(update);
    if (!post) {
      functions.logger.info('Update has no post or message', { updateId: update.update_id, keys: Object.keys(update) });
      pushDetail('no_payload');
      continue;
    }

    const channelId = post.chat?.id;
    const chatType = post.chat?.type;
    const isChannel = !!update.channel_post || !!update.edited_channel_post;
    functions.logger.info('Processing post', { updateId: update.update_id, channelId, channelTitle: post.chat?.title, chatType, isChannel });

    if (channelFilter && channelFilter.length > 0) {
      const allowed = channelFilter.some((id) => String(id) === String(channelId));
      if (!allowed) {
        functions.logger.info('Channel filtered out (not in TELEGRAM_CHANNEL_IDS)', { channelId, allowedIds: channelFilter });
        pushDetail('skipped_channel_filter');
        continue;
      }
    }

    const payload = parseChannelPost(post, botToken);
    if (!(payload.summary && payload.summary.trim())) {
      functions.logger.info('Skipping post: no text or caption', { channelId, messageId: post.message_id });
      pushDetail('skipped_no_text');
      continue;
    }

    const rawDuplicate = await isDuplicate(db, channelId, post.message_id);
    if (rawDuplicate) {
      functions.logger.info('Skipping post: duplicate already in Firestore', { channelId, messageId: post.message_id });
      pushDetail('skipped_duplicate_db');
      continue;
    }

    let aiResult = { processed: false };
    try {
      aiResult = await processPost(db, payload);
    } catch (err) {
      functions.logger.error('AI pipeline error for post', { err: err.message });
      functions.logger.warn('AI pipeline error for post, falling back to News', { err: err.message });
    }

    if (aiResult.written) {
      if (aiResult.written.collection === 'ZoneDanger') writtenZoneDanger++;
      else if (aiResult.written.collection === 'Viktim') writtenViktim++;
      functions.logger.info('AI wrote to Firestore', { collection: aiResult.written.collection });
      pushDetail('saved_ai', { collection: aiResult.written.collection });
    } else if (aiResult.skipped === 'not_relevant') {
      skippedRelevant++;
      functions.logger.info('AI skipped: not relevant');
      pushDetail('ai_not_relevant');
    } else if (aiResult.skipped === 'duplicate') {
      skippedDuplicate++;
      functions.logger.info('AI skipped: duplicate');
      pushDetail('ai_duplicate');
    }

    if (!aiResult.written && !aiResult.skipped) {
      await db.collection(COLLECTION_NEWS).add(payload);
      writtenNews++;
      functions.logger.info('Fell back to News', { title: payload.title?.slice(0, 50) });
      pushDetail('saved_news_fallback');
    }
  }

  if (processed > 0) {
    await saveLastUpdateId(db, lastUpdateId + 1);
  }

  return {
    processed,
    writtenNews,
    writtenZoneDanger,
    writtenViktim,
    skippedRelevant,
    skippedDuplicate,
    updatesReceivedByType,
    /** Human-readable labels for UI */
    chatSourceLabels: {
      channel: 'Canal (channel_post)',
      group: 'Groupe',
      supergroup: 'Supergroupe',
      private: 'Message privé au bot',
      none: 'Sans message exploitable',
    },
    updateDetails,
  };
}

const TELEGRAM_MONITOR_RUNTIME = {
  timeoutSeconds: 120,
  memory: '256MB',
};

/** HTTP-only: one warm instance avoids "no available instance" on manual/dashboard calls (Blaze cost). */
const TELEGRAM_MONITOR_HTTP_RUNTIME = {
  ...TELEGRAM_MONITOR_RUNTIME,
  minInstances: 1,
};

/**
 * Scheduled Cloud Function - runs every 15 minutes
 */
const telegramMonitorScheduled = functions
  .runWith(TELEGRAM_MONITOR_RUNTIME)
  .pubsub.schedule('every 15 minutes')
  .timeZone('America/Port-au-Prince')
  .onRun(async (context) => {
    const db = admin.firestore();
    const botToken = process.env.TELEGRAM_BOT_TOKEN || functions.config().telegram?.bot_token;

    if (!botToken) {
      functions.logger.warn('TELEGRAM_BOT_TOKEN not configured. Skipping monitor run.');
      return null;
    }

    const channelIdsRaw = process.env.TELEGRAM_CHANNEL_IDS || functions.config().telegram?.channel_ids;
    const channelFilter = channelIdsRaw
      ? channelIdsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : null;

    try {
      const result = await runMonitor(db, botToken, channelFilter);
      functions.logger.info('Telegram monitor completed', result);
      return result;
    } catch (err) {
      functions.logger.error('Telegram monitor failed', err);
      throw err;
    }
  });

/**
 * HTTP endpoint to manually trigger the monitor (dashboard / curl).
 * Call: POST your-project.cloudfunctions.net/telegramMonitorRun
 * Headers: x-veye-secret (required if PROCESS_ALERT_SECRET is set on the function)
 */
function setTelegramMonitorCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-veye-secret');
}

exports.telegramMonitorRun = functions
  .runWith(TELEGRAM_MONITOR_HTTP_RUNTIME)
  .https.onRequest(async (req, res) => {
    setTelegramMonitorCors(res);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    const expectedSecret = process.env.PROCESS_ALERT_SECRET;
    if (expectedSecret) {
      const secret = req.headers['x-veye-secret'] ?? req.body?.secret;
      if (!secret || secret !== expectedSecret) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
    }

    const db = admin.firestore();
    const botToken = process.env.TELEGRAM_BOT_TOKEN || functions.config().telegram?.bot_token;

    if (!botToken) {
      res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
      return;
    }

    const channelIdsRaw = process.env.TELEGRAM_CHANNEL_IDS || functions.config().telegram?.channel_ids;
    const channelFilter = channelIdsRaw
      ? channelIdsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : null;

    try {
      const result = await runMonitor(db, botToken, channelFilter);
      res.json({ success: true, ...result });
    } catch (err) {
      functions.logger.error('Telegram monitor failed', err);
      res.status(500).json({ error: err.message });
    }
  });

exports.telegramMonitor = telegramMonitorScheduled;
