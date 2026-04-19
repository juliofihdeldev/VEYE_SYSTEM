import { getSupabase } from "../lib/supabase";

/** Call a deployed Edge function from the browser (preferred over raw axios to avoid CORS/header issues). */
async function invokeEdge<T = unknown>(functionName: string, body: Record<string, unknown> = {}): Promise<T> {
	const sb = getSupabase();
	const secret = import.meta.env.VITE_PROCESS_ALERT_SECRET as string | undefined;
	const headers: Record<string, string> = {};
	if (secret) headers["x-veye-secret"] = secret;

	const { data, error } = await sb.functions.invoke(functionName, {
		body,
		...(Object.keys(headers).length > 0 ? { headers } : {}),
	});

	if (error) {
		throw new Error(error.message || "Edge function request failed");
	}
	return data as T;
}

function tsToFirestoreShape(iso: string | null | undefined): { seconds: number; nanoseconds: number } {
	if (!iso) return { seconds: 0, nanoseconds: 0 };
	const ms = new Date(iso).getTime();
	if (Number.isNaN(ms)) return { seconds: 0, nanoseconds: 0 };
	return { seconds: Math.floor(ms / 1000), nanoseconds: 0 };
}

function mapZoneRow(r: Record<string, unknown>) {
	return {
		...r,
		id: r.id,
		date: tsToFirestoreShape(r.date as string),
	};
}

function mapViktimRow(r: Record<string, unknown>) {
	return {
		...r,
		id: r.id,
		fullName: r.full_name,
		zone: r.city,
		details: r.details,
		imageSource: r.image_source,
		date: r.date ? tsToFirestoreShape(r.date as string) : { seconds: 0, nanoseconds: 0 },
	};
}

function mapNewsRow(r: Record<string, unknown>) {
	return {
		...r,
		id: r.id,
		url: r.source_url,
		imageSource: r.image_source,
		date: tsToFirestoreShape(r.date as string),
	};
}

function mapKidnapRow(r: Record<string, unknown>) {
	const name = r.name != null ? String(r.name) : "";
	const address = r.address != null ? String(r.address) : "";
	const rezon = r.rezon != null ? String(r.rezon) : "";
	return {
		...r,
		id: r.id,
		zone: name || address || "",
		enfomasyon: rezon,
		address,
		date: r.date ? tsToFirestoreShape(r.date as string) : { seconds: 0, nanoseconds: 0 },
	};
}

async function edgeMutate(body: Record<string, unknown>) {
	await invokeEdge("dashboard-mutate", body);
}

// --- Zone danger (read: PostgREST; write: Edge) ---
export const handleGetALert = async () => {
	try {
		const { data, error } = await getSupabase().from("zone_danger").select("*").order("date", { ascending: false });
		if (error) throw error;
		return (data ?? []).map((r) => mapZoneRow(r as Record<string, unknown>));
	} catch (error) {
		console.error(error);
		return [];
	}
};

export type ZoneDangerSearchParams = {
	query?: string;
	dateFrom?: string | null;
	dateTo?: string | null;
	limit?: number;
	offset?: number;
};

export type ZoneDangerSearchResult = {
	rows: ReturnType<typeof mapZoneRow>[];
	total: number;
};

/**
 * Search zone_danger using Postgres Full-Text Search (tsvector + GIN index).
 *
 * - Uses Supabase `textSearch` with `type: 'websearch'`, so the user's text is
 *   parsed like a Google query (supports quoted phrases, OR, -term).
 * - Falls back to a plain ordered list when no query is provided.
 * - Date filtering is applied on the server with btree-indexed `date` column.
 */
