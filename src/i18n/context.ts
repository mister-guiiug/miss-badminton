import { createContext } from 'react';
import type { Locale, Messages } from './messages';

/**
 * Construit récursivement l'union des chemins dot-notation de `T`.
 *
 * Exemple : pour `{ a: { b: string; c: { d: string } } }`, génère :
 * `'a.b' | 'a.c.d'`. On limite la récursion aux propriétés string-keyed.
 */
type Paths<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : T[K] extends object
          ? `${K}.${Paths<T[K]>}`
          : never;
    }[keyof T & string];

/** Toutes les clés i18n connues à la compilation. */
export type MessageKey = Paths<Messages>;

export interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /**
   * Signature typée : le compilateur refuse une clé inexistante. Les `params`
   * restent permissifs (les placeholders sont validés à l'exécution par
   * l'interpolateur, pas à la compilation).
   */
  t: (path: MessageKey, params?: Record<string, string | number>) => string;
  m: Messages;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
