import { createI18n } from '@mister-guiiug/dev-pwa-config/react/i18n';
import { LOCALES, messages } from './messages';

export type { Locale, Messages } from './messages';
export { LOCALES, LOCALE_FLAGS, LOCALE_LABELS } from './messages';

/**
 * Clé de persistance du choix de langue — celle de l'app, pas la clé famille.
 *
 * Le socle propose `dwc_locale` par défaut, ce qui fait suivre la langue d'une
 * app de la famille à l'autre (même origine GitHub Pages, donc même
 * `localStorage`). Miss Badminton garde `mb_locale` : c'est la clé sous
 * laquelle les choix DÉJÀ FAITS sont écrits, et `dwc_locale` les perdrait
 * silencieusement à la première ouverture. C'est aussi la seule des trois
 * langues d'ici qui ne serait pas comprise par les autres apps — un `'es'`
 * écrit dans la clé famille serait ignoré partout ailleurs.
 */
export const LOCALE_STORAGE_KEY = 'mb_locale';

/**
 * `labels: false` — CE N'EST PAS UN OUBLI.
 *
 * `createI18n` pose d'ordinaire `LabelsProvider` lui-même. Ici, l'app en monte
 * déjà un, dans `src/react/AppUpdatesProvider.tsx`, AVEC des surcharges tirées
 * de `messages.ts` : le dictionnaire du socle ne connaît que `fr` et `en` et
 * fait retomber toute autre locale sur le français, en silence. Sans ces
 * surcharges, le bandeau de mise à jour parlerait français à un utilisateur
 * espagnol.
 *
 * Laisser le socle en poser un second n'apporterait rien — celui de l'app est
 * plus bas dans l'arbre, donc il gagne — mais mettrait deux sources de
 * libellés en concurrence, dont une muette en espagnol. Une seule, et c'est
 * celle qui parle les trois langues.
 */
export const { I18nProvider, useI18n } = createI18n({
  messages,
  locales: LOCALES,
  fallbackLocale: 'fr',
  storageKey: LOCALE_STORAGE_KEY,
  labels: false,
});
