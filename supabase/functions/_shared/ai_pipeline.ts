/**
 * VEYe AI pipeline — Deno port of veyeFirebaseApi/functions/aiPipeline.js (Firestore → Supabase Postgres).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { GoogleGenAI } from "npm:@google/genai@1.44.0";
import { sendOneSignalNotification } from "./onesignal.ts";

const DEDUPE_THRESHOLD = 0.85;
const DEDUPE_LOOKBACK_HOURS = 72;
const SPAM_STRIKE_LIMIT = 3;
const SPAM_WINDOW_HOURS = 24;
const BLOCK_COOLDOWN_HOURS = 72;

function getConfig() {
  return {
    geocodingKey: Deno.env.get("GOOGLE_GEOCODING_API_KEY") ?? "",
    googleGeminiApiKey: Deno.env.get("GOOGLE_GEMINI_API_KEY") ?? "",
  };
}

function getGeminiClient(): GoogleGenAI | null {
  const { googleGeminiApiKey } = getConfig();
  if (!googleGeminiApiKey) return null;
  return new GoogleGenAI({ apiKey: googleGeminiApiKey });
}

function parseJsonResponse(text: string): Record<string, unknown> {
  if (!text || typeof text !== "string") return {};
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*$/g, "").trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function filterRelevance(text: string): Promise<{ relevant: boolean; confidence: number }> {
  const { googleGeminiApiKey } = getConfig();
  const prompt = `You are a filter for a Haiti safety alert app. The text below is from a social media post (possibly in Kreyòl, French, or English).

Is this text about a REAL-TIME safety or security incident in Haiti? Examples: shootings, kidnappings, robberies, road blocks, gang activity, disappearances, violence, danger zones.

Reply with ONLY valid JSON: {"relevant": true/false, "confidence": 0.0-1.0}
- relevant: true only if it describes a current/recent safety incident in Haiti
- confidence: how sure you are (0-1)
- Reject: news summaries, opinions, old events, non-Haiti, non-safety topics

Text:
---
${(text || "").slice(0, 2000)}
---`;

  if (!googleGeminiApiKey) {
    return { relevant: true, confidence: 0.5 };
  }
  try {
    const genAI = getGeminiClient()!;
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const content =
      (typeof response.text === "function" ? response.text() : response.text) || "{}";
    const result = parseJsonResponse(content) as { relevant?: boolean; confidence?: number };
    return {
      relevant: !!result.relevant,
      confidence: typeof result.confidence === "number" ? result.confidence : 0.5,
    };
  } catch (e) {
    console.error("filterRelevance", e);
    return { relevant: true, confidence: 0.5 };
  }
}

async function extractData(
  text: string,
  sourceMetadata: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const { googleGeminiApiKey } = getConfig();
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

Text:
---
${(text || "").slice(0, 3000)}
---`;

  if (!googleGeminiApiKey) {
    return {
      docType: "news",
      incidentType: "other",
      locationText: null,
      victimName: null,
      severity: "low",
      summary: text?.slice(0, 500) || "",
      name: "Haiti",
      ...sourceMetadata,
    };
  }
  try {
    const genAI = getGeminiClient()!;
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const content =
      (typeof response.text === "function" ? response.text() : response.text) ||
      (response as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
        .candidates?.[0]?.content?.parts?.[0]?.text ||
      "{}";
    return { ...parseJsonResponse(content as string), ...sourceMetadata };
  } catch (e) {
    console.error("extractData", e);
    return {
      docType: "news",
      incidentType: "other",
      locationText: null,
      victimName: null,
      severity: "low",
      summary: text?.slice(0, 500) || "",
      name: "Haiti",
      ...sourceMetadata,
    };
  }
}

async function geocodeLocation(
  address: string,
): Promise<{ latitude: number; longitude: number; city: string | null } | null> {
  if (!address || address.trim().length < 2) return null;
  const { geocodingKey } = getConfig();
  if (!geocodingKey) return null;
  const addressWithHaiti = address.trim().toLowerCase().includes("haiti")
    ? address.trim()
    : `${address.trim()}, Haiti`;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", addressWithHaiti);
  url.searchParams.set("key", geocodingKey);
  url.searchParams.set("region", "ht");
  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    const result = data?.results?.[0];
    const loc = result?.geometry?.location;
    if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") return null;
    const components = result?.address_components || [];
    const cityComponent = components.find((c: { types?: string[] }) =>
      c.types?.includes("locality") || c.types?.includes("administrative_area_level_2")
    );
    const city = cityComponent?.long_name ?? null;
    return { latitude: loc.lat, longitude: loc.lng, city };
  } catch (e) {
    console.error("geocodeLocation", e);
    return null;
  }
}

async function getEmbedding(text: string): Promise<number[] | null> {
  if (!getConfig().googleGeminiApiKey) return null;
  try {
    const genAI = getGeminiClient()!;
    const response = await genAI.models.embedContent({
      model: "gemini-embedding-001",
      contents: [(text || "").slice(0, 8000)],
    });
    const embedding =
      (response as { embeddings?: { values?: number[]; embedding?: number[] }[] })
        .embeddings?.[0]?.values ??
      (response as { embeddings?: { values?: number[]; embedding?: number[] }[] })
        .embeddings?.[0]?.embedding ??
      null;
    return embedding ?? null;
  } catch (e) {
    console.warn("getEmbedding", e);
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function parseEmbedding(raw: unknown): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.every((x) => typeof x === "number") ? raw as number[] : null;
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      return Array.isArray(j) ? j as number[] : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function isDuplicateEmbedding(
  supabase: SupabaseClient,
  embedding: number[] | null,
  _text: string,
): Promise<boolean> {
  if (!embedding?.length) return false;
  const cutoff = new Date(Date.now() - DEDUPE_LOOKBACK_HOURS * 3600 * 1000).toISOString();

  const { data: zones } = await supabase
    .from("zone_danger")
    .select("id, rezon, name")
    .gte("date", cutoff)
    .order("date", { ascending: false })
    .limit(50);

  const { data: kidnaps } = await supabase
    .from("kidnaping_alert")
    .select("id, rezon, name")
    .gte("date", cutoff)
    .order("date", { ascending: false })
    .limit(50);

  const candidates = [...(zones ?? []), ...(kidnaps ?? [])];

  for (const doc of candidates) {
    const id = doc.id as string;
    const { data: cached } = await supabase
      .from("ai_pipeline_embeddings")
      .select("embedding")
      .eq("source_doc_id", id)
      .maybeSingle();

    let docEmbedding = parseEmbedding(cached?.embedding);
    if (!docEmbedding) {
      const docText = [doc.rezon, doc.name].filter(Boolean).join(" ");
      docEmbedding = await getEmbedding(docText);
      if (docEmbedding) {
        await supabase.from("ai_pipeline_embeddings").upsert({
          source_doc_id: id,
          embedding: docEmbedding,
          updated_at: new Date().toISOString(),
        });
      }
    }
    if (docEmbedding && cosineSimilarity(embedding, docEmbedding) >= DEDUPE_THRESHOLD) {
      return true;
    }
  }
  return false;
}

async function writeToDb(
  supabase: SupabaseClient,
  extracted: Record<string, unknown>,
  sourceMetadata: Record<string, unknown>,
): Promise<{ collection: string; id: string; zoneId?: string }> {
  const docType = extracted.docType as string | undefined;
  const incidentType = extracted.incidentType as string | undefined;
  const locationText = extracted.locationText as string | undefined;
  const summary = extracted.summary as string | undefined;
  const name = extracted.name as string | undefined;
  const latitude = extracted.latitude as number | null | undefined;
  const longitude = extracted.longitude as number | null | undefined;
  const city = extracted.city as string | null | undefined;
  const confidence = (extracted.confidence as number) ?? 0.8;

  const now = new Date().toISOString();
  const rezonBase = summary || (sourceMetadata.summary as string) || "";
  const tgCh = sourceMetadata.telegramChannelId as number | bigint | null | undefined;
  const tgMsg = sourceMetadata.telegramMessageId as number | bigint | null | undefined;

  const zoneRow = {
    source: (sourceMetadata.source as string) || "telegram",
    source_url: (sourceMetadata.sourceUrl as string) || null,
    verified: false,
    ai_confidence: confidence,
    date: now,
    name: name || locationText || "Zone danger",
    address: locationText || "Haiti",
    city: city ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    rezon: `[${incidentType || "other"}] ${rezonBase}`,
    incident_type: incidentType || "other",
    telegram_channel_id: tgCh != null ? Number(tgCh) : null,
    telegram_message_id: tgMsg != null ? Number(tgMsg) : null,
  };

  const { data: zoneIns, error: zErr } = await supabase
    .from("zone_danger")
    .insert(zoneRow)
    .select("id")
    .single();
  if (zErr || !zoneIns) throw new Error(zErr?.message || "zone_danger insert failed");
  const zoneId = zoneIns.id as string;

  const notificationMessage = `Nan ${zoneRow.address || "Haiti"} ${zoneRow.rezon}`;
  sendOneSignalNotification(supabase, notificationMessage, {
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  }).catch((err) => console.warn("notify", err));

  if (docType === "viktim" || incidentType === "kidnapping") {
    const kidRow = {
      source: zoneRow.source,
      source_url: zoneRow.source_url,
      verified: zoneRow.verified,
      ai_confidence: zoneRow.ai_confidence,
      date: now,
      name: name || locationText || "Zone danger",
      address: locationText || "Haiti",
      city: city ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      rezon: `[${incidentType || "other"}] ${rezonBase}`,
      telegram_channel_id: zoneRow.telegram_channel_id,
      telegram_message_id: zoneRow.telegram_message_id,
    };
    const { data: kidIns, error: kErr } = await supabase
      .from("kidnaping_alert")
      .insert(kidRow)
      .select("id")
      .single();
    if (kErr || !kidIns) throw new Error(kErr?.message || "kidnaping_alert insert failed");
    return { collection: "KidnapingAlert", id: kidIns.id as string, zoneId };
  }

  return { collection: "ZoneDanger", id: zoneId };
}

export async function isUserBlocked(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ blocked: boolean; unblockedAt: number | null }> {
  const { data: row } = await supabase
    .from("user_moderations")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!row || !row.blocked) return { blocked: false, unblockedAt: null };

  const blockedAt = row.blocked_at ? new Date(row.blocked_at as string).getTime() : null;
  if (blockedAt) {
    const cooldownMs = BLOCK_COOLDOWN_HOURS * 60 * 60 * 1000;
    if (Date.now() - blockedAt >= cooldownMs) {
      await supabase.from("user_moderations").update({
        blocked: false,
        strikes: [],
        strike_count: 0,
        unblocked_at: new Date().toISOString(),
        unblock_reason: "cooldown_expired",
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
      return { blocked: false, unblockedAt: null };
    }
    return { blocked: true, unblockedAt: blockedAt + cooldownMs };
  }
  return { blocked: true, unblockedAt: null };
}

export async function unblockUser(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase.from("user_moderations").upsert({
    user_id: userId,
    blocked: false,
    strikes: [],
    strike_count: 0,
    unblocked_at: new Date().toISOString(),
    unblock_reason: "manual_admin",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

async function recordSpamStrike(
  supabase: SupabaseClient,
  userId: string,
  reason: string,
): Promise<void> {
  const { data: doc } = await supabase
    .from("user_moderations")
    .select("strikes")
    .eq("user_id", userId)
    .maybeSingle();

  const now = Date.now();
  const windowMs = SPAM_WINDOW_HOURS * 60 * 60 * 1000;
  let strikes: number[] = Array.isArray(doc?.strikes)
    ? (doc!.strikes as unknown[]).filter((x): x is number => typeof x === "number")
    : [];
  strikes = strikes.filter((ts) => now - ts < windowMs);
  strikes.push(now);
  const shouldBlock = strikes.length >= SPAM_STRIKE_LIMIT;

  const row: Record<string, unknown> = {
    user_id: userId,
    strikes,
    strike_count: strikes.length,
    blocked: shouldBlock,
    last_strike_reason: reason,
    last_strike_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (shouldBlock) row.blocked_at = new Date().toISOString();

  await supabase.from("user_moderations").upsert(row, { onConflict: "user_id" });
}

export async function processPost(
  supabase: SupabaseClient,
  postPayload: Record<string, unknown>,
  isSentByUser = false,
): Promise<Record<string, unknown>> {
  const aiEnabled = !!getConfig().googleGeminiApiKey;
  const text = String(postPayload.summary || postPayload.title || "");
  const userId = (postPayload.userId as string) || null;

  if (!aiEnabled) {
    return { processed: false, skipped: "no_ai_config" };
  }

  if (isSentByUser && userId) {
    const blockInfo = await isUserBlocked(supabase, userId);
    if (blockInfo.blocked) {
      return { processed: false, skipped: "user_blocked", unblockedAt: blockInfo.unblockedAt };
    }
  }

  const step1 = await filterRelevance(text);
  if (!step1.relevant || (step1.confidence || 0) < 0.6) {
    if (isSentByUser && userId) {
      await recordSpamStrike(supabase, userId, "not_relevant");
    }
    return { processed: true, skipped: "not_relevant", confidence: step1.confidence };
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

  const pos = postPayload.position as { latitude?: number; longitude?: number } | undefined;
  if (isSentByUser && pos?.latitude != null) {
    step2.latitude = pos.latitude;
    step2.longitude = pos.longitude;
  }

  const locText = step2.locationText as string | undefined;
  if (locText) {
    const latLng = await geocodeLocation(locText);
    if (latLng) {
      if (step2.latitude == null) step2.latitude = latLng.latitude;
      if (step2.longitude == null) step2.longitude = latLng.longitude;
      step2.city = latLng.city;
    }
  }

  const embedding = await getEmbedding(text);
  const duplicate = await isDuplicateEmbedding(supabase, embedding, text);
  if (duplicate) {
    if (isSentByUser && userId) {
      await recordSpamStrike(supabase, userId, "duplicate");
    }
    return { processed: true, skipped: "duplicate" };
  }

  const written = await writeToDb(supabase, step2, sourceMetadata);
  return { processed: true, written };
}
