# Social Media Monitoring Plan: Facebook & Telegram → VEYe

## Overview

This plan covers AI tools and infrastructure for monitoring Facebook groups and Telegram channels to gather incident information and feed it into the VEYe app. In Haiti, much real-time incident info circulates on social platforms before reaching official sources.

---

## 1. Data Collection (Scraping / Monitoring)

### Facebook Groups

| Tool | What it does | Notes |
|------|-------------|-------|
| **CrowdTangle** (Meta) | Official API to monitor public Facebook groups/pages | Requires application to Meta; best for public groups |
| **Apify Facebook Scraper** | Cloud scraper that extracts posts from public groups | Pay-per-use, no API approval needed |
| **Bright Data** | Proxy + scraper infrastructure for Facebook | Handles anti-bot measures, expensive but reliable |
| **Jina AI Reader** (`r.jina.ai`) | Converts any URL to clean text via API | Free tier, good for individual post URLs |

### Telegram Channels

| Tool | What it does | Notes |
|------|-------------|-------|
| **Telethon** (Python) | Full Telegram client API — join channels, read messages in real-time | Free, open source, most powerful option |
| **Pyrogram** (Python) | Similar to Telethon, slightly simpler API | Free, open source |
| **Telegram Bot API** | Official bot API for channels where you can add a bot | Limited to channels/groups that accept your bot |

**Telegram is the easier starting point** — its API is open and doesn't fight scraping. Facebook is harder due to anti-scraping policies.

---

## 2. AI Processing Pipeline

Once raw posts (text + images) are collected, AI extracts structured incident data:

```
Facebook/Telegram post (raw text + photos)
       ↓
  ┌────────────────────────────┐
  │  Step 1: Filter relevance  │
  │  "Is this about a safety   │
  │   incident in Haiti?"      │
  │  → OpenAI / Claude API     │
  └────────────┬───────────────┘
               ↓ (relevant posts only)
  ┌────────────────────────────┐
  │  Step 2: Extract data      │
  │  → Incident type           │
  │  → Location (text → GPS)   │
  │  → Victim name             │
  │  → Time                    │
  │  → Severity                │
  │  → OpenAI / Claude API     │
  └────────────┬───────────────┘
               ↓
  ┌────────────────────────────┐
  │  Step 3: Deduplicate       │
  │  Compare against existing  │
  │  ZoneDanger / Viktim docs  │
  │  → Embeddings similarity   │
  └────────────┬───────────────┘
               ↓
  ┌────────────────────────────┐
  │  Step 4: Write to Firestore│
  │  → ZoneDanger or Viktim    │
  │  → Source: "facebook" /    │
  │    "telegram"              │
  │  → Mark as unverified      │
  └────────────────────────────┘
```

### Best AI Tools for Each Step

| Step | Tool | Why |
|------|------|-----|
| Relevance filter | **Claude API** or **GPT-4o-mini** | Cheap, fast, understands Kreyol/French |
| Data extraction | **Claude API** or **GPT-4o** | Structured JSON output, handles messy text |
| Location → GPS | **Google Geocoding API** | Convert "bò mache Petyon Vil" → lat/lng |
| Image analysis | **GPT-4o Vision** or **Google Cloud Vision** | Extract info from photos in posts |
| Deduplication | **OpenAI Embeddings** (`text-embedding-3-small`) | Compare semantic similarity of reports |

---

## 3. Recommended Architecture

```
┌──────────────────────────────────────┐
│        Monitoring Service            │
│      (Python on Cloud Run /          │
│       Railway / Firebase Functions)  │
│                                      │
│  Telethon ──→ Telegram channels      │
│  Apify    ──→ Facebook groups        │
│  Runs every 5-15 minutes             │
└──────────────┬───────────────────────┘
               │ new posts
               ▼
┌──────────────────────────────────────┐
│        AI Processing Pipeline        │
│      (Firebase Cloud Function or     │
│       Python service)                │
│                                      │
│  Claude/GPT → filter + extract       │
│  Geocoding  → location to GPS        │
│  Embeddings → deduplicate           │
└──────────────┬───────────────────────┘
               │ structured data
               ▼
┌──────────────────────────────────────┐
│           Firestore                  │
│                                      │
│  ZoneDanger: { ...alert data,        │
│    source: "telegram",               │
│    sourceUrl: "https://t.me/...",    │
│    verified: false,                  │
│    aiConfidence: 0.87 }              │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│        VEYe React Native App         │
│  Shows alerts with source badge      │
│  "via Telegram" / "via Facebook"     │
│  Unverified alerts shown differently │
└──────────────────────────────────────┘
```

---

## 4. Haitian Sources to Monitor

### Telegram Channels
- Safety/security alert channels in Port-au-Prince
- Community neighborhood watch groups

### Facebook Groups
- "Info Route Haiti"
- "Alerte Securitaire Haiti"
- "Kes Ki Rive" (news groups)
- Local neighborhood groups (Petion-Ville, Delmas, Tabarre, etc.)

---

## 5. Quick Start Recommendation

Fastest path to a working prototype:

1. **Start with Telegram** using **Telethon** (Python) — the API is free and permissive
2. **Use Claude API** (Anthropic) for text processing — handles Kreyol well and outputs structured JSON reliably
3. **Deploy as a Firebase Cloud Function** on a schedule (every 10 min)
4. **Add a `source` field** to Firestore `ZoneDanger` documents
5. **Show a badge** on `AlertCard` to distinguish AI-gathered vs user-reported alerts

Start with Telegram only. Once working, add Facebook via Apify or CrowdTangle.

---

## 6. Cost Estimate

| Service | Monthly cost |
|---------|-------------|
| Claude API (Haiku for filtering, Sonnet for extraction) | ~$10-30 |
| Google Geocoding API | ~$5 (low volume) |
| OpenAI Embeddings (deduplication) | ~$2 |
| Apify Facebook scraper (if needed) | ~$50 |
| Cloud Run / Railway hosting | ~$5-10 |
| **Total** | **~$25-100/month** |

Telegram-only path: **under ~$20/month**.
