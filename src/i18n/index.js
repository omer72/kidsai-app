import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';

const SUPPORTED = ['en', 'es'];
const STORAGE_KEY = 'kidai.lang.v1';

function detect() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {}
  const nav = (typeof navigator !== 'undefined' && (navigator.language || navigator.languages?.[0])) || 'en';
  const short = nav.toLowerCase().split('-')[0];
  return SUPPORTED.includes(short) ? short : 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: detect(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnEmptyString: false,
  });

export function setLanguage(lang) {
  if (!SUPPORTED.includes(lang)) return;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  i18n.changeLanguage(lang);
}

export function getLanguage() {
  return i18n.language;
}

export const SUPPORTED_LANGS = SUPPORTED;

export default i18n;
