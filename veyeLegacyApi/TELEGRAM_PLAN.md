# Telegram Data Collection – Development Plan

## Overview

This plan covers **Telegram channel monitoring** to collect incident information and feed it into the VEYe Firestore database. Telegram is the recommended starting point because its API is open and permissive compared to Facebook.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Firebase Cloud Function (Node.js)                        │
│  Scheduled: every 15 minutes                             │
│                                                         │
│  telegramMonitor()                                      │
│    1. Fetch new posts from configured Telegram channels │
│    2. AI pipeline: filter → extract → geocode → dedupe  │
│    3. Write to Firestore (ZoneDanger / Viktim / News)   │
│       with source: "telegram", sourceUrl, verified: false│
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  Firestore                                              │
│  - News (source, sourceUrl, title, summary, date)      │
│  - ZoneDanger (for incident alerts, future)            │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Implementation Phases

### Phase 1: Setup & Bot Configuration (Day 1)

| Task                     | Description                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Create Telegram Bot      | Use [@BotFather](https://t.me/BotFather) to create a bot, get `TELEGRAM_BOT_TOKEN` |
| Add bot to channels      | Add bot as **admin** to target Telegram channels so it receives channel posts      |
| Store config in Firebase | Use Firebase Config or `.env` for `TELEGRAM_BOT_TOKEN` and channel IDs             |
| Dependencies             | Add `telegraf` or use raw `axios` for Telegram Bot API calls                       |

### Phase 2: Scheduled Monitor Function (Day 1–2)

| Task                     | Description                                                                       |
| ------------------------ | --------------------------------------------------------------------------------- |
| Create `telegramMonitor` | Firebase scheduled function (`onSchedule`) runs every 15 minutes                  |
| Fetch channel posts      | Use Telegram Bot API: `getUpdates` or store `last_update_id` to poll new messages |
| Parse messages           | Extract: text, photo URLs, channel name, message ID, date                         |
| Write to Firestore       | Add to `News` collection with `source: "telegram"`, `sourceUrl`, `date`           |
| Deduplicate              | Check `message_id` + `channel_id` to avoid duplicate writes                       |

### Phase 3: Firestore Schema & Integration (Day 2)

| Task                | Description                                                             |
| ------------------- | ----------------------------------------------------------------------- |
| News document shape | `{ source, sourceUrl, title, summary, date, imageSource, channelName }` |
| ZoneDanger (future) | Same pattern for incident alerts; add when AI pipeline is ready         |
| VEYe app            | App already reads from `News`; show `source: "telegram"` badge          |

### Phase 4: AI Pipeline (Future)

| Task             | Description                                            |
| ---------------- | ------------------------------------------------------ |
| Relevance filter | Claude/GPT: "Is this a safety incident in Haiti?"      |
| Data extraction  | Extract incident type, location, severity, victim info |
| Geocoding        | Google Geocoding API for location → lat/lng            |
| Deduplication    | Embeddings similarity vs existing docs                 |

---

## 3. Technical Details

### Telegram Bot API

- **Endpoint**: `https://api.telegram.org/bot<TOKEN>/getUpdates`
- **Channel posts**: Bot must be admin of the channel. Posts come as `message.channel_post`
- **Pagination**: Use `offset` = last `update_id` + 1 to fetch only new updates

### Firebase Scheduled Function

```js
exports.telegramMonitor = functions
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .pubsub.schedule('every 15 minutes')
  .onRun(async (context) => { ... });
```

### HTTP Trigger for Testing

- `telegramMonitorRun` – Call this endpoint to run the monitor immediately without waiting for the schedule.
- URL: `https://<region>-<project>.cloudfunctions.net/telegramMonitorRun`

### Environment Variables

| Variable               | Description                           | Where                                                      |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`   | From BotFather                        | `firebase functions:config:set telegram.bot_token=""`      |
| `TELEGRAM_CHANNEL_IDS` | Optional, comma-separated channel IDs | `firebase functions:config:set telegram.channel_ids="..."` |

### Firestore `News` Document (Telegram)

```json
{
	"source": "telegram",
	"sourceUrl": "https://t.me/channel_name/123",
	"channelName": "Alerte Securite Haiti",
	"title": "Post headline or first 100 chars",
	"summary": "Full message text",
	"imageSource": "https://api.telegram.org/...",
	"date": "Firestore Timestamp",
	"telegramMessageId": 12345,
	"telegramChannelId": -1001234567890
}
```

---

## 4. Files to Create/Modify

| File                                           | Action                                                     |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `veyeLegacyApi/TELEGRAM_PLAN.md`             | Create (this file)                                         |
| `veyeLegacyApi/functions/telegramMonitor.js` | Create – monitor logic + `telegramMonitorRun` HTTP trigger |
| `veyeLegacyApi/functions/index.js`           | Modify – export `telegramMonitor`, `telegramMonitorRun`    |
| `veyeLegacyApi/functions/package.json`       | Add `telegraf` or keep axios                               |
| `veyeLegacyApi/functions/.env.example`       | Create – document required env vars                        |

---

## 5. Channel IDs to Monitor (Haiti)

- Security/alert channels in Port-au-Prince
- Community watch groups
- _Configure after bot is created and added to channels_

To get a channel ID: add [@userinfobot](https://t.me/userinfobot) to the channel and it will show the ID.

---

## 6. Cost Estimate (Telegram-Only)

| Service             | Cost                             |
| ------------------- | -------------------------------- |
| Firebase Blaze plan | Required for scheduled functions |
| Telegram API        | Free                             |
| Firestore writes    | Minimal (~$0.20/100k)            |
| **Phase 1–3**       | **~$0–5/month**                  |

---

## 7. Blaze Plan Required

Scheduled functions require the Firebase **Blaze** (pay-as-you-go) plan. Usage for this monitor is typically within the free tier.

## 8. Quick Start Checklist

- [ ] Ensure Firebase project is on Blaze plan
- [ ] Create Telegram bot via BotFather
- [ ] Add bot as admin to 1–2 test channels
- [ ] Create `telegramMonitor` scheduled function
- [ ] Add `TELEGRAM_BOT_TOKEN` to Firebase config
- [ ] Deploy and verify posts appear in Firestore `News`
- [ ] Add source badge in VEYe app for `source: "telegram"`

## Manual run (HTTP + dashboard)

- **VEye Dashboard:** after login, open **Telegram** in the sidebar (`/telegram`) and click *Lancer le moniteur Telegram*.
- **curl** (requires `x-veye-secret` if `PROCESS_ALERT_SECRET` is set on the function):

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-veye-secret: YOUR_PROCESS_ALERT_SECRET" \
  "https://us-central1-edel-34e48.cloudfunctions.net/telegramMonitorRun"
```

The HTTP handler sends **CORS** headers so the dashboard can call it from the browser.

```bash
firebase functions:log
```
