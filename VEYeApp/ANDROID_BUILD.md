# VEYe App - Android Build

## Quick Start

```bash
# Use Java 17 (required - Java 23 causes Gradle issues)
export JAVA_HOME=$(/usr/libexec/java_home -v 17)  # macOS

# 1. Add Google Maps API key (required - app crashes on launch without it)
echo "GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE" >> android/gradle.properties
# Get key: Google Cloud Console > APIs & Services > Enable "Maps SDK for Android" > Create credentials

# 2. Build APK
cd android && ./gradlew assembleDebug

# Or run on device/emulator
npm run android
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Requirements

- **Java 17** (Zulu 17 or OpenJDK 17). Java 23 is incompatible with Gradle 7.5.1.
- **Android SDK** with Platform 33, Build-Tools 33
- **Device or emulator** for `npm run android` (ensure `adb` is in PATH)
- **Google Maps API key** – react-native-maps requires it. Without it, the app crashes when the map tab loads.

## Google Maps API Key

The app uses `react-native-maps` for the map tab. Without a valid key, you get a **gray placeholder** (no tiles, no markers).

### Setup steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. **Enable billing** (required even for free tier; Maps won’t load without it)
4. Go to **APIs & Services → Library** → search for **Maps SDK for Android** → Enable
5. Go to **APIs & Services → Credentials** → **Create Credentials → API Key**
6. (Recommended) Restrict the key:
   - Application restrictions → **Android apps**
   - Add package: `tech.transitiondigitaleht.veye`
   - Add your debug SHA-1: `keytool -keystore android/app/debug.keystore -list -v` (password: `android`)
7. Add to `android/gradle.properties` (or create `gradle.properties.local` and source it):
   ```
   GOOGLE_MAPS_API_KEY=AIzaSyYourActualKeyHere
   ```
8. Rebuild: `cd android && ./gradlew clean assembleDebug`

## Fixes Applied

| Issue | Fix |
|-------|-----|
| Gradle 8.9 `serviceOf` error | Downgraded to Gradle 7.5.1 |
| Java 23 class version | Use Java 17 |
| react-native-image-picker PickVisualMedia | Added `androidx.activity:activity:1.6.1` via subprojects |
| react-native-screens C++ `graphicsConversions.h` | Disabled New Architecture (`newArchEnabled=false`) |
| App crash on launch (MapView) | Added Google Maps API key support in AndroidManifest |