export const searchDangerZones = async ({
	query,
	dateFrom,
	dateTo,
	limit = 10,
	offset = 0,
}: ZoneDangerSearchParams): Promise<ZoneDangerSearchResult> => {
	try {
		let q = getSupabase()
			.from("zone_danger")
			.select("*", { count: "exact" })
			.order("date", { ascending: false });

		const trimmed = (query ?? "").trim();
		if (trimmed) {
			q = q.textSearch("search_tsv", trimmed, {
				type: "websearch",
				config: "simple",
			});
		}

		if (dateFrom) {
			const fromIso = new Date(`${dateFrom}T00:00:00.000Z`).toISOString();
			q = q.gte("date", fromIso);
		}
		if (dateTo) {
			const toIso = new Date(`${dateTo}T23:59:59.999Z`).toISOString();
			q = q.lte("date", toIso);
		}

		q = q.range(offset, offset + limit - 1);

		const { data, error, count } = await q;
		if (error) throw error;

		return {
			rows: (data ?? []).map((r) => mapZoneRow(r as Record<string, unknown>)),
			total: count ?? 0,
		};
	} catch (error) {
		console.error("searchDangerZones failed", error);
		return { rows: [], total: 0 };
	}
};

const TELEGRAM_MONITOR_RUN_URL = import.meta.env.VITE_TELEGRAM_MONITOR_RUN_URL as string | undefined;

/** Manually trigger Telegram channel monitor (Edge, or legacy URL if `VITE_TELEGRAM_MONITOR_RUN_URL` is set). */
export const runTelegramMonitor = async () => {
	if (TELEGRAM_MONITOR_RUN_URL) {
		const secret = import.meta.env.VITE_PROCESS_ALERT_SECRET as string | undefined;
		const controller = new AbortController();
		const timer = window.setTimeout(() => controller.abort(), 130_000);
		try {
			const res = await fetch(TELEGRAM_MONITOR_RUN_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(secret ? { "x-veye-secret": secret } : {}),
				},
				body: "{}",
				signal: controller.signal,
			});
			const text = await res.text();
			if (!res.ok) throw new Error(text || res.statusText);
			try {
				return JSON.parse(text);
			} catch {
				return text;
			}
		} finally {
			window.clearTimeout(timer);
		}
	}
	return invokeEdge("telegram-monitor", {});
};

export const handleSendAlert = async (data: any) => {
	if (!data) return;

	const { confirm: _confirm, ...raw } = data;

	const lat = raw.latitude !== undefined && raw.latitude !== "" && raw.latitude != null ? Number(raw.latitude) : NaN;
	const lng = raw.longitude !== undefined && raw.longitude !== "" && raw.longitude != null ? Number(raw.longitude) : NaN;
	const hasPosition = Number.isFinite(lat) && Number.isFinite(lng);

	const address = String(raw.address ?? "").trim();
	const rezon = String(raw.rezon ?? "").trim();
	const name = String(raw.name ?? "").trim();
	const summaryParts = [address, rezon].filter(Boolean);
	const summary = summaryParts.join("\n\n") || rezon || name;

	const payload: Record<string, unknown> = {
		...raw,
		title: name,
		summary,
		source: "dashboard",
		sourceUrl: null,
		userId: "dashboard-admin",
		position: hasPosition ? { latitude: lat, longitude: lng } : null,
	};

	if (raw.date instanceof Date) {
		payload.date = raw.date.toISOString();
	} else if (raw.date && typeof raw.date === "object" && "seconds" in raw.date) {
		payload.date = new Date((raw.date as { seconds: number }).seconds * 1000).toISOString();
	}

	if (hasPosition) {
		payload.latitude = lat;
		payload.longitude = lng;
	} else {
		delete payload.latitude;
		delete payload.longitude;
	}

	const body = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

	try {
		return await invokeEdge("process-global-alert", body);
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error("handleSendAlert: process-global-alert failed", msg);
		throw error;
	}
};

export const handleUpdatedAlert = async (id: string, fields: Record<string, any>) => {
	if (!id) return;
	const patch: Record<string, unknown> = { ...fields };
	if (patch.date != null) {
		if (typeof patch.date === "object" && patch.date !== null && "seconds" in patch.date) {
			patch.date = new Date((patch.date as { seconds: number }).seconds * 1000).toISOString();
		} else if (patch.date instanceof Date) {
			patch.date = patch.date.toISOString();
		}
	}
	await edgeMutate({ action: "update", table: "zone_danger", id, patch });
};

