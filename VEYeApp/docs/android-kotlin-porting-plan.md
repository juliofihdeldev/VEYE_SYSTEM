# VEYe Android porting plan — **Option A: Android-only Kotlin**

This document describes how to rebuild the **VEYe** mobile experience as a **native Android application** in **Kotlin**, developed in **Android Studio**. The existing **iOS** app (React Native) is **out of scope** for this port; it can continue on RN or be addressed separately.

**Source of truth today:** `VEYeApp/` (React Native 0.84). The RN Android app uses `tech.transitiondigitaleht.veye`; the **Kotlin port** uses **`com.elitesoftwarestudio.veye`** (see §3).

---

## 1. Objectives

| Goal | Detail |
|------|--------|
| **Platform** | Single high-quality Android app, Play-distributable AAB/APK |
| **Parity** | Match critical user journeys and backend contracts of current RN app |
| **Maintainability** | Clear modules, Kotlin idioms, testable layers |
| **No shared iOS code** | No Kotlin Multiplatform requirement for v1 |
| **Handset-only UI** | No tablet- or large-screen-specific layouts (see §1.1) |

### 1.1 Explicitly out of scope (tablet / large screens)

The native Android app **does not** implement tablet parity with the React Native **iPad sidebar** (`IPadSidebar`), navigation rail, two-pane master–detail, or other **sw600dp+**-specific UX. **Scope is phone form factor only:** same bottom-tab shell on all device sizes (tablets may see the phone layout with standard window sizing—no bespoke large-screen design work in v1).

---

## 2. Current app inventory (RN → native mapping)

### 2.1 Navigation

- **Bottom tabs:** Map, Alerts, Report (center FAB), Danger Zones, Profile (same pattern on all supported devices; no sidebar or rail variant).

### 2.2 Main screens (parity checklist)

| RN screen | Kotlin target | Notes |
|-----------|---------------|--------|
| `MapDashboard.tsx` | `Map` feature | Google Map, time segment (Live / 7d / All), heatmap, 3D/satellite toggles, clustering, danger bearing line, victim/zone markers |
| `AlertsList.tsx` | `Alerts` feature | List/detail flows, FlashList-like performance → `LazyColumn` + stable keys |
| `AlertDetails.tsx` | Stack destination | Comments modal (`InstagramCommentsModal` pattern) |
| `ReportIncident.tsx` | `Report` feature | Types, location, image picker, submit, **blocked user** tab behavior |
| `DangerZones.tsx` | `Zones` feature | Sheet + list, swipe actions, map controls, `DangerZoneDetailModal` (map + sheet + comments) |
| `Profile.tsx` | `Profile` feature | Preferences, radius, theme, version string, FAQ link |
| `FAQ.tsx` | `Profile` or `Content` | Static / WebView / Compose text |

### 2.3 Cross-cutting (RN → Android)

| Capability | RN dependency | Android approach |
|------------|---------------|------------------|
| Auth | `@react-native-firebase/auth` | Firebase Auth Android SDK (anonymous + any existing flows) |
| Database | Firestore | Firebase Firestore KTX + Flow/coroutines |
| Push | FCM + `@react-native-firebase/messaging`, OneSignal, Notifee | **OneSignal** Android SDK only (parity with RN `deviceToken` on `Users/{uid}`); FCM remains under the hood for OneSignal / Firebase project setup |
| Analytics | Firebase Analytics | Firebase Analytics Android |
| Maps | `react-native-maps`, Supercluster | Maps SDK + clustering lib (e.g. Maps Utils) or port clustering logic |
| Geolocation | `@react-native-community/geolocation` | Fused Location Provider |
| Network state | NetInfo | `ConnectivityManager` + Flow |
| Local prefs | AsyncStorage | DataStore |
| HTTP | axios | OkHttp + Retrofit (only if REST beyond Firebase) |
| i18n | i18next (en, fr, ht) | Android **string resources** per locale + `values-fr/`, `values-ht/` (or equivalent) |
| Theming | ThemeContext | Material 3 light/dark, `DynamicColor` optional |
| Icons | vector-icons / SVG | Material Icons Extended / Compose vector assets |

### 2.4 Domain-specific logic to reimplement or copy

- `utils/dangerZoneTimeFilter.ts`, `heatmap.ts`, `dangerProximity.ts`, `dangerZoneMapIcon.ts`  
- `utils/commentsStorage.ts` (thread IDs, likes, nesting) — **must** match Firestore/local schema so RN and Kotlin can coexist during migration if needed.

---

## 3. Recommended Android stack (v1)

