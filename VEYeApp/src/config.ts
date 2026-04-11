/**
 * App config. For production, use react-native-config and move these to .env.
 * See .env.example and PRODUCTION_CHECKLIST.md.
 */
import {NativeModules, Platform} from 'react-native'

const getEnv = (key: string, fallback: string): string => {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    try {
      const Config = NativeModules.RNConfig
      if (Config && typeof Config[key] === 'string') return Config[key]
    } catch (_) {}
  }
  return fallback
}

export const config = {
  GOOGLE_GEOCODING_API_KEY: getEnv(
    'GOOGLE_GEOCODING_API_KEY',
    '887pNoDaiqK3s_S90pR8DuHicSVoXmCJ_qAc8zYx3_E',
  ),
  ONESIGNAL_APP_ID: getEnv(
    'ONESIGNAL_APP_ID',
    '1766902d-eca3-4350-aaaa-bd8704a47548',
  ),
  NOTIFICATION_AUTH_TOKEN: getEnv(
    'NOTIFICATION_AUTH_TOKEN',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZHdtcmdleXp6cmxnaWllcmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAzMjA3NjgsImV4cCI6MTk5NTg5Njc2OH0.tOVwN31wE-ywaNG2eF-rgdBAtwFalZzR-1igVVeOAyE',
  ),
  NOTIFICATION_URL:
    'https://us-central1-edel-34e48.cloudfunctions.net/notification',
  PROCESS_GLOBAL_ALERT_URL:
    'https://us-central1-edel-34e48.cloudfunctions.net/processGlobalAlert',
}
