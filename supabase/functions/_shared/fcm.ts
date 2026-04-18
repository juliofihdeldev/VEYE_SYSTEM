// Firebase Cloud Messaging HTTP v1 sender for VEYe.
//
// Replaces the old `_shared/onesignal.ts`. We now mint OAuth2 access tokens
// from a Firebase service account (RS256 JWT → token endpoint) and POST one
// message per device token to FCM v1.
//
// Required Supabase secrets (set via `supabase secrets set ...`):
//   FCM_PROJECT_ID            — e.g. "edel-34e48"
//   FCM_SERVICE_ACCOUNT_JSON  — the entire downloaded service-account JSON,
//                               pasted as a single string (newlines in
//                               private_key kept as literal "\n").
//
// Notes:
// - HTTP v1 doesn't support multicast; we fan out per token. Failed tokens
//   (404 UNREGISTERED / 400 INVALID_ARGUMENT) are returned in `invalidTokens`
//   so the caller can clean up stale rows in `users.device_token`.
// - The OAuth2 access token is cached for ~50 min (Google issues 1h tokens).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

function replaceUndefined(str: string): string {
	return str
		.replace(/undefined/g, "Port-au-Prince")
		.replace(/underfined/g, "Port-au-Prince");
}

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

function calculateDistance(
	a: { latitude: number; longitude: number },
	b: { latitude: number; longitude: number },
): number {
	const R = 6371;
	const dLat = toRad(b.latitude - a.latitude);
	const dLon = toRad(b.longitude - a.longitude);
	const h =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(a.latitude)) *
			Math.cos(toRad(b.latitude)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
	return R * c;
}

type UserRow = {
	id: string;
	latitude: number | null;
	longitude: number | null;
	device_token: string | null;
	notification_radius_km: number | null;
	radius_km: number | null;
};

type ServiceAccount = {
	client_email: string;
	private_key: string;
	token_uri?: string;
	project_id?: string;
};

type SendResult = {
	success: boolean;
	error?: string;
	skipped?: string;
	sent?: number;
	failed?: number;
	invalidTokens?: string[];
};

let cachedServiceAccount: ServiceAccount | null = null;
function loadServiceAccount(): ServiceAccount {
	if (cachedServiceAccount) return cachedServiceAccount;
	const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
	if (!raw) {
		throw new Error("Missing FCM_SERVICE_ACCOUNT_JSON env");
	}
	const parsed = JSON.parse(raw) as ServiceAccount;
	if (!parsed.client_email || !parsed.private_key) {
		throw new Error("FCM_SERVICE_ACCOUNT_JSON missing client_email/private_key");
	}
	cachedServiceAccount = parsed;
	return parsed;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function base64UrlEncode(bytes: Uint8Array | string): string {
	const buf =
		typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
	let s = btoa(String.fromCharCode(...buf));
	return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
	const cleaned = pem
		.replace(/\\n/g, "\n")
		.replace(/-----BEGIN [^-]+-----/g, "")
		.replace(/-----END [^-]+-----/g, "")
		.replace(/\s+/g, "");
	const bin = atob(cleaned);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes.buffer;
}

async function getAccessToken(): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	if (cachedAccessToken && cachedAccessToken.expiresAt - 60 > now) {
		return cachedAccessToken.token;
	}

	const sa = loadServiceAccount();
	const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";

	const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
	const claims = base64UrlEncode(
		JSON.stringify({
			iss: sa.client_email,
			scope: "https://www.googleapis.com/auth/firebase.messaging",
			aud: tokenUri,
			iat: now,
			exp: now + 3600,
		}),
	);
	const unsigned = `${header}.${claims}`;

	const key = await crypto.subtle.importKey(
		"pkcs8",
		pemToArrayBuffer(sa.private_key),
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = new Uint8Array(
		await crypto.subtle.sign(
			"RSASSA-PKCS1-v1_5",
			key,
			new TextEncoder().encode(unsigned),
		),
	);
	const jwt = `${unsigned}.${base64UrlEncode(sig)}`;

	const resp = await fetch(tokenUri, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: jwt,
		}),
	});
	if (!resp.ok) {
		const t = await resp.text();
		throw new Error(`OAuth2 token exchange failed (${resp.status}): ${t}`);
	}
	const data = (await resp.json()) as {
		access_token: string;
		expires_in: number;
	};
	cachedAccessToken = {
		token: data.access_token,
		expiresAt: now + data.expires_in,
	};
	return data.access_token;
}