| Layer | Choice |
|-------|--------|
| Language | **Kotlin** |
| UI | **Jetpack Compose** + Material 3 |
| Navigation | **Navigation Compose** (single-`Activity`) |
| Architecture | **MVVM** (ViewModel + UiState) or **MVI** for complex map flows |
| DI | **Hilt** |
| Async | **Coroutines** + **StateFlow** / **SharedFlow** |
| Image loading | **Coil** |
| Maps | **Google Maps SDK for Android** |
| Firebase BOM | Align versions; use **KTX** artifacts where available |

**Min/target SDK:** Follow Play requirements; match or exceed current RN `android` module.

**Application ID:** Use **`com.elitesoftwarestudio.veye`** for the Kotlin app (`namespace` + `applicationId` in Gradle). This differs from the RN Android ID—plan Play Console (new listing vs transfer) and signing keys accordingly.

---

## 4. Repository and module layout

**Native Android project:** **`VEYe/`** at the monorepo root (sibling to `VEYeApp/`) — the app already created in Android Studio under that name. **Do not** fold this work into the React Native tree (`VEYeApp/android/`); keep the Kotlin app as its own Gradle project.

Suggested Gradle modules (introduce as the app grows):

```
:app                 # Application, navigation graph, Hilt entry
:core:ui             # Theme, components, strings
:core:data           # Firebase, DTOs, repositories
:core:model          # Shared models
:feature:map
:feature:alerts
:feature:report
:feature:zones
:feature:profile
```

Start with **`:app` + `:core:*`** and split features when boundaries are clear.

---

## 5. Phased delivery

### Implementation status (living)

| Phase | Status |
|-------|--------|
| **0–1** (Compose, Hilt, bottom tabs, locales, Firebase + DataStore prefs) | **Done** — see `VEYe/README.md`, `VEYe/docs/FIREBASE_ANDROID.md`, `./gradlew :app:assembleDebug` |
| **2** (Map + zones) | **Done** — Map + Zones tabs: clustering, heatmap, bearing, zone detail modal (hybrid map + Firestore `VeyeComments` via `zone:{id}`), demanti / flag-false flow (`DemantiAlert` + zone increment). **PendingReport** strip on Zones list shipped with Phase 4. |
| **3** (Alerts + details) | **Done** — Alerts tab: full-screen map + draggable sheet, `Viktim` queries (filters All / Kidnaping / Missing / Released / Shooting), heatmap + satellite, radius circle; list cards with share; full-screen detail (image, fields, hybrid mini-map, share, navigate-to-Report, emergency dial **114**); comments via `VeyeComments` thread `alert:{id}` (RN `alertCommentsThreadId` parity). |
| **4** (Report incident) | **Done** — Report tab: incident types, location from map session (coords), camera + gallery (max 4), missing-person name field, description, phone + anonymous toggle; **UserModerations** banner + disabled submit when blocked; POST JSON to `processGlobalAlert` (override URL via `local.properties` `PROCESS_GLOBAL_ALERT_URL`); **403** `user_blocked` dialog; **PendingReportRepository** queue + Zones list cards; thank-you → navigate **Zones**; prefill from **Alerts** detail (`ReportPrefillRepository`). |
| **5a** (Profile/FAQ polish + push plumbing) | **Done** — `POST_NOTIFICATIONS` (API 33+); **MainActivity** `singleTop` + `PushNavigationStore` for pending tab from notification opens / intents. **Profile**: notifications toggle + permission flow, dark theme (DataStore → `MainActivity` / `VEYeTheme`), language **en**/**fr**/**ht** + `AppCompatDelegate` + recreate, alert + notification radius (presets + custom 1–500 km) + Firestore merge like RN, FAQ full-screen dialog (localized), privacy/about URLs, share, logout → anonymous re-auth. **ProGuard** rules file expanded (minify still off by default). |
| **5b** (OneSignal) | **Done** — OneSignal SDK **5.6.x** in `VEYeApplication` + `OneSignalPushCoordinator` (click + permission + user-state listeners); Firestore **`deviceToken`** (+ `userId`) on `Users/{uid}` using `OneSignal.User.onesignalId`; `target_tab` in notification `additionalData` (and optional nested `custom`) routes tabs like RN; **`ONESIGNAL_APP_ID`** in `VEYe/local.properties` (optional default matches RN). No app-level `FirebaseMessagingService` / `fcmToken` field. |

### Phase 0 — Foundation (1–2 weeks)

