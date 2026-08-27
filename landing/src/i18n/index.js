import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh.json';
import en from './locales/en.json';
import es from './locales/es.json';
import ja from './locales/ja.json';
import vi from './locales/vi.json';

const savedLang = localStorage.getItem('lang') || 'en';

i18n.use(initReactI18next).init({
  resources: { zh: { translation: zh }, en: { translation: en }, es: { translation: es }, ja: { translation: ja }, vi: { translation: vi } },
  lng: savedLang,
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
});

export default i18n;
