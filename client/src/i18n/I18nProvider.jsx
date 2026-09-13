import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { setApiLanguage } from '../api/client.js';
import { DEFAULT_LANGUAGE, normalizeLanguage, translate } from './messages.js';
import { I18nContext } from './context.js';

const STORAGE_KEY = 'medguide.language';

function savedLanguage() {
  try {
    return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(savedLanguage);

  useLayoutEffect(() => {
    setApiLanguage(language);
    document.documentElement.lang = language === 'bn' ? 'bn' : 'en';
  }, [language]);

  const setLanguage = useCallback((nextLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    setApiLanguage(normalized);
    setLanguageState(normalized);
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // The language still changes for this page when browser storage is unavailable.
    }
  }, []);

  const t = useCallback((key, parameters) => translate(language, key, parameters), [language]);
  const value = useMemo(
    () => ({
      language,
      locale: language === 'bn' ? 'bn-BD' : 'en-US',
      setLanguage,
      t,
      formatNumber(number) {
        return new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en-US').format(number);
      }
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
