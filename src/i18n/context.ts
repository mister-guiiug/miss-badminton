import { createContext } from 'react';
import type { Locale, Messages } from './messages';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  m: Messages;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
