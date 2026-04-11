import axios from "axios";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from "firebase/firestore/lite";

// Follow this pattern to import other Firebase services
// import { } from 'firebase/<service>';

const firebaseConfig = {
	apiKey: "AIzaSyDaFHRZHEPup-yDtw2t26D9mR2BrRl1Erc",
	authDomain: "edel-34e48.firebaseapp.com",
	projectId: "edel-34e48",
	storageBucket: "edel-34e48.appspot.com",
	messagingSenderId: "39477815142",
	appId: "1:39477815142:web:e426ae23d5372972258aa7",
	measurementId: "G-1YW5LTS0TJ",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZHdtcmdleXp6cmxnaWllcmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAzMjA3NjgsImV4cCI6MTk5NTg5Njc2OH0.tOVwN31wE-ywaNG2eF-rgdBAtwFalZzR-1igVVeOAyE";

const COLLECTION_ZONE_DANGER = "ZoneDanger";
const COLLECTION_KIDNAPING = "KidnapingAlert";
const COLLECTION_VIKTIM = "Viktim";
const COLLECTION_NEWS = "News";

// Collection
const alertCollection = collection(db, COLLECTION_ZONE_DANGER);
const viktimCollection = collection(db, COLLECTION_VIKTIM);
const kidnappingSignalCollection = collection(db, COLLECTION_KIDNAPING);
const newsCollection = collection(db, COLLECTION_NEWS);

// Module Signaler zone
export const handleGetALert = async () => {
	try {
		const zoneDangerSnapshot = await getDocs(alertCollection);
		const zoneDangerList = zoneDangerSnapshot.docs.map((doc) => {
			const data = doc.data();
			data.id = doc.id;
			return data;
		});
		return zoneDangerList;
	} catch (error) {
		console.error(error);
	}
};

const PROCESS_GLOBAL_ALERT_URL = import.meta.env.VITE_PROCESS_GLOBAL_ALERT_URL as string;
const PROCESS_ALERT_SECRET = import.meta.env.VITE_PROCESS_ALERT_SECRET as string;
const TELEGRAM_MONITOR_RUN_URL = import.meta.env.VITE_TELEGRAM_MONITOR_RUN_URL as string;

/** Manually trigger Telegram channel monitor (same as scheduled job). */
export const runTelegramMonitor = async () => {
	if (!TELEGRAM_MONITOR_RUN_URL) {
		throw new Error('VITE_TELEGRAM_MONITOR_RUN_URL is not set in .env');
	}
	const resp = await axios.post(
		TELEGRAM_MONITOR_RUN_URL,
		{},
		{
			headers: {
				'Content-Type': 'application/json',
				...(PROCESS_ALERT_SECRET ? { 'x-veye-secret': PROCESS_ALERT_SECRET } : {}),
			},
			timeout: 130_000,
		},
	);
	return resp.data;
};

export const handleSendAlert = async (data: any) => {
	if (!data) return;

	const { confirm: _confirm, ...raw } = data;

	const lat =
		raw.latitude !== undefined && raw.latitude !== "" && raw.latitude != null
			? Number(raw.latitude)
			: NaN;
	const lng =
		raw.longitude !== undefined && raw.longitude !== "" && raw.longitude != null
			? Number(raw.longitude)
			: NaN;
	const hasPosition = Number.isFinite(lat) && Number.isFinite(lng);

	const address = String(raw.address ?? "").trim();
	const rezon = String(raw.rezon ?? "").trim();
	const name = String(raw.name ?? "").trim();
	const summaryParts = [address, rezon].filter(Boolean);
	const summary = summaryParts.join("\n\n") || rezon || name;

	// Build the payload the AI pipeline expects
	const payload: Record<string, unknown> = {
		...raw,
		title: name,
		summary,
		source: "dashboard",
		sourceUrl: null,
		userId: "dashboard-admin",
		position: hasPosition ? { latitude: lat, longitude: lng } : null,
	};

	if (hasPosition) {
		payload.latitude = lat;
		payload.longitude = lng;
	} else {
		delete payload.latitude;
		delete payload.longitude;
	}

	try {
		const resp = await axios.post(PROCESS_GLOBAL_ALERT_URL, payload, {
			headers: {
				'Content-Type': 'application/json',
				'x-veye-secret': PROCESS_ALERT_SECRET,
			},
		});
		return resp.data;
	} catch (error: any) {
		console.error('handleSendAlert: processGlobalAlert failed', error?.response?.data ?? error.message);
		throw error;
	}
};

export const handleUpdatedAlert = async (id: string, fields: Record<string, any>) => {
	if (!id) return;
	const docRef = doc(db, COLLECTION_ZONE_DANGER, id);
	await updateDoc(docRef, fields);
};

export const handleDeletedAlert = async (data: any) => {
	if (!data) return;

	try {
		await deleteDoc(doc(db, COLLECTION_ZONE_DANGER, data.id));
	} catch (error) {
		console.error(error);
	}
};

// MODULE VIKTIM
export const handleGetViktim = async (type: string) => {
	let data = [];
	try {
		if (type !== "All") {
			const viktimCollectionRef = collection(db, COLLECTION_VIKTIM);
			const queryResult = query(viktimCollectionRef, where("type", "==", type));

			const zoneDangerSnapshot = await getDocs(queryResult);
			const zoneDangerList = zoneDangerSnapshot.docs.map((doc) => {
				const data = doc.data();
				data.id = doc.id;
				return data;
			});
			data = zoneDangerList;
		} else {
			const zoneDangerSnapshot = await getDocs(viktimCollection);
			const zoneDangerList = zoneDangerSnapshot.docs.map((doc) => {
				const data = doc.data();
				data.id = doc.id;
				return data;
			});
			data = zoneDangerList;
		}

		return data;
	} catch (error) {}
};

export const handleSendViktim = async (data: any) => {
	if (!data) return;
	data = JSON.stringify(data);
	data = JSON.parse(data);
	try {
		const docRef = await addDoc(collection(db, COLLECTION_VIKTIM), data);
		return docRef.id;
	} catch (error) {
		console.error(error);
	}
};

export const handleDeletedViktim = async (data: any) => {
	if (!data) return;

	try {
		await deleteDoc(doc(db, COLLECTION_VIKTIM, data.id));
	} catch (error) {
		console.error(error);
	}
};

// Module NEWS

export const handleGetNews = async () => {
	console.log("NEws");
	try {
		const zoneDangerSnapshot = await getDocs(newsCollection);
		const zoneDangerList = zoneDangerSnapshot.docs.map((doc) => {
			const data = doc.data();
			data.id = doc.id;
			return data;
		});
		return zoneDangerList;
	} catch (error) {
		console.error(error);
	}
};

export const handleSendNews = async (data: any) => {
	if (!data) return;
	data = JSON.stringify(data);
	data = JSON.parse(data);
	try {
		const docRef = await addDoc(collection(db, COLLECTION_NEWS), data);
		return docRef.id;
	} catch (error) {
		console.error(error);
	}
};

export const handleUpdatedNews = async (data: any) => {
	if (!data) return;
	const updateZoneDangerCollection = doc(db, COLLECTION_NEWS, data?._id);
	const docRef = await updateDoc(updateZoneDangerCollection, data);
	return docRef;
};

export const handleDeletedNews = async (data: any) => {
	if (!data) return;

	try {
		await deleteDoc(doc(db, COLLECTION_NEWS, data.id));
	} catch (error) {
		console.error(error);
	}
};

// Module Kidnapping signal

export const handleGetKidnapping = async () => {
	let data = [];
	try {
		const kidsignalSnapshot = await getDocs(kidnappingSignalCollection);
		const zoneDangerList = kidsignalSnapshot.docs.map((doc) => {
			const data = doc.data();
			data.id = doc.id;
			return data;
		});
		data = zoneDangerList;
		return data;
	} catch (error) {}
};

// Module Stats - incident statistics
export type IncidentStatsFilters = {
	dateFrom?: number; // timestamp seconds (start of day)
	dateTo?: number;   // timestamp seconds (end of day)
	months?: number;   // 3, 6, or 12 for trend chart
};

export const handleGetIncidentStats = async (filters?: IncidentStatsFilters) => {
	try {
		const [zoneDangerSnap, viktimSnap, kidnapSnap, newsSnap] = await Promise.all([
			getDocs(alertCollection),
			getDocs(viktimCollection),
			getDocs(kidnappingSignalCollection),
			getDocs(newsCollection),
		]);

		const getSec = (data: any): number | null => {
			const d = data?.date;
			if (!d) return null;
			if (typeof d?.seconds === "number") return d.seconds;
			if (typeof d === "number") return d >= 1e12 ? Math.floor(d / 1000) : d;
			if (typeof d === "string") return Math.floor(new Date(d).getTime() / 1000);
			return null;
		};

		const inRange = (sec: number | null): boolean => {
			if (!sec) return false;
			if (filters?.dateFrom != null && sec < filters.dateFrom) return false;
			if (filters?.dateTo != null && sec > filters.dateTo) return false;
			return true;
		};

		const viktimsFiltered = viktimSnap.docs.filter((doc) => inRange(getSec(doc.data())));
		const zoneDangerFiltered = zoneDangerSnap.docs.filter((doc) => inRange(getSec(doc.data())));
		const kidnapFiltered = kidnapSnap.docs.filter((doc) => inRange(getSec(doc.data())));
		const newsFiltered = newsSnap.docs.filter((doc) => inRange(getSec(doc.data())));
		const viktims = viktimsFiltered;

		const zoneDanger = zoneDangerFiltered.length;
		const kidnapping = kidnapFiltered.length;
		const news = newsFiltered.length;

		// Group Viktim by type
		const viktimByType: Record<string, number> = {};
		viktims.forEach((doc) => {
			const type = (doc.data().type as string) || "other";
			viktimByType[type] = (viktimByType[type] || 0) + 1;
		});

		// Group by month (configurable: 3, 6, or 12 months)
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

		viktims.forEach((doc) => {
			const sec = getSec(doc.data());
			if (sec) {
				const m = byMonth.find((x) => x.key === toKey(sec));
				if (m) m.viktim++;
			}
		});
		zoneDangerFiltered.forEach((doc) => {
			const sec = getSec(doc.data());
			if (sec) {
				const m = byMonth.find((x) => x.key === toKey(sec));
				if (m) m.zoneDanger++;
			}
		});
		kidnapFiltered.forEach((doc) => {
			const sec = getSec(doc.data());
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

// send notification use signal
export const handleSendALertNotification = async (message: string) => {
	let url = "https://vwdwmrgeyzzrlgiierls.functions.supabase.co/notification";

	try {
		await axios.post(
			url,
			{ message: message },
			{
				headers: { Authorization: `Bearer ${TOKEN}` },
			},
		);
	} catch (error) {
		console.error(error);
	}
};
