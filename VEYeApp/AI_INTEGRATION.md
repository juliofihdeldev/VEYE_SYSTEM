# VEYe - AI Integration Plan

## Overview

This document outlines concrete AI integration points for the VEYe safety app. Each section maps to specific files, Firestore collections, and implementation details.

---

## 1. Auto-Classification of Incident Reports

**Goal:** Automatically classify the incident type from the user's description text instead of relying solely on manual selection.

**Where it plugs in:**
- `src/screens/main/ReportIncident.tsx` — after the user types a description, suggest an incident type
- `src/context/AlertContext.tsx` → `handleSendAlert()` — validate/override classification before saving

**Firestore collections:** `ZoneDanger`

**Implementation:**

```
User types description
       ↓
On blur or after 50+ chars, call AI classify endpoint
       ↓
POST /api/classify-incident
Body: { text: "yo te tande tire bò mache a..." }
       ↓
Response: { type: "shooting", confidence: 0.92 }
       ↓
Auto-select the type chip, show confidence badge
User can override before submitting
```

**Model options:**
- Firebase ML Kit custom text classifier (on-device, offline capable)
- Cloud function calling OpenAI / Claude API for classification
- Fine-tuned lightweight model on Haitian Creole + French incident reports

**Training data source:** Existing `ZoneDanger` collection — the `rezon` field contains `[type] description` format that can be parsed into labeled training pairs.

---

## 2. Duplicate Report Detection

**Goal:** When a user submits a report, detect if a similar incident was already reported nearby within a recent time window.

**Where it plugs in:**
- `src/context/AlertContext.tsx` → `handleSendAlert()` — before writing to Firestore
- `src/context/AlertContext.tsx` → `handleCollectKidnaping()` — same check

**Firestore collections:** `ZoneDanger`, `KidnapingAlert`

**Implementation:**

```
User submits report (lat, lng, description, type)
       ↓
Cloud Function triggered
       ↓
Query Firestore: same city, last 6 hours, within 1km radius
       ↓
For each candidate:
  - Compute text similarity (cosine similarity on embeddings)
  - Compute distance (Haversine — reuse src/utils/distance.ts logic)
  - Score = 0.6 * textSimilarity + 0.4 * (1 - distanceNormalized)
       ↓
If score > 0.75:
  → Return: "Similar incident already reported 23 min ago"
  → Offer: "Add your report as confirmation" (increment mantiCount)
Else:
  → Create new report
```

**Key files to modify:**
- `src/utils/distance.ts` — already has `getDistanceKm()`, reusable server-side
- New: `functions/deduplication.ts` — Firebase Cloud Function

---

## 3. Image Analysis on Uploaded Photos

**Goal:** Analyze photos attached to incident reports for safety, content extraction, and auto-tagging.

**Where it plugs in:**
- `src/screens/main/ReportIncident.tsx` — after photo selection (camera/gallery)
- Currently uses `react-native-image-picker` with up to 4 photos

**Implementation:**

### 3a. Face Detection & Auto-Blur
```
Photo selected via launchCamera / launchImageLibrary
       ↓
Firebase ML Kit Vision (on-device)
  → Detect faces
  → Apply Gaussian blur to face regions
  → Save blurred version for public display
  → Keep original for law enforcement (role-gated access)
```

### 3b. Content Moderation
```
Photo uploaded
       ↓
Cloud Vision SafeSearch or OpenAI moderation
  → Flag: violence, explicit, medical
  → If flagged: add warning overlay before display in AlertCard
```

### 3c. OCR for Evidence
```
Photo uploaded
       ↓
Firebase ML Kit Text Recognition
  → Extract license plates, street signs, building names
  → Auto-populate location field or add as metadata
```

**Key files to modify:**
- `src/screens/main/ReportIncident.tsx` — add processing step after `handleTakePhoto()` / `handlePickFromLibrary()`
- `src/components/AlertCard.tsx` — add blur/warning overlay for flagged images
- New: `src/utils/imageAnalysis.ts`

