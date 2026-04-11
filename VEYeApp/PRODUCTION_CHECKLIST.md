# VEYe Production Release Checklist

## Before Release

### 1. Secrets & Environment
- [ ] **Rotate any keys** that may have been committed to git history (HERE API, Supabase JWT, OneSignal)
- [ ] Ensure `.env` is in `.gitignore` (done) and never commit it
- [ ] Copy `.env.example` to `.env` and fill with production values
- [ ] Optional: Install `react-native-config` to load secrets from `.env` at build time (see [react-native-config](https://github.com/luggit/react-native-config))

### 2. Android
- [ ] Add `GOOGLE_MAPS_API_KEY` to `android/gradle.properties` for maps
- [ ] **Create a release keystore** and configure `android/app/build.gradle`:
  ```gradle
  release {
    signingConfig signingConfigs.release  // Replace debug with release
    ...
  }
  ```
- [ ] Consider enabling ProGuard: `enableProguardInReleaseBuilds = true`
- [ ] Bump `versionCode` and `versionName` in `android/app/build.gradle`

### 3. iOS
- [ ] Configure signing & provisioning for release in Xcode
- [ ] Bump `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in Xcode
- [ ] Fix location permission strings in `Info.plist` if needed (e.g. grammar: "Veye" → "VEYe")

### 4. App Store / Play Store
- [ ] Update app name, description, screenshots
- [ ] Privacy policy URL (required for Play Store)
- [ ] Test on physical devices (release build)

### 5. Firebase & OneSignal
- [ ] Verify production Firebase project and `google-services.json` / `GoogleService-Info.plist`
- [ ] Confirm OneSignal app ID and notification Cloud Function URL
- [ ] Test push notifications on release build

### 6. Build Commands
```bash
# Android release
cd android && ./gradlew assembleRelease

# iOS release (from Xcode or)
npx react-native run-ios --configuration Release
```

## Config Centralization

Secrets are centralized in `src/config.ts`. Values are read from `NativeModules.RNConfig` when using `react-native-config`, otherwise fallbacks are used. Before production, move sensitive values to `.env` and use `react-native-config` to avoid shipping them in the bundle.