export const handleDeletedAlert = async (data: any) => {
	if (!data?.id) return;
	try {
		await edgeMutate({ action: "delete", table: "zone_danger", id: data.id });
	} catch (error) {
		console.error(error);
	}
};

// --- Viktim ---
export const handleGetViktim = async (type: string) => {
	try {
		let q = getSupabase().from("viktim").select("*").order("date", { ascending: false });
		if (type && type !== "All") {
			q = q.eq("type", type);
		}
		const { data, error } = await q;
		if (error) throw error;
		return (data ?? []).map((r) => mapViktimRow(r as Record<string, unknown>));
	} catch (error) {
		console.error(error);
		return [];
	}
};

export type ViktimSearchParams = {
	query?: string;
	type?: string;
	status?: string;
	dateFrom?: string | null;
	dateTo?: string | null;
	limit?: number;
	offset?: number;
};

export type ViktimSearchResult = {
	rows: ReturnType<typeof mapViktimRow>[];
	total: number;
};

/**
 * Search viktim using Postgres Full-Text Search (tsvector + GIN index).
 *
 * Mirrors `searchDangerZones`: server-side `websearch` query, exact count,
 * date range and pagination all pushed to Postgres so the dashboard list
 * stays snappy as the table grows.
 */
export const searchViktim = async ({
	query,
	type,
	status,
	dateFrom,
	dateTo,
	limit = 10,
	offset = 0,
}: ViktimSearchParams): Promise<ViktimSearchResult> => {
	try {
		let q = getSupabase()
			.from("viktim")
			.select("*", { count: "exact" })
			.order("date", { ascending: false });

		const trimmed = (query ?? "").trim();
		if (trimmed) {
			q = q.textSearch("search_tsv", trimmed, {
				type: "websearch",
				config: "simple",
			});
		}

		if (type && type !== "All") {
			q = q.eq("type", type);
		}
		if (status) {
			q = q.eq("status", status);
		}
		if (dateFrom) {
			const fromIso = new Date(`${dateFrom}T00:00:00.000Z`).toISOString();
			q = q.gte("date", fromIso);
		}
		if (dateTo) {
			const toIso = new Date(`${dateTo}T23:59:59.999Z`).toISOString();
			q = q.lte("date", toIso);
		}

		q = q.range(offset, offset + limit - 1);

		const { data, error, count } = await q;
		if (error) throw error;

		return {
			rows: (data ?? []).map((r) => mapViktimRow(r as Record<string, unknown>)),
			total: count ?? 0,
		};
	} catch (error) {
		console.error("searchViktim failed", error);
		return { rows: [], total: 0 };
	}
};

export const handleSendViktim = async (data: any) => {
	if (!data) return;
	const row = typeof data === "string" ? JSON.parse(data) : { ...data };
	try {
		const out = await invokeEdge<{ id?: string }>("dashboard-mutate", {
			action: "insert",
			table: "viktim",
			row,
		});
		return out?.id;
	} catch (error) {
		console.error(error);
	}
};

export const handleDeletedViktim = async (data: any) => {
	if (!data?.id) return;
	try {
		await edgeMutate({ action: "delete", table: "viktim", id: data.id });
	} catch (error) {
		console.error(error);
	}
};

export const handleUpdatedViktim = async (id: string, fields: Record<string, any>) => {
	if (!id) return;
	const patch: Record<string, unknown> = { ...fields };
	if (patch.date != null) {
		if (typeof patch.date === "object" && patch.date !== null && "seconds" in patch.date) {
			patch.date = new Date((patch.date as { seconds: number }).seconds * 1000).toISOString();
		} else if (patch.date instanceof Date) {
			patch.date = patch.date.toISOString();
		}
	}
	await edgeMutate({ action: "update", table: "viktim", id, patch });
};