- Use existing **`VEYe/`** project in Android Studio; Git + CI stub (optional: GitHub Actions `assembleDebug` from `VEYe/`)
- Hilt, Compose, Navigation, Material theme (light/dark)
- Firebase project linked (`google-services.json`), Google Services plugin, BoM; anonymous Auth on launch (register `com.elitesoftwarestudio.veye` in console — see `VEYe/docs/FIREBASE_ANDROID.md`)
- DataStore for theme/locale (`UserPreferencesRepository`); string resources **en** / **fr** / **ht** for tabs
- Splash / branded launch (match policy)

**Exit:** App launches, signs in anonymously (if required), reads one Firestore collection.

### Phase 1 — Shell + tabs (1 week)

- Bottom navigation: Map, Alerts, Report, Zones, Profile (match tab order and Report FAB behavior)
- Blocked-user handling on Report tab (parity with `UserContext` / `blocked.*` strings)

**Exit:** All tabs reachable; placeholders where needed.

### Phase 2 — Map + zones (2–4 weeks)

- Map dashboard: region, user location, radius circle, markers, segment control default **All** (current product default)
- Clustering / heatmap / bearing polyline per acceptance criteria
- Danger Zones: full-screen map + bottom sheet list; detail flow = **native** equivalent of `DangerZoneDetailModal` (sheet + satellite map + comments)

**Exit:** Zones and map usable end-to-end against production Firebase (staging project recommended first).

### Phase 3 — Alerts + details (1–2 weeks)

- Alerts list, pagination/caching as needed, `AlertDetails` + comment thread UI

**Exit:** Read path complete; share deep links if RN had them.

### Phase 4 — Report incident (1–2 weeks)

- Incident types, permissions (camera, location), image capture, submit to same backend as RN

**Exit:** Successful report creates same Firestore shape as RN.

### Phase 5 — Push + polish (1–2 weeks)

- **OneSignal** (parity with RN `deviceToken`); tab routing on notification open
- Small icon (`onesignal_small_icon_default`), permission flow, open-action routing
- ProGuard/R8 rules, leak checks on map screens, accessibility pass

**Exit:** Internal testing track ready.

### Phase 6 — Release

- Play Console: AAB, signing, release notes, staged rollout
- Deprecate RN Android build after cutover (keep RN for iOS until iOS plan exists)

*Durations assume one experienced Android developer; scale linearly with team size.*

---

## 6. Migration and coexistence

| Strategy | Description |
|----------|-------------|
| **Parallel apps** | New Kotlin app uses same Firebase backend; RN Android stays in store until Kotlin reaches parity |
| **Same applicationId** | Enables in-place update **only** if signing key matches Play app |
| **Data** | No migration for server data; **local** comments/cache must match keys (`commentsStorage` thread IDs) if both clients run during transition |

---

## 7. Testing strategy

- **Unit tests:** ViewModels, time filters, comment flattening, mappers  
- **Instrumented:** Critical flows on emulator + one physical device  
- **Map:** Manual matrix (zoom, rotation, dark mode, low connectivity)  
- **Parity QA:** Script derived from section 2.2 (checkbox per screen)

---

## 8. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Map behavior differs from RN | Written acceptance criteria; compare screenshots + GPS fixtures |
| Firebase rules assume RN only | Review rules; no client-only security |
| Double push (FCM + OneSignal) | **Mitigated for Kotlin** — app uses **OneSignal only** (no parallel `FirebaseMessagingService`) |
| Scope creep | Freeze “v1 parity” list; backlog everything else |
| Haiti / location edge cases | Test with mock locations and permission denial flows |
| Users on tablets expect iPad-like UI | Document handset-only scope; defer large-screen UX to a future phase if needed |

---

## 9. Deliverables checklist (definition of done for v1)

- [ ] Play-ready **release** AAB with correct `versionCode` / `versionName` policy  
- [ ] Parity sign-off on tabs + report + zones detail + alerts + profile + FAQ (**phone UI**; tablet-specific RN behavior not required)  
- [ ] Locales **en**, **fr**, **ht** for user-visible strings  
- [ ] Dark mode consistent with product  
- [ ] README: clone, JDK, `local.properties` (Maps + secrets), `./gradlew assembleRelease`  
- [ ] Internal / closed testing completed  

---

## 10. Document maintenance

- **Owner:** Assign a single DRI for the port.  
- **Update this file** when phases slip, scope changes, or Firebase/OneSignal strategy changes.  
- **Reference RN files** when filing parity bugs (path + screen name).

---

*Last updated: handset-only scope; native tree `VEYe/`; aligned with `VEYeApp` RN dependencies and bottom-tab navigation.*
