import React, { createContext, useContext, useMemo, useState } from 'react';
import { GuestLanguage, GuestTranslationKey, guestTranslations } from './guestTranslations';

const STORAGE_KEY = 'maiya-guest-language';
const initialLanguage = (): GuestLanguage => {
  if (typeof window === 'undefined') return 'bm';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'en' ? 'en' : 'bm';
};

interface LanguageContext {
  language: GuestLanguage;
  setLanguage: (language: GuestLanguage) => void;
  t: (key: GuestTranslationKey, values?: Record<string, string>) => string;
}

const Context = createContext<LanguageContext | null>(null);

export const GuestLanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [language, setStoredLanguage] = useState<GuestLanguage>(initialLanguage);
  const value = useMemo<LanguageContext>(() => ({
    language,
    setLanguage: (next) => {
      setStoredLanguage(next);
      window.localStorage.setItem(STORAGE_KEY, next);
    },
    t: (key, values = {}) => (Object.entries(values) as Array<[string, string]>).reduce(
      (text, [name, replacement]) => text.replaceAll(`{${name}}`, replacement),
      guestTranslations[language][key] as string,
    ),
  }), [language]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useGuestLanguage = () => {
  const context = useContext(Context);
  if (!context) throw new Error('Guest language context is unavailable');
  return context;
};
