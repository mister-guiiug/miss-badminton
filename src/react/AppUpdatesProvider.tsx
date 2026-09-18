import type { ReactNode } from 'react';
import { AppUpdates } from '@mister-guiiug/dev-pwa-config/react/app-updates';
import { LabelsProvider } from '@mister-guiiug/dev-pwa-config/react/labels';
import type { RegisterSW } from '@mister-guiiug/dev-pwa-config/react/use-update-prompt';
import { useI18n } from '../i18n';

/**
 * Pont entre la langue de l'app et le bandeau de mise à jour du socle.
 *
 * CE FICHIER SURCHARGEAIT LES LIBELLÉS, ET LA RAISON A DISPARU. Elle était
 * écrite ici : « `react/labels` du socle ne livre que **`fr` et `en`**, et
 * `LabelsProvider` fait retomber toute locale inconnue sur le français, en
 * silence. Miss Badminton parle fr/en/**es** ; monter `AppUpdates` sans
 * surcharges afficherait donc un bandeau FRANÇAIS à un utilisateur espagnol. »
 *
 * C'était exact — et ça ne l'est plus : le socle livre SEPT locales, dont
 * l'espagnol, groupe `update` complet. La surcharge ne protégeait donc plus de
 * rien ; elle ajoutait seulement une neuvième façon d'annoncer une mise à jour
 * dans un parc qui en comptait déjà huit. Le commentaire figeait une LIMITE du
 * socle, pas un contrat de l'app.
 *
 * Ce qui reste est le seul rôle qui tienne : passer la locale courante, pour
 * que le socle serve la bonne langue. `AppUpdatesProvider.test.tsx` le prouve
 * toujours en espagnol — sur les libellés du socle, désormais.
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
  const { locale } = useI18n();

  return (
    <LabelsProvider locale={locale}>
      <AppUpdates
        checkEvery="1h"
        registerSW={registerSW}
        bannerProps={{ className: 'mb-update-banner' }}
      >
        {children}
      </AppUpdates>
    </LabelsProvider>
  );
}
