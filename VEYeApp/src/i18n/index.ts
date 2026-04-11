import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'

import en from './locales/en.json'
import fr from './locales/fr.json'
import ht from './locales/ht.json'

const LANGUAGE_KEY = '@veye_language'

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: (callback: (lang: string) => void) => {
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then(lang => callback(lang || 'fr'))
      .catch(() => callback('fr'))
  },
  init: () => {},
  cacheUserLanguage: (lang: string) => {
    AsyncStorage.setItem(LANGUAGE_KEY, lang)
  },
}

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {en: {translation: en}, fr: {translation: fr}, ht: {translation: ht}},
    fallbackLng: 'fr',
    interpolation: {escapeValue: false},
    react: {useSuspense: false},
  })

export default i18n