// --- News ---
export const handleGetNews = async () => {
	try {
		const { data, error } = await getSupabase().from("news").select("*").order("date", { ascending: false });
		if (error) throw error;
		return (data ?? []).map((r) => mapNewsRow(r as Record<string, unknown>));
	} catch (error) {
		console.error(error);
		return [];
	}
};

export const handleSendNews = async (data: any) => {
	if (!data) return;
	const row = typeof data === "string" ? JSON.parse(data) : { ...data };
	try {
		const out = await invokeEdge<{ id?: string }>("dashboard-mutate", {
			action: "insert",
			table: "news",
			row,
		});
		return out?.id;
	} catch (error) {
		console.error(error);
	}
};

export const handleUpdatedNews = async (data: any) => {
	if (!data) return;
	const id = data.id ?? data._id;
	if (!id) return;
	const { id: _i, _id: __i, ...patch } = data;
	await edgeMutate({ action: "update", table: "news", id, patch });
};

export const handleDeletedNews = async (data: any) => {
	if (!data?.id) return;
	try {
		await edgeMutate({ action: "delete", table: "news", id: data.id });
	} catch (error) {
		console.error(error);
	}
};

// --- Kidnapping ---
export const handleGetKidnapping = async () => {
	try {
		const { data, error } = await getSupabase().from("kidnaping_alert").select("*").order("date", { ascending: false });
		if (error) throw error;
		return (data ?? []).map((r) => mapKidnapRow(r as Record<string, unknown>));
	} catch (error) {
		console.error(error);
		return [];
	}
};

export type IncidentStatsFilters = {
	dateFrom?: number;
	dateTo?: number;
	months?: number;
};

export const handleGetIncidentStats = async (filters?: IncidentStatsFilters) => {
	try {
		const sb = getSupabase();
		const [zRes, vRes, kRes, nRes] = await Promise.all([sb.from("zone_danger").select("date"), sb.from("viktim").select("date,type"), sb.from("kidnaping_alert").select("date"), sb.from("news").select("date")]);
		if (zRes.error) throw zRes.error;
		if (vRes.error) throw vRes.error;
		if (kRes.error) throw kRes.error;
		if (nRes.error) throw nRes.error;

		const getSec = (data: any): number | null => {
			const d = data?.date;
			if (!d) return null;
			if (typeof d === "string") return Math.floor(new Date(d).getTime() / 1000);
			if (typeof d?.seconds === "number") return d.seconds;
			if (typeof d === "number") return d >= 1e12 ? Math.floor(d / 1000) : d;
			return null;
		};

		const inRange = (sec: number | null): boolean => {
			if (!sec) return false;
			if (filters?.dateFrom != null && sec < filters.dateFrom) return false;
			if (filters?.dateTo != null && sec > filters.dateTo) return false;
			return true;
		};

		const viktims = (vRes.data ?? []).filter((row: any) => inRange(getSec(row)));
		const zoneDangerFiltered = (zRes.data ?? []).filter((row: any) => inRange(getSec(row)));
		const kidnapFiltered = (kRes.data ?? []).filter((row: any) => inRange(getSec(row)));
		const newsFiltered = (nRes.data ?? []).filter((row: any) => inRange(getSec(row)));

		const zoneDanger = zoneDangerFiltered.length;
		const kidnapping = kidnapFiltered.length;
		const news = newsFiltered.length;

		const viktimByType: Record<string, number> = {};
		viktims.forEach((row: any) => {
			const type = (row.type as string) || "other";
			viktimByType[type] = (viktimByType[type] || 0) + 1;
		});

		const monthCount = filters?.months ?? 6;
		const byMonth: { label: string; key: string; viktim: number; zoneDanger: number; kidnapping: number }[] = [];
		const now = new Date();
		for (let i = monthCount - 1; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			byMonth.push({ label, key, viktim: 0, zoneDanger: 0, kidnapping: 0 });
		}

		const toKey = (sec: number) => {
			const d = new Date(sec * 1000);
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		};

		viktims.forEach((row: any) => {
			const sec = getSec(row);
			if (sec) {
				const m = byMonth.find((x) => x.key === toKey(sec));
				if (m) m.viktim++;
			}
		});
		zoneDangerFiltered.forEach((row: any) => {
			const sec = getSec(row);
			if (sec) {
				const m = byMonth.find((x) => x.key === toKey(sec));
				if (m) m.zoneDanger++;
			}
		});
		kidnapFiltered.forEach((row: any) => {
			const sec = getSec(row);
			if (sec) {
				const m = byMonth.find((x) => x.key === toKey(sec));
				if (m) m.kidnapping++;
			}
		});

		return {
			totals: {
				viktim: viktims.length,
				zoneDanger,
				kidnapping,
				news,
			},
			viktimByType,
			byMonth,
		};
	} catch (error) {
		console.error(error);
		return {
			totals: { viktim: 0, zoneDanger: 0, kidnapping: 0, news: 0 },
			viktimByType: {},
			byMonth: [],
		};
	}
};

