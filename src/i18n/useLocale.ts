import { useCallback, useState } from 'react';
import { MESSAGES, type Locale, type Messages } from './messages';

export const LOCALE_STORAGE_KEY = 'leobog-locale';

const TRADITIONAL_ZH_RE = /^zh-(hant|tw|hk|mo)\b/i;

export function detectInitialLocale(): Locale {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved === 'zh-TW' || saved === 'en') {
        return saved;
      }
    } catch {
      // Ignore storage access errors in restricted contexts.
    }
  }

  if (typeof navigator !== 'undefined') {
    const lang = navigator.language || navigator.languages?.[0] || '';
    if (TRADITIONAL_ZH_RE.test(lang)) {
      return 'zh-TW';
    }
  }

  return 'en';
}

export interface UseLocaleResult {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: Messages;
}

export function useLocale(): UseLocaleResult {
  const [locale, setLocaleState] = useState<Locale>(() => detectInitialLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        // Ignore storage write errors.
      }
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'zh-TW' ? 'en' : 'zh-TW');
  }, [locale, setLocale]);

  return {
    locale,
    setLocale,
    toggleLocale,
    t: MESSAGES[locale],
  };
}
