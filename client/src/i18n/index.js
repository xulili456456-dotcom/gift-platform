import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';
import es from './locales/es.json';
import ja from './locales/ja.json';
import ms from './locales/ms.json';
import tr from './locales/tr.json';
import it from './locales/it.json';

const SUPPORTED = ['en', 'zh', 'es', 'ja', 'ms', 'tr', 'it'];
let savedLang = localStorage.getItem('lang') || 'en';
if (!SUPPORTED.includes(savedLang)) { savedLang = 'en'; localStorage.setItem('lang', 'en'); }

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, zh: { translation: zh }, es: { translation: es }, ja: { translation: ja }, ms: { translation: ms }, tr: { translation: tr }, it: { translation: it } },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
