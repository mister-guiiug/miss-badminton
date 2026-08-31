import { useMemo, type ReactNode } from 'react';
import { AppUpdates } from '@mister-guiiug/dev-wpa-config/react/app-updates';
import {
  LabelsProvider,
  type LabelOverrides,
} from '@mister-guiiug/dev-wpa-config/react/labels';
import type { RegisterSW } from '@mister-guiiug/dev-wpa-config/react/use-update-prompt';
import { useI18n } from '../i18n';

/**
 * Pont entre le i18n de l'app et le bandeau de mise à jour du socle.
 *
 * POURQUOI CE FICHIER EXISTE — ET C'EST TOUT SON INTÉRÊT. `react/labels` du
 * socle ne livre que **`fr` et `en`**, et `LabelsProvider` fait retomber toute
 * locale inconnue sur le **français**, en silence : ni erreur, ni avertissement.
 * Miss Badminton parle fr/en/**es** ; monter `AppUpdates` sans surcharges
 * afficherait donc un bandeau FRANÇAIS à un utilisateur espagnol, sans que rien
 * ne le signale.
 *
 * On ne s'en remet donc jamais au dictionnaire du socle : les quatre libellés
 * du bandeau sont TOUJOURS surchargés depuis `messages.ts`, y compris en
 * français et en anglais. Le repli du socle devient inatteignable — c'est le
 * but. `src/react/AppUpdatesProvider.test.tsx` le prouve en espagnol.
 *
 * `registerSW` est une PROP, pas un import : la décision « on n'enregistre pas
 * de service worker en développement » appartient à `main.tsx`, seul endroit
 * qui lit `import.meta.env`. Sans elle, `useUpdatePrompt` sort de son effet et
 * le bandeau ne peut pas apparaître — exactement le comportement voulu en dev.
 */
export function AppUpdatesProvider({
  registerSW,
  children,
}: {
  registerSW?: RegisterSW;
  children: ReactNode;
}) {
  const { locale, t } = useI18n();

  const overrides = useMemo<LabelOverrides>(
    () => ({
      update: {
        title: t('update.available'),
        update: t('update.action'),
        updating: t('update.updating'),
        dismiss: t('update.dismiss'),
        snooze: t('update.dismiss'),
        force: t('settings.updateButton'),
        forceHint: t('settings.updateHelp'),
      },
    }),
    [t]
  );

  return (
    <LabelsProvider locale={locale} overrides={overrides}>
      <AppUpdates
        registerSW={registerSW}
        bannerProps={{ className: 'mb-update-banner' }}
      >
        {children}
      </AppUpdates>
    </LabelsProvider>
  );
}
