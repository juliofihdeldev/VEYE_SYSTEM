/**
 * Telegram getUpdates monitor — Postgres-backed (replaces Firestore in telegramMonitor.js).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { processPost } from "./ai_pipeline.ts";

const TELEGRAM_API = "https://api.telegram.org";

async function getTelegramUpdates(botToken: string, offset = 0): Promise<unknown[]> {
  const url = new URL(`${TELEGRAM_API}/bot${botToken}/getUpdates`);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("timeout", "25");
  const res = await fetch(url.toString());
  const data = await res.json() as { ok: boolean; description?: string; result?: unknown[] };
  if (!data.ok) throw new Error(`Telegram API error: ${data.description || "Unknown"}`);
  return data.result || [];
}

async function getLastUpdateId(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from("telegram_monitor_state")
    .select("last_update_id")
    .eq("id", "cursor")
    .maybeSingle();
  return (data?.last_update_id as number) ?? 0;
}

async function saveLastUpdateId(supabase: SupabaseClient, updateId: number): Promise<void> {
  await supabase.from("telegram_monitor_state").upsert({
    id: "cursor",
    last_update_id: updateId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
}

function getPostFromUpdate(update: Record<string, unknown>): Record<string, unknown> | null {
  const post =
    update.channel_post || update.edited_channel_post || update.message ||
    update.edited_message;
  return (post as Record<string, unknown>) ?? null;
}

function classifyChatSource(update: Record<string, unknown>): string {
  if (update.channel_post || update.edited_channel_post) return "channel";
  const post = getPostFromUpdate(update);
  if (!post || !post.chat) return "none";
  const t = (post.chat as Record<string, unknown>).type as string;
  if (t === "private") return "private";
  if (t === "group") return "group";
  if (t === "supergroup") return "supergroup";
  if (t === "channel") return "channel";
  return "none";
}

function emptySourceCounts(): Record<string, number> {
  return { channel: 0, group: 0, supergroup: 0, private: 0, none: 0 };
}

function parseChannelPost(post: Record<string, unknown>): Record<string, unknown> {
  const text = (post.text || post.caption || "") as string;
  const chat = post.chat as Record<string, unknown>;
  const channelId = chat.id as number;
  const channelTitle = (chat.title as string) || `Channel ${channelId}`;
  const messageId = post.message_id as number;
  const dateSec = post.date as number | undefined;
  const date = dateSec ? new Date(dateSec * 1000) : new Date();
  const safeChannelId = String(channelId).replace(/^-100/, "");
  const sourceUrl = chat.username
    ? `https://t.me/${chat.username}/${messageId}`
    : `https://t.me/c/${safeChannelId}/${messageId}`;
  const imageSource = Array.isArray(post.photo) && post.photo.length > 0
    ? "photo_present"
    : null;
  return {
    source: "telegram",
    sourceUrl,
    channelName: channelTitle,
    channelId: String(channelId),
    title: text.slice(0, 200) || channelTitle,
    summary: text,
    imageSource,
    date: date.toISOString(),
    telegramMessageId: messageId,
    telegramChannelId: channelId,
  };
}

async function isTelegramRawDuplicate(
  supabase: SupabaseClient,
  channelId: number,
  messageId: number,
): Promise<boolean> {
  const tables = ["news", "zone_danger", "viktim", "kidnaping_alert"] as const;
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select("*", {
      count: "exact",
      head: true,
    }).eq("telegram_channel_id", channelId).eq("telegram_message_id", messageId);
    if (error) {
      console.warn("isTelegramRawDuplicate", t, error.message);
      continue;
    }
    if ((count ?? 0) > 0) return true;
  }
  return false;
}

async function insertNewsFallback(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<void> {
  await supabase.from("news").insert({
    title: payload.title,
    summary: payload.summary,
    source: payload.source,
    source_url: payload.sourceUrl,
    channel_name: payload.channelName,
    channel_id: payload.channelId,
    image_source: payload.imageSource,
    date: payload.date,
    telegram_channel_id: payload.telegramChannelId as number,
    telegram_message_id: payload.telegramMessageId as number,
  });
}

export async function runTelegramMonitor(
  supabase: SupabaseClient,
  botToken: string,
  channelFilter: string[] | null,
): Promise<Record<string, unknown>> {
  let lastUpdateId = await getLastUpdateId(supabase);
  const updates = await getTelegramUpdates(botToken, lastUpdateId) as Record<string, unknown>[];

  let processed = 0;
  let writtenNews = 0;
  let writtenZoneDanger = 0;
  let writtenViktim = 0;
  let skippedRelevant = 0;
  let skippedDuplicate = 0;
  const updatesReceivedByType = emptySourceCounts();
  const updateDetails: Record<string, unknown>[] = [];

  for (const update of updates) {
    processed++;
    const uid = update.update_id as number;
    if (uid > lastUpdateId) lastUpdateId = uid;

    const chatSource = classifyChatSource(update);
    updatesReceivedByType[chatSource] = (updatesReceivedByType[chatSource] || 0) + 1;

    const post = getPostFromUpdate(update);
    const pushDetail = (outcome: string, extra: Record<string, unknown> = {}) => {
      const p = post;
      const chat = p?.chat as Record<string, unknown> | undefined;
      const title =
        (chat?.title as string) ||
        (chat?.username ? `@${chat.username}` : null) ||
        (chatSource === "private" ? "Discussion privée" : null) ||
        "—";
      updateDetails.push({
        updateId: uid,
        chatSource,
        chatTitle: title,
        chatId: chat?.id ?? null,
        textPreview: String((p?.text || p?.caption || "")).slice(0, 160),
        outcome,
        ...extra,
      });
    };

    if (!post) {
      pushDetail("no_payload");
      continue;
    }

    const channelId = (post.chat as Record<string, unknown>)?.id as number;
    const chatType = (post.chat as Record<string, unknown>)?.type;
    const isChannel = !!(update.channel_post || update.edited_channel_post);
    console.log("telegram post", { uid, channelId, chatType, isChannel });

    if (channelFilter?.length) {
      const allowed = channelFilter.some((id) => String(id) === String(channelId));
      if (!allowed) {
        pushDetail("skipped_channel_filter");
        continue;
      }
    }

    const payload = parseChannelPost(post);
    if (!String(payload.summary || "").trim()) {
      pushDetail("skipped_no_text");
      continue;
    }

    if (await isTelegramRawDuplicate(supabase, channelId, post.message_id as number)) {
      pushDetail("skipped_duplicate_db");
      continue;
    }

    let aiResult: Record<string, unknown> = {};
    try {
      aiResult = await processPost(supabase, payload, false);
    } catch (err) {
      console.error("AI pipeline error", err);
    }

    const written = aiResult.written as { collection?: string; id?: string } | undefined;
    if (written?.collection === "ZoneDanger") {
      writtenZoneDanger++;
      pushDetail("saved_ai", { collection: written.collection });
    } else if (written?.collection === "KidnapingAlert") {
      writtenViktim++;
      pushDetail("saved_ai", { collection: written.collection });
    } else if (aiResult.skipped === "not_relevant") {
      skippedRelevant++;
      pushDetail("ai_not_relevant");
    } else if (aiResult.skipped === "duplicate") {
      skippedDuplicate++;
      pushDetail("ai_duplicate");
    }

    if (!written && !aiResult.skipped) {
      await insertNewsFallback(supabase, payload);
      writtenNews++;
      pushDetail("saved_news_fallback");
    }
  }

  if (processed > 0) {
    await saveLastUpdateId(supabase, lastUpdateId + 1);
  }

  return {
    processed,
    writtenNews,
    writtenZoneDanger,
    writtenViktim,
    skippedRelevant,
    skippedDuplicate,
    updatesReceivedByType,
    chatSourceLabels: {
      channel: "Canal (channel_post)",
      group: "Groupe",
      supergroup: "Supergroupe",
      private: "Message privé au bot",
      none: "Sans message exploitable",
    },
    updateDetails,
  };
}
