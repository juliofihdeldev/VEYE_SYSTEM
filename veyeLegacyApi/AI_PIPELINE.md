# AI Processing Pipeline

Implements the AI pipeline from [plan.md](../VEyeApp/plan.md) for processing social media posts (Telegram, future Facebook) into structured Firestore data.

---

## Flow

```
Raw post (text + metadata)
       ↓
Step 1: Filter relevance
  "Is this a safety incident in Haiti?"
  → GPT-4o-mini
       ↓ (relevant only)
Step 2: Extract data
  incidentType, location, victim, severity
  → GPT-4o
       ↓
Step 3: Geocode
  "bò mache Petyon Vil" → lat/lng
  → Google Geocoding API
       ↓
Step 4: Deduplicate
  Compare embedding to recent ZoneDanger/Viktim
  → OpenAI text-embedding-3-small
       ↓
Step 5: Write to Firestore
  ZoneDanger or Viktim
  source: "telegram", verified: false, aiConfidence
```

---

## Configuration

| Config Key | Env Variable | Description |
|------------|-------------|-------------|
| `ai.google_gemini_api_key` | `GOOGLE_GEMINI_API_KEY` | Google Gemini API key (relevance, extract, embeddings) |
| `ai.openai_key` | `OPENAI_API_KEY` | OpenAI API key (legacy / optional) |
| `ai.geocoding_key` | `GOOGLE_GEOCODING_API_KEY` | Google Geocoding API key |

**Local:** set `GOOGLE_GEMINI_API_KEY` in `functions/.env` (not committed).

**Production (Firebase):** [Google Cloud Console](https://console.cloud.google.com/) → your project → **Cloud Functions** → select `telegramMonitor` / `telegramMonitorRun` → **Edit** → **Runtime, build…** → **Environment variables** → add `GOOGLE_GEMINI_API_KEY`, then redeploy. Or use the same name under **Firebase Console → Functions → your function → Configuration**.

```bash
# Legacy runtime config (if still in use)
firebase functions:config:set ai.google_gemini_api_key="YOUR_KEY"
firebase functions:config:set ai.geocoding_key="..."
```

**Fallback:** If `OPENAI_API_KEY` is not set, posts go directly to `News` (no filtering/extraction).

---

## Firestore Schema

### ZoneDanger (from AI)

```json
{
  "source": "telegram",
  "sourceUrl": "https://t.me/channel/123",
  "verified": false,
  "aiConfidence": 0.87,
  "name": "Petyon Vil",
  "address": "bò mache Petyon Vil",
  "rezon": "[shooting] Tire nan zòn mache a",
  "latitude": 18.52,
  "longitude": -72.28,
  "date": "Timestamp",
  "telegramChannelId": -1001234567890,
  "telegramMessageId": 456
}
```

### Viktim (from AI, kidnapping incidents)

```json
{
  "source": "telegram",
  "sourceUrl": "https://t.me/...",
  "verified": false,
  "aiConfidence": 0.82,
  "fullName": "Extracted name or Inconnu",
  "details": "Full summary",
  "type": "kidnaping",
  "status": "Captive",
  "zone": "Delmas 33",
  "latitude": 18.52,
  "longitude": -72.28,
  "date": "Timestamp",
  "telegramChannelId": -1001234567890,
  "telegramMessageId": 456
}
```

### AIPipelineEmbeddings (cache)

Stores embeddings for deduplication. Keyed by document ID from ZoneDanger or Viktim.

---

## Integration

The pipeline is invoked from `telegramMonitor.js` for each new Telegram post:

1. **AI enabled**: Run `processPost()` → ZoneDanger or Viktim if relevant
2. **AI disabled / not relevant**: Write to News as fallback
3. **Duplicate** (embedding similarity): Skip

---

## Cost Estimate

| Service | Per 1k posts |
|---------|--------------|
| GPT-4o-mini (filter) | ~$0.15 |
| GPT-4o (extract) | ~$2.50 |
| OpenAI Embeddings | ~$0.02 |
| Google Geocoding | ~$5 per 1k |
| **Total** | **~$8 / 1k posts** |
