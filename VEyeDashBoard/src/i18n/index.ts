import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import moment from "moment";
import "moment/locale/fr";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ht from "./locales/ht.json";

export type AppLanguage = "fr" | "ht" | "en";

export const SUPPORTED_LANGUAGES: AppLanguage[] = ["fr", "ht", "en"];

/** UI label for each language (used by the top-bar language switcher). */
export const LANGUAGE_LABEL: Record<AppLanguage, string> = {
  fr: "FR",
  ht: "KR",
  en: "EN",
};

const STORAGE_KEY = "veye.lang";

function applyMomentLocale(lng: string) {
  const base = (lng || "fr").split("-")[0].toLowerCase();
  if (base === "en") {
    moment.locale("en");
  } else {
    // moment ships fr but no ht locale; Haitian Creole reads dates well in fr.
    moment.locale("fr");
  }
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ht: { translation: ht },
    },
    fallbackLng: "fr",
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

applyMomentLocale(i18n.language);
i18n.on("languageChanged", applyMomentLocale);

/** Cycle FR → KR → EN → FR (matches the legacy top-bar toggle order). */
export function nextLanguage(current: string): AppLanguage {
  const base = (current || "fr").split("-")[0].toLowerCase() as AppLanguage;
  if (base === "fr") return "ht";
  if (base === "ht") return "en";
  return "fr";
}

export default i18n;