---

## 4. Predictive Danger Heatmap

**Goal:** Enhance the existing heatmap (`src/utils/heatmap.ts`) with time-aware prediction instead of only showing current incidents.

**Where it plugs in:**
- `src/utils/heatmap.ts` — currently uses `buildHeatSpots()` with simple grid clustering
- `src/screens/main/MapDashboard.tsx` — passes `heatmapPoints` to `MapPlaceholder`
- `src/screens/main/DangerZones.tsx` — computes heatSpots from `filteredZones`

**Implementation:**

```
Collect historical data:
  ZoneDanger documents with (latitude, longitude, date, rezon)
       ↓
Feature extraction per grid cell:
  - Incident count (last 7d, 30d, 90d)
  - Time-of-day distribution
  - Incident type distribution
  - Recency weighting (exponential decay)
       ↓
Simple scoring model (no ML needed initially):
  riskScore = w1 * recent7d + w2 * recent30d + w3 * timeOfDayFactor
       ↓
Enhanced buildHeatSpots() returns predicted risk zones
even where no current incidents exist
```

**Evolution path:**
1. **Phase 1** (current): Static clustering of existing incidents ✅
2. **Phase 2**: Time-weighted scoring with recency decay
3. **Phase 3**: ML model trained on historical patterns (seasonal, day-of-week)

---

## 5. Smart Notification Relevance

**Goal:** Score alert relevance per user instead of broadcasting to everyone.

**Where it plugs in:**
- `src/context/AlertContext.tsx` → `handleSendALertNotification()` — currently sends blanket notification to Cloud Function
- Cloud Function at `https://us-central1-edel-34e48.cloudfunctions.net/notification`

**Implementation:**

```
New incident created
       ↓
Cloud Function: for each user with push token
       ↓
Compute relevance score:
  - Distance from user's saved location (Users collection)
  - User's radiusKm preference (now stored in Firestore + AsyncStorage)
  - Incident severity
  - User's past interaction patterns
       ↓
If distance > user.radiusKm → skip
If score < threshold → queue for digest notification (batch)
If score > threshold → send immediately with priority
```

**Key files:**
- `src/context/UserContext.tsx` — `radiusKm` already persisted to Firestore
- Cloud Function needs access to `Users` collection to read preferences

---

## 6. Natural Language Translation of User Content

**Goal:** Auto-translate user-generated descriptions between Kreyòl, French, and English.

**Where it plugs in:**
- `src/components/AlertCard.tsx` — description display
- `src/screens/main/AlertDetails.tsx` — full alert details
- `src/screens/main/DangerZones.tsx` — zone card descriptions

**Implementation:**

```
Alert loaded with description in original language
       ↓
Detect language (short text classifier)
       ↓
If language ≠ user's i18n.language:
  Show "Translate" button
       ↓
On tap: call translation API
  → Cache result in Firestore subcollection: ZoneDanger/{id}/translations/{lang}
  → Display translated text with "Translated from Kreyòl" label
```

**Note:** Haitian Creole is low-resource for most translation APIs. Options:
- Google Cloud Translation (has Haitian Creole support)
- Fine-tuned model for HT↔FR↔EN specifically
- Community-contributed translation corrections

---

## 7. Anti-Fraud: Coordinated Denial Detection

**Goal:** Detect when multiple accounts coordinate to deny/discredit legitimate alerts.

**Where it plugs in:**
- `src/context/AlertContext.tsx` → `konfimeManti()` — currently writes to `DemantiAlert` collection

**Firestore collections:** `DemantiAlert`, `ZoneDanger`

**Implementation:**

```
User denies an alert (konfimeManti)
       ↓
Cloud Function trigger on DemantiAlert write
       ↓
Analyze denial pattern:
  - How many denials in last 30 min for this alert?
  - Are denying users newly created accounts?
  - Do denying users share IP/device fingerprint?
  - Have these users denied other verified alerts before?
       ↓
If anomaly score > threshold:
  → Flag denials as suspicious
  → Do NOT increment mantiCount
  → Alert moderators
```

