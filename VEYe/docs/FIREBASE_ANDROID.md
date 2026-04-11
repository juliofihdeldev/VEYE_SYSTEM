# Firebase — native `VEYe` app (`com.elitesoftwarestudio.veye`)

## `google-services.json`

The repo includes **`app/google-services.json`** with **two** Android clients:

1. **`tech.transitiondigitaleht.veye`** — React Native Android (unchanged).
2. **`com.elitesoftwarestudio.veye`** — Kotlin app.

The Kotlin client uses a **placeholder** `mobilesdk_app_id` so Gradle can merge resources. **Before relying on Auth / Firestore in production:**

1. Open [Firebase Console](https://console.firebase.google.com/) → project **edel-34e48** (or your project).
2. **Project settings → Your apps → Add app → Android** with package **`com.elitesoftwarestudio.veye`**.
3. Download the new **`google-services.json`** and replace **`app/google-services.json`** (or merge the new `client` block for `com.elitesoftwarestudio.veye` into the existing file).
4. Add the app’s **SHA-1 / SHA-256** (debug + release) for Play Services / Dynamic Links if you use them.

Until the app is registered, **anonymous sign-in may fail** at runtime; check Logcat for `AuthRepository` / `VEYeApplication`.

## What the app does today

- **Google Services** Gradle plugin + **Firebase BoM** (Auth, Firestore, Analytics). Push delivery uses **OneSignal** (see `VEYeApplication` / `README.md`); the app does not depend on `firebase-messaging` directly.
- **`AuthRepository`**: `signInAnonymously()` when there is no current user (same idea as `VEYeApp/App.tsx`).
- **`UserPreferencesRepository`**: DataStore for map session, theme, locale, radii, notifications toggle, etc. (Profile screen wired).
