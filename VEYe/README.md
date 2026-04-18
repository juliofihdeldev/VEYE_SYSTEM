# VEYe (Android — Kotlin)

Native Android port of **VEYe** per `VEYeApp/docs/android-kotlin-porting-plan.md`.

## Requirements

- Android Studio (recent stable) with JDK **17**
- Android SDK **36** (`compileSdk` / `targetSdk` in `app/build.gradle.kts`)

AGP **9** uses built-in Kotlin; the project sets `android.disallowKotlinSourceSets=false` in `gradle.properties` so **KSP** (Hilt) can register generated sources (experimental flag; see Android Gradle release notes).

## Run

1. Open the **`VEYe/`** directory in Android Studio.
2. Sync Gradle.
3. Run the **`app`** configuration on an emulator or device.

## Phase 0–5a status (current)

- [x] Jetpack Compose + Material 3 + edge-to-edge `MainActivity`
- [x] Hilt (`VEYeApplication`, `@AndroidEntryPoint` activity)
- [x] Navigation Compose + bottom bar (Map, Alerts, Report, Zones, Profile)
- [x] **Map tab** — Google Maps Compose, Haiti default camera, time segment chips (Live / 7d / All; **All** default); **PostgREST** `zone_danger` + **Realtime** postgres changes (with migration **`20260412140000_…`**) + **`viktim`** kidnaping query (refresh); **clustered** disc markers + pulse (RN parity); **heatmap** (default **on**); **3D** + **Satellite/Hybrid**; **danger bearing** polyline (~5 km); **Fused Location** + DataStore **radius** + user **circle**; **BottomSheetScaffold** + nearby list; **victim** `AlertDialog`; **zone** tap opens full-screen **DangerZoneDetailModal** (hybrid map + `VeyeComments` thread `zone:{id}`)
- [x] **Alerts tab** — map + clustered **Viktim** pins (green when `status == Libérer`), heatmap / satellite FABs, user radius; filter chips + pull-to-refresh sheet list (**Coil** images); full-screen **detail** (share, dial **114**, **Report** tab, hybrid mini-map); **VeyeComments** thread `alert:{id}` (RN `alertCommentsThreadId` parity)
- [x] **Report tab** — types, coords from DataStore map session, camera (**FileProvider**) + photo picker (≤4), victim name when **missing**, description / phone / anonymous; **block banner** from Edge **`get-user-moderation`** (polls Postgres `user_moderations` ~every **15 min**); **Supabase Edge** `process-global-alert` via **`supabase.functions.invoke`** (same Supabase URL/anon as the rest of the app); optional **`PROCESS_ALERT_SECRET`** in `local.properties` → `x-veye-secret` when Edge expects it; **PendingReport** strip on **Zones**; thank-you → **Zones** tab; prefill from alert detail
- [x] **Zones tab** — same map stack (zones-only markers), floating header + legend + controls, draggable sheet list; zone list updates via **Realtime** on **`zone_danger`**; row actions **comment** / **flag false** via Edge **`process-demanti`**; **DangerZoneDetailModal** for comments (**Realtime** on **`veye_comments`** for the thread) + satellite map
- [x] Locales: **en** (default), **fr**, **ht** (tabs + map + zones + comments + demanti strings)
- [x] **Firebase** — Google Services plugin, BoM, **Auth** + **Analytics** only (no Firestore in Kotlin data layer; FCM is **OneSignal**); anonymous sign-in on startup (see `docs/FIREBASE_ANDROID.md`)
- [x] **DataStore** — `UserPreferencesRepository` (map coords + **alert radius** + **notification radius** + **notifications enabled** + **locale** + `theme_mode`; Profile screen wired; cold-start locale via `Application` + `AppCompatDelegate`)
- [x] **Profile tab** — RN parity: notifications (**POST_NOTIFICATIONS** on API 33+), dark theme, language (en/fr/ht), radii + Edge **`process-user-merge`** → Postgres **`users`** (with optional **`PROCESS_ALERT_SECRET`**), FAQ (eight items, en/fr/ht), privacy and about links, share, logout → new anonymous session + **OneSignal** re-login + device id sync
- [x] **OneSignal (5b)** — SDK init in `VEYeApplication`; OneSignal user id → Postgres **`users.device_token`** via **`process-user-merge`**; notification open reads `target_tab` from `additionalData` (RN parity); set **`ONESIGNAL_APP_ID`** in `VEYe/local.properties` (optional; default matches RN)
- [x] **ProGuard** — `proguard-rules.pro` stubs for Firebase / OkHttp / coroutines (release minify still disabled in `build.gradle.kts` until you enable it)

### Google Maps API key

Set **`GOOGLE_MAPS_API_KEY`** in **`VEYe/local.properties`** (or export it in the environment before Gradle sync/build), same idea as `VEYeApp/android/app/build.gradle`. Use **`KEY=your_key_here` with no quotes** — quotes are stripped by Gradle, but older setups could end up with a key that still contained `"` and broke the manifest. The app injects it via `manifestPlaceholders` into `com.google.android.geo.API_KEY`. Without a key, tiles may not load (blank beige map). Ensure **Maps SDK for Android** is enabled and the **debug SHA-1** for `com.elitesoftwarestudio.veye` is allowed on that key in Google Cloud.

## Firebase

See **`docs/FIREBASE_ANDROID.md`** for `google-services.json`, registering **`com.elitesoftwarestudio.veye`** in the Firebase project, and SHA fingerprints.

Do **not** commit production secrets if the repo is public.

## Versioning

`versionCode` / `versionName` live in `app/build.gradle.kts`. Align with release process and Play Console.

RUn the app local

cd VEYe && ./gradlew --stop && ./gradlew clean assembleDebug

~/Library/Android/sdk/platform-tools/adb shell am start -n com.elitesoftwarestudio.veye/.MainActivity