export const handleSendALertNotification = async (message: string) => {
	try {
		await invokeEdge("send-notification", { information: message });
	} catch (error) {
		console.error(error);
	}
};

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";
export type ModerationReason =
	| "MISINFORMATION"
	| "HATE_SPEECH"
	| "SPAM"
	| "GRAPHIC"
	| "DUPLICATE"
	| "OTHER";
export type ModerationContentType = "POST" | "REPORT" | "NEWS" | "COMMENT";
export type ModeratorAction = "approve" | "reject" | "escalate";

export type ModerationItem = {
	id: string;
	authorId: string | null;
	authorName: string;
	authorHandle: string | null;
	authorAnonymous: boolean;
	contentType: ModerationContentType;
	contentRef: string | null;
	preview: string;
	thumbnail: string | null;
	location: string | null;
	reason: ModerationReason;
	reportsCount: number;
	status: ModerationStatus;
	decidedBy: string | null;
	decidedAt: string | null;
	decisionNote: string | null;
	submittedAt: string;
};

function mapModerationRow(r: Record<string, unknown>): ModerationItem {
	return {
		id: String(r.id),
		authorId: (r.author_id as string | null) ?? null,
		authorName: String(r.author_name ?? ""),
		authorHandle: (r.author_handle as string | null) ?? null,
		authorAnonymous: Boolean(r.author_anonymous),
		contentType: r.content_type as ModerationContentType,
		contentRef: (r.content_ref as string | null) ?? null,
		preview: String(r.preview ?? ""),
		thumbnail: (r.thumbnail_url as string | null) ?? null,
		location: (r.location as string | null) ?? null,
		reason: r.reason as ModerationReason,
		reportsCount: Number(r.reports_count ?? 0),
		status: r.status as ModerationStatus,
		decidedBy: (r.decided_by as string | null) ?? null,
		decidedAt: (r.decided_at as string | null) ?? null,
		decisionNote: (r.decision_note as string | null) ?? null,
		submittedAt: String(r.submitted_at ?? new Date().toISOString()),
	};
}

export type ModeratorRole = "admin" | "moderator" | "viewer" | null;

/** Returns the current Supabase user's dashboard role, or null if no row exists. */
export const getCurrentUserRole = async (): Promise<ModeratorRole> => {
	try {
		const sb = getSupabase();
		const { data: userRes } = await sb.auth.getUser();
		if (!userRes.user) return null;
		const { data, error } = await sb
			.from("user_roles")
			.select("role")
			.eq("user_id", userRes.user.id)
			.maybeSingle();
		if (error) {
			console.error("getCurrentUserRole", error.message);
			return null;
		}
		return (data?.role as ModeratorRole) ?? null;
	} catch (error) {
		console.error("getCurrentUserRole failed", error);
		return null;
	}
};

