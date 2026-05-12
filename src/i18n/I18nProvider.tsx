import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { messages, type Locale, type Messages } from './messages';
import { I18nContext, type I18nContextValue } from './context';

const LS_KEY = 'mb_locale';

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'fr';
  const stored = localStorage.getItem(LS_KEY);
  if (stored === 'fr' || stored === 'en') return stored;
  const nav = window.navigator?.language?.slice(0, 2).toLowerCase();
  if (nav === 'en') return 'en';
  return 'fr';
}

function resolvePath(obj: Messages, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (
      acc &&
      typeof acc === 'object' &&
      key in (acc as Record<string, unknown>)
    ) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(params[key] ?? `{${key}}`)
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LS_KEY, next);
    } catch {
      // localStorage may be unavailable; fail silently
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const m = messages[locale];
    const t = (path: string, params?: Record<string, string | number>) => {
      const resolved = resolvePath(m, path);
      if (typeof resolved !== 'string') return path;
      return interpolate(resolved, params);
    };
    return { locale, setLocale, t, m };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
