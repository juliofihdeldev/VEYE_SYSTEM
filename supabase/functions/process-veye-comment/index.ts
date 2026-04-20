import { serviceClient } from "../_shared/supabase.ts";
import { corsPreflightResponse, jsonResponse } from "../_shared/http.ts";

const MAX_COMMENT_BODY = 12_000;

/**
 * App comment writes — service role bypasses RLS.
 *
 * Auth model: invoked by anonymous mobile users; `verify_jwt` at the Supabase
 * Functions gateway enforces a valid session, and we require `userId` in the
 * body (the caller's uid, recorded on each comment row).
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return jsonResponse({ error: "userId required" }, 400);
  }

  const supabase = serviceClient();

  if (action === "append") {
    const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";
    const parentRaw = typeof body.parentId === "string" ? body.parentId.trim() : "";
    const sortTime =
      typeof body.sortTime === "number" && Number.isFinite(body.sortTime)
        ? Math.floor(body.sortTime as number)
        : Date.now();
    if (!threadId || !text) {
      return jsonResponse({ error: "threadId and body required" }, 400);
    }
    if (text.length > MAX_COMMENT_BODY) {
      return jsonResponse({ error: "body too long" }, 400);
    }

    const row: Record<string, unknown> = {
      thread_id: threadId,
      body: text,
      user_id: userId,
      sort_time: sortTime,
      parent_id: parentRaw || null,
      liked_user_ids: [],
    };

    const { data, error } = await supabase.from("veye_comments").insert(row).select("id").single();
    if (error) throw error;
    return jsonResponse({ ok: true, id: data.id as string }, 200);
  }

  if (action === "toggleLike") {
    const commentId = typeof body.commentId === "string" ? body.commentId.trim() : "";
    if (!commentId) {
      return jsonResponse({ error: "commentId required" }, 400);
    }

    const { data: row, error: selErr } = await supabase
      .from("veye_comments")
      .select("id, liked_user_ids")
      .eq("id", commentId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!row) {
      return jsonResponse({ error: "not_found" }, 404);
    }

    const liked = Array.isArray(row.liked_user_ids)
      ? (row.liked_user_ids as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    const has = liked.includes(userId);
    const next = has ? liked.filter((x) => x !== userId) : [...liked, userId];

    const { error: upErr } = await supabase
      .from("veye_comments")
      .update({ liked_user_ids: next })
      .eq("id", commentId);
    if (upErr) throw upErr;
    return jsonResponse({ ok: true, likedUserIds: next }, 200);
  }

  return jsonResponse({ error: "unknown action" }, 400);
});