export type ModerationQueueFilters = {
	status?: ModerationStatus;
	reason?: ModerationReason;
	limit?: number;
};

export const fetchModerationQueue = async (
	filters: ModerationQueueFilters = {},
): Promise<ModerationItem[]> => {
	try {
		let q = getSupabase()
			.from("moderation_queue")
			.select("*")
			.order("submitted_at", { ascending: false })
			.limit(filters.limit ?? 200);
		if (filters.status) q = q.eq("status", filters.status);
		if (filters.reason) q = q.eq("reason", filters.reason);
		const { data, error } = await q;
		if (error) throw error;
		return (data ?? []).map((r) => mapModerationRow(r as Record<string, unknown>));
	} catch (error) {
		console.error("fetchModerationQueue failed", error);
		return [];
	}
};

/**
 * Decide on a single moderation item (atomic, audited).
 *
 * Calls the SECURITY DEFINER RPC `moderation_decide` which:
 *   1. Checks caller role (admin required for `escalate`, moderator+ for the rest).
 *   2. Updates `moderation_queue` (status, decided_by, decided_at, decision_note).
 *   3. Inserts a `moderation_audit` row.
 */
export const decideModeration = async (
	itemId: string,
	action: ModeratorAction,
	note?: string,
): Promise<{ id: string; status: ModerationStatus } | null> => {
	const { data, error } = await getSupabase().rpc("moderation_decide", {
		p_item_id: itemId,
		p_action: action,
		p_note: note ?? null,
	});
	if (error) throw new Error(error.message);
	const row = Array.isArray(data) ? data[0] : data;
	if (!row) return null;
	return { id: String(row.id), status: row.status as ModerationStatus };
};

export const bulkDecideModeration = async (
	itemIds: string[],
	action: ModeratorAction,
	note?: string,
): Promise<{ succeeded: string[]; failed: { id: string; error: string }[] }> => {
	const succeeded: string[] = [];
	const failed: { id: string; error: string }[] = [];
	const results = await Promise.allSettled(
		itemIds.map((id) => decideModeration(id, action, note)),
	);
	results.forEach((r, i) => {
		if (r.status === "fulfilled" && r.value) {
			succeeded.push(r.value.id);
		} else {
			failed.push({
				id: itemIds[i],
				error: r.status === "rejected" ? String(r.reason?.message ?? r.reason) : "unknown",
			});
		}
	});
	return { succeeded, failed };
};

// --- Analytics views & RPCs ------------------------------------------------

export type ReasonCount = {
	reason: ModerationReason;
	count: number;
};

export const fetchReasonCounts24h = async (): Promise<ReasonCount[]> => {
	try {
		const { data, error } = await getSupabase()
			.from("moderation_reason_counts_24h")
			.select("*");
		if (error) throw error;
		return (data ?? []).map((r: any) => ({
			reason: r.reason as ModerationReason,
			count: Number(r.item_count ?? 0),
		}));
	} catch (error) {
		console.error("fetchReasonCounts24h failed", error);
		return [];
	}
};

export type AuditFeedItem = {
	id: number;
	itemId: string;
	moderatorId: string | null;
	moderatorEmail: string | null;
	action: ModeratorAction;
	prevStatus: ModerationStatus | null;
	nextStatus: ModerationStatus;
	note: string | null;
	createdAt: string;
	contentType: ModerationContentType;
	preview: string;
	reason: ModerationReason;
	authorName: string;
	reportsCount: number;
};