async function sendOne(
	projectId: string,
	accessToken: string,
	token: string,
	title: string,
	body: string,
	data: Record<string, string>,
): Promise<{ ok: boolean; status: number; bodyText: string }> {
	const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
	const message = {
		message: {
			token,
			notification: { title, body },
			data,
			android: {
				priority: "HIGH" as const,
				notification: { sound: "default", click_action: "OPEN_VEYE_TAB" },
			},
		},
	};
	const resp = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(message),
	});
	const text = await resp.text();
	return { ok: resp.ok, status: resp.status, bodyText: text };
}

function isStaleTokenResponse(status: number, bodyText: string): boolean {
	if (status === 404) return true;
	if (status === 400 && /INVALID_ARGUMENT|Invalid registration/i.test(bodyText)) {
		return true;
	}
	if (status === 403 && /SenderId mismatch|sender id mismatch/i.test(bodyText)) {
		return true;
	}
	return false;
}

/** Build a message and dispatch it to every user within range via FCM HTTP v1. */
export async function sendFcmNotification(
	supabase: SupabaseClient,
	information: string,
	position: { latitude: number | null; longitude: number | null } | null,
): Promise<SendResult> {
	const cleaned = replaceUndefined(information ?? "");
	const projectId = Deno.env.get("FCM_PROJECT_ID");
	if (!projectId) {
		console.warn("sendFcmNotification: missing FCM_PROJECT_ID");
		return { success: false, error: "Missing FCM_PROJECT_ID" };
	}
	if (!Deno.env.get("FCM_SERVICE_ACCOUNT_JSON")) {
		console.warn("sendFcmNotification: missing FCM_SERVICE_ACCOUNT_JSON");
		return { success: false, error: "Missing FCM_SERVICE_ACCOUNT_JSON" };
	}

	if (!position?.latitude || !position?.longitude) {
		return { success: true, skipped: "no_position" };
	}

	const { data: users, error } = await supabase
		.from("users")
		.select(
			"id, latitude, longitude, device_token, notification_radius_km, radius_km",
		)
		.not("device_token", "is", null);

	if (error) {
		console.error("sendFcmNotification: users query", error);
		return { success: false, error: error.message };
	}

	const eligible: UserRow[] = [];
	for (const u of (users ?? []) as UserRow[]) {
		if (u.latitude == null || u.longitude == null || !u.device_token) continue;
		const radiusKm = u.notification_radius_km ?? u.radius_km ?? 25;
		const distance = calculateDistance(
			{ latitude: position.latitude, longitude: position.longitude },
			{ latitude: u.latitude, longitude: u.longitude },
		);
		if (distance <= radiusKm) eligible.push(u);
	}

	const tokens = eligible
		.map((u) => u.device_token!)
		.filter((t): t is string => Boolean(t));
	if (tokens.length === 0) {
		return { success: true, skipped: "no_users_in_range" };
	}

	let accessToken: string;
	try {
		accessToken = await getAccessToken();
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.error("sendFcmNotification: oauth", msg);
		return { success: false, error: msg };
	}

	const data = { title: "VEYe", contents: cleaned };

	let sent = 0;
	let failed = 0;
	const invalidTokens: string[] = [];

	const concurrency = 10;
	for (let i = 0; i < tokens.length; i += concurrency) {
		const batch = tokens.slice(i, i + concurrency);
		const results = await Promise.all(
			batch.map((t) =>
				sendOne(projectId, accessToken, t, "VEYe", cleaned, data).catch(
					(e) => ({
						ok: false,
						status: 0,
						bodyText: e instanceof Error ? e.message : String(e),
					}),
				),
			),
		);
		results.forEach((r, idx) => {
			if (r.ok) {
				sent += 1;
			} else {
				failed += 1;
				if (isStaleTokenResponse(r.status, r.bodyText)) {
					invalidTokens.push(batch[idx]);
				} else {
					console.warn(
						"sendFcmNotification: send failed",
						r.status,
						r.bodyText.slice(0, 200),
					);
				}
			}
		});
	}

	if (invalidTokens.length > 0) {
		const { error: updErr } = await supabase
			.from("users")
			.update({ device_token: null })
			.in("device_token", invalidTokens);
		if (updErr) {
			console.warn("sendFcmNotification: clearing stale tokens failed", updErr);
		}
	}

	return {
		success: failed === 0 || sent > 0,
		sent,
		failed,
		invalidTokens: invalidTokens.length > 0 ? invalidTokens : undefined,
	};
}
