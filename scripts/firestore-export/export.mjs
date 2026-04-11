/**
 * Scripted Firestore export: one NDJSON file per collection (all docs, paginated).
 *
 * Auth: set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path
 * (do not commit that file). Optional: FIREBASE_SERVICE_ACCOUNT as an alias.
 *
 * Env:
 *   OUT_DIR              — output directory (default: firestore-export-out at monorepo root when found)
 *   FIRESTORE_COLLECTIONS — comma-separated override; default = tables in docs/DATABASE.md
 *   GCLOUD_PROJECT       — optional; defaults to project_id in the service account JSON
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { finished } from "node:stream/promises";

import admin from "firebase-admin";

/** Mirrors docs/DATABASE.md Firestore collection names. */
const DEFAULT_COLLECTIONS = [
  "ZoneDanger",
  "KidnapingAlert",
  "Viktim",
  "News",
  "TelegramMonitorState",
  "AIPipelineEmbeddings",
  "UserModerations",
  "Users",
  "DemantiAlert",
  "VeyeComments",
];

const PAGE_SIZE = 500;
const MAX_DEPTH = 40;

function parseArgs(argv) {
  const args = { out: null, collections: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" && argv[i + 1]) {
      args.out = argv[++i];
    } else if (a === "--collections" && argv[i + 1]) {
      args.collections = argv[++i];
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    }
  }
  return args;
}

function isTimestamp(v) {
  return (
    v != null &&
    typeof v.toDate === "function" &&
    typeof v.toMillis === "function"
  );
}

function isGeoPoint(v) {
  return (
    v != null &&
    typeof v.latitude === "number" &&
    typeof v.longitude === "number" &&
    (v.constructor?.name === "GeoPoint" || typeof v.isEqual === "function")
  );
}

function isDocumentReference(v) {
  return (
    v != null &&
    typeof v.path === "string" &&
    typeof v.get === "function"
  );
}

function serializeFirestoreValue(val, depth = 0) {
  if (depth > MAX_DEPTH) return "[MaxDepth]";
  if (val === undefined) return null;
  if (val === null) return null;
  if (typeof val === "bigint") return val.toString();

  if (isTimestamp(val)) return val.toDate().toISOString();

  if (isGeoPoint(val)) {
    return {
      __type: "GeoPoint",
      latitude: val.latitude,
      longitude: val.longitude,
    };
  }

  if (isDocumentReference(val)) {
    return { __type: "DocumentReference", path: val.path };
  }

  if (Buffer.isBuffer(val)) {
    return { __type: "Bytes", base64: val.toString("base64") };
  }

  if (Array.isArray(val)) {
    return val.map((item) => serializeFirestoreValue(item, depth + 1));
  }

  if (typeof val === "object") {
    const plain =
      val.constructor === Object ||
      val.constructor?.name === "Object" ||
      Object.getPrototypeOf(val) === null;
    if (plain) {
      const out = {};
      for (const [k, v] of Object.entries(val)) {
        out[k] = serializeFirestoreValue(v, depth + 1);
      }
      return out;
    }
    return String(val);
  }

  return val;
}

function loadCredentialPath() {
  const p =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!p) {
    console.error(
      "Missing credentials: set GOOGLE_APPLICATION_CREDENTIALS (or FIREBASE_SERVICE_ACCOUNT) to your service account JSON path."
    );
    process.exit(1);
  }
  return p;
}

function resolveCollections(cliCollections) {
  if (cliCollections) {
    return cliCollections
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const env = process.env.FIRESTORE_COLLECTIONS;
  if (env?.trim()) {
    return env
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return DEFAULT_COLLECTIONS;
}

/** Walk up from cwd to find root `package.json` with name `veye-system` (pnpm --dir runs from scripts/). */
function findRepoRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 14; i++) {
    const pkgPath = join(dir, "package.json");
    try {
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (pkg.name === "veye-system") return dir;
      }
    } catch {
      /* ignore */
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function resolveOutDir(cliOut) {
  const fromCli = cliOut?.trim();
  const fromEnv = process.env.OUT_DIR?.trim();
  const raw = fromCli || fromEnv || "firestore-export-out";
  if (isAbsolute(raw)) return raw;
  return join(findRepoRoot(), raw);
}

async function exportCollection(db, name, outDir) {
  const filePath = join(outDir, `${name}.ndjson`);
  const stream = createWriteStream(filePath, { flags: "w" });
  let total = 0;
  let lastDoc = null;

  const writeLine = (obj) =>
    new Promise((resolve, reject) => {
      const line = `${JSON.stringify(obj)}\n`;
      if (!stream.write(line, "utf8")) {
        stream.once("drain", resolve);
      } else {
        resolve();
      }
    });

  try {
    while (true) {
      let q = db
        .collection(name)
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(PAGE_SIZE);
      if (lastDoc) {
        q = q.startAfter(lastDoc);
      }
      const snap = await q.get();
      if (snap.empty) break;

      for (const doc of snap.docs) {
        const data = doc.data();
        const row = {
          id: doc.id,
          data: serializeFirestoreValue(data),
        };
        await writeLine(row);
        total++;
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < PAGE_SIZE) break;
    }
  } finally {
    stream.end();
    await finished(stream);
  }

  return total;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Usage: node export.mjs [--out DIR] [--collections A,B,C]

Environment:
  GOOGLE_APPLICATION_CREDENTIALS  Path to service account JSON (required)
  FIREBASE_SERVICE_ACCOUNT        Alias for the above
  OUT_DIR                         Relative paths resolve from monorepo root (veye-system) when found
  FIRESTORE_COLLECTIONS         Comma-separated collection names
`);
    process.exit(0);
  }

  const credPath = loadCredentialPath();
  const sa = JSON.parse(readFileSync(credPath, "utf8"));
  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    sa.project_id;

  if (!projectId) {
    console.error("Could not determine project id (set GCLOUD_PROJECT or use a JSON with project_id).");
    process.exit(1);
  }

  const collections = resolveCollections(args.collections);
  const outDir = resolveOutDir(args.out);

  mkdirSync(outDir, { recursive: true });

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId,
    });
  }

  const db = admin.firestore();
  console.log(`Project: ${projectId}`);
  console.log(`Output:  ${outDir}`);
  console.log(`Collections (${collections.length}): ${collections.join(", ")}`);

  for (const name of collections) {
    process.stdout.write(`  ${name} … `);
    try {
      const n = await exportCollection(db, name, outDir);
      console.log(`${n} docs`);
    } catch (e) {
      console.log("error");
      console.error(e);
      process.exitCode = 1;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