export const fetchAuditFeed = async (limit = 8): Promise<AuditFeedItem[]> => {
	try {
		const { data, error } = await getSupabase()
			.from("moderation_audit_feed")
			.select("*")
			.order("created_at", { ascending: false })
			.limit(limit);
		if (error) throw error;
		return (data ?? []).map((r: any) => ({
			id: Number(r.id),
			itemId: String(r.item_id),
			moderatorId: (r.moderator_id as string | null) ?? null,
			moderatorEmail: (r.moderator_email as string | null) ?? null,
			action: r.action as ModeratorAction,
			prevStatus: (r.prev_status as ModerationStatus | null) ?? null,
			nextStatus: r.next_status as ModerationStatus,
			note: (r.note as string | null) ?? null,
			createdAt: String(r.created_at),
			contentType: r.content_type as ModerationContentType,
			preview: String(r.preview ?? ""),
			reason: r.reason as ModerationReason,
			authorName: String(r.author_name ?? ""),
			reportsCount: Number(r.reports_count ?? 0),
		}));
	} catch (error) {
		console.error("fetchAuditFeed failed", error);
		return [];
	}
};

export type LeaderboardEntry = {
	moderatorId: string;
	moderatorEmail: string | null;
	actions: number;
	approves: number;
	rejects: number;
	escalates: number;
	approvalPct: number;
};

export const fetchLeaderboard = async (limit = 5): Promise<LeaderboardEntry[]> => {
	try {
		const { data, error } = await getSupabase()
			.from("moderator_leaderboard_7d")
			.select("*")
			.order("actions", { ascending: false })
			.limit(limit);
		if (error) throw error;
		return (data ?? []).map((r: any) => ({
			moderatorId: String(r.moderator_id),
			moderatorEmail: (r.moderator_email as string | null) ?? null,
			actions: Number(r.actions ?? 0),
			approves: Number(r.approves ?? 0),
			rejects: Number(r.rejects ?? 0),
			escalates: Number(r.escalates ?? 0),
			approvalPct: Number(r.approval_pct ?? 0),
		}));
	} catch (error) {
		console.error("fetchLeaderboard failed", error);
		return [];
	}
};

export type HourlyMetric = {
	bucket: string;
	pendingAdded: number;
	flaggedAdded: number;
	approved: number;
	rejected: number;
};

export const fetchHourlyMetrics = async (hours = 17): Promise<HourlyMetric[]> => {
	try {
		const { data, error } = await getSupabase().rpc("moderation_hourly_metrics", {
			p_hours: hours,
		});
		if (error) throw error;
		return (data ?? []).map((r: any) => ({
			bucket: String(r.bucket),
			pendingAdded: Number(r.pending_added ?? 0),
			flaggedAdded: Number(r.flagged_added ?? 0),
			approved: Number(r.approved ?? 0),
			rejected: Number(r.rejected ?? 0),
		}));
	} catch (error) {
		console.error("fetchHourlyMetrics failed", error);
		return [];
	}
};

export type ModerationChangeEvent =
	| { kind: "INSERT"; item: ModerationItem }
	| { kind: "UPDATE"; item: ModerationItem }
	| { kind: "DELETE"; id: string };

/**
 * Subscribe to live changes on `moderation_queue`. Returns an unsubscribe fn.
 *
 * Requires the table to be in the `supabase_realtime` publication
 * (the moderation migration adds it).
 */
export const subscribeToModerationQueue = (
	handler: (event: ModerationChangeEvent) => void,
): (() => void) => {
	const sb = getSupabase();
	const channel = sb
		.channel("moderation_queue_changes")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "moderation_queue" },
			(payload) => {
				if (payload.eventType === "DELETE") {
					const oldRow = payload.old as Record<string, unknown>;
					if (oldRow?.id) handler({ kind: "DELETE", id: String(oldRow.id) });
					return;
				}
				const row = payload.new as Record<string, unknown>;
				if (!row?.id) return;
				handler({
					kind: payload.eventType === "INSERT" ? "INSERT" : "UPDATE",
					item: mapModerationRow(row),
				});
			},
		)
		.subscribe();
	return () => {
		sb.removeChannel(channel);
	};
};

// ---------------------------------------------------------------------------
// App users (mobile users in public.users)
// ---------------------------------------------------------------------------