---

## 8. AI-Powered SOS Assistant

**Goal:** When user taps the SOS button, provide an AI chat assistant for emergency guidance.

**Where it plugs in:**
- `src/components/ModernHeader.tsx` — SOS badge (currently no action)
- `src/screens/main/MapDashboard.tsx` — SOS button in floating header

**Implementation:**

```
User taps SOS
       ↓
Open modal with AI chat interface
       ↓
System prompt includes:
  - User's current location
  - Nearby active alerts
  - Local emergency numbers (Haiti: 114, 122, 116)
       ↓
AI provides:
  - Step-by-step safety instructions
  - Nearest safe locations
  - One-tap emergency call buttons
  - Auto-creates incident report from conversation
```

---

## Architecture: Recommended AI Service Layer

```
┌─────────────────────────────────────────┐
│              React Native App            │
│                                          │
│  ReportIncident ─→ classify, deduplicate │
│  AlertCard      ─→ translate, moderate   │
│  MapDashboard   ─→ predictive heatmap    │
│  ModernHeader   ─→ SOS assistant         │
│  AlertContext   ─→ smart notifications   │
└────────────────────┬────────────────────┘
                     │ HTTPS / Firebase SDK
                     ▼
┌─────────────────────────────────────────┐
│         Firebase Cloud Functions         │
│                                          │
│  /classify-incident    (text → type)     │
│  /deduplicate          (similarity)      │
│  /analyze-image        (vision)          │
│  /translate            (HT↔FR↔EN)       │
│  /predict-risk         (heatmap scoring) │
│  /smart-notify         (relevance)       │
│  /detect-fraud         (anti-denial)     │
│  /sos-chat             (assistant)       │
└────────────────────┬────────────────────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
    ┌──────────┐ ┌────────┐ ┌────────────┐
    │ OpenAI / │ │Firebase│ │  Google     │
    │ Claude   │ │ ML Kit │ │  Cloud      │
    │ API      │ │(device)│ │  Vision/NLP │
    └──────────┘ └────────┘ └────────────┘
```

---

## Priority Roadmap

| Phase | Feature | Effort | Impact | Dependencies |
|-------|---------|--------|--------|-------------|
| **1** | Auto-classification | Medium | High | Cloud Function + API key |
| **1** | Duplicate detection | Medium | High | Cloud Function |
| **2** | Face blur on photos | Low | Critical | Firebase ML Kit Vision |
| **2** | Content moderation | Low | High | Cloud Vision API |
| **2** | Smart notifications | Medium | High | Modify existing Cloud Function |
| **3** | Predictive heatmap | High | High | Historical data pipeline |
| **3** | Content translation | Medium | Medium | Translation API |
| **4** | SOS AI assistant | High | High | Chat UI + LLM API |
| **4** | Anti-fraud detection | High | Medium | Analytics pipeline |

---

## Environment Variables Needed

```env
# AI Service Keys (add to Firebase Functions config)
OPENAI_API_KEY=sk-...
GOOGLE_CLOUD_VISION_KEY=...
GOOGLE_TRANSLATE_KEY=...

# Feature Flags
AI_CLASSIFY_ENABLED=true
AI_DEDUPLICATE_ENABLED=true
AI_IMAGE_ANALYSIS_ENABLED=true
AI_TRANSLATE_ENABLED=false
AI_PREDICTIVE_HEATMAP_ENABLED=false
AI_SOS_ASSISTANT_ENABLED=false
```

---

## Getting Started

1. Set up Firebase Cloud Functions in the project (`firebase init functions`)
2. Add API keys to Firebase config (`firebase functions:config:set openai.key="sk-..."`)
3. Start with Phase 1: auto-classification and duplicate detection
4. Add Firebase ML Kit to `package.json` for on-device image analysis
5. Incrementally enable features via feature flags
