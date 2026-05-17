import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';
import he from './he.json';

const SUPPORTED = ['en', 'es', 'he'];
const RTL_LANGS = ['he'];
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

function applyDir(lang) {
  if (typeof document === 'undefined') return;
  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      he: { translation: he },
    },
    lng: detect(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnEmptyString: false,
  });

applyDir(i18n.language);
i18n.on('languageChanged', applyDir);

export function setLanguage(lang) {
  if (!SUPPORTED.includes(lang)) return;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  i18n.changeLanguage(lang);
}

export function getLanguage() {
  return i18n.language;
}

export function isRTL(lang) {
  return RTL_LANGS.includes(lang || i18n.language);
}

export const SUPPORTED_LANGS = SUPPORTED;

export default i18n;