export type AppUserRow = {
	id: string;
	userId: string | null;
	email: string | null;
	radiusKm: number | null;
	notificationRadiusKm: number | null;
	latitude: number | null;
	longitude: number | null;
	deviceToken: string | null;
	updatedAt: string | null;
};

export type AppUsersSearchParams = {
	query?: string;
	hasDevice?: boolean | null;
	limit?: number;
	offset?: number;
};

export type AppUsersSearchResult = {
	rows: AppUserRow[];
	total: number;
};

/**
 * List rows from `public.users` joined with `auth.users.email`.
 *
 * Calls SECURITY DEFINER RPC `list_app_users` which enforces moderator/admin
 * role server-side, so RLS on `public.users` can stay locked down.
 */
export const searchAppUsers = async (
	params: AppUsersSearchParams = {},
): Promise<AppUsersSearchResult> => {
	const { query, hasDevice, limit = 25, offset = 0 } = params;
	try {
		const { data, error } = await getSupabase().rpc("list_app_users", {
			p_query: query ?? "",
			p_limit: limit,
			p_offset: offset,
			p_has_device: hasDevice ?? null,
		});
		if (error) throw error;
		const rows = (data ?? []) as Array<Record<string, unknown>>;
		const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
		return {
			rows: rows.map((r) => ({
				id: String(r.id ?? ""),
				userId: (r.user_id as string | null) ?? null,
				email: (r.email as string | null) ?? null,
				radiusKm: r.radius_km != null ? Number(r.radius_km) : null,
				notificationRadiusKm:
					r.notification_radius_km != null ? Number(r.notification_radius_km) : null,
				latitude: r.latitude != null ? Number(r.latitude) : null,
				longitude: r.longitude != null ? Number(r.longitude) : null,
				deviceToken: (r.device_token as string | null) ?? null,
				updatedAt: (r.updated_at as string | null) ?? null,
			})),
			total,
		};
	} catch (e) {
		console.error("searchAppUsers failed", e);
		return { rows: [], total: 0 };
	}
};

// ---------------------------------------------------------------------------
// Global search (app-bar)
// ---------------------------------------------------------------------------

export type GlobalSearchKind =
	| "viktim"
	| "zone_danger"
	| "news"
	| "kidnaping_alert"
	| "moderation_queue";

export type GlobalSearchHit = {
	kind: GlobalSearchKind;
	id: string;
	title: string;
	subtitle: string | null;
	meta: string | null;
	rank: number;
};

/**
 * Fan-out full-text search across viktim / zone_danger / news / kidnaping_alert
 * / moderation_queue. RLS still applies, so e.g. moderation rows are only
 * returned to moderators+admins.
 *
 * Pass `signal` to drop in-flight requests when the user keeps typing.
 */
export const searchGlobal = async (
	query: string,
	limit = 8,
	signal?: AbortSignal,
): Promise<GlobalSearchHit[]> => {
	const trimmed = query.trim();
	if (trimmed.length < 2) return [];
	try {
		// AbortController integration: PostgREST/Supabase client uses fetch under
		// the hood; .abortSignal() forwards the signal so the network request is
		// cancelled when the user keeps typing.
		const builder = getSupabase().rpc("search_global", {
			p_query: trimmed,
			p_limit: limit,
		});
		const { data, error } = await (signal ? builder.abortSignal(signal) : builder);
		if (error) {
			if (error.message?.toLowerCase().includes("aborted")) return [];
			throw error;
		}
		return (data ?? []).map((r: any) => ({
			kind: r.kind as GlobalSearchKind,
			id: String(r.id),
			title: String(r.title ?? ""),
			subtitle: (r.subtitle as string | null) ?? null,
			meta: (r.meta as string | null) ?? null,
			rank: Number(r.rank ?? 0),
		}));
	} catch (e) {
		if ((e as { name?: string })?.name === "AbortError") return [];
		console.error("searchGlobal failed", e);
		return [];
	}
};
