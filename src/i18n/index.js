import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from '../locales/en.json';
import amTranslation from '../locales/am.json';

const resources = {
  en: {
    translation: enTranslation,
  },
  am: {
    translation: amTranslation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'am'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'birrend_language',
      caches: ['localStorage'],
    },
  });

// Keep document language and root class in sync with selected language
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  if (lng === 'am') {
    document.documentElement.classList.add('lang-am');
  } else {
    document.documentElement.classList.remove('lang-am');
  }
});

// Set initial html lang attribute
if (typeof document !== 'undefined') {
  const currentLang = i18n.language || 'en';
  document.documentElement.lang = currentLang;
  if (currentLang.startsWith('am')) {
    document.documentElement.classList.add('lang-am');
  }
}

export default i18n;
