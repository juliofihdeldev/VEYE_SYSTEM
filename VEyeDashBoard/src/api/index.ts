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
