import {
  SPONSOR_URL,
  repoUrl,
} from '@mister-guiiug/dev-pwa-config/apps-catalog';

/**
 * Les deux liens de la règle famille — code source et soutien — rendus par la
 * COQUILLE, hors des routes, donc sur tous les écrans.
 *
 * Ils vivaient dans `SettingsView` : le code source n'existait que sur l'écran
 * Paramètres, celui qu'on ouvre le moins. La règle famille du 05/09/2026 les
 * veut aussi sur le premier écran.
 *
 * POURQUOI PAS `AppFooter` DU SOCLE. Cette app INLINE ses SVG pour garder un
 * bundle minimal et ne déclare pas `lucide-react` — c'est une décision écrite,
 * pas un oubli. Le pied de page du socle passe par son jeu d'icônes ; le
 * marqueur GitHub ci-dessous est le SVG déjà présent dans l'app, déplacé tel
 * quel. Seules les URL viennent du catalogue, qui fait foi.
 */
export function FamilyLinks() {
  return (
    <div
      className="mt-8 flex flex-wrap items-center justify-center gap-4 pb-6 text-sm"
      style={{ color: 'var(--text)' }}
    >
      <a
        href={repoUrl('miss-badminton')}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium opacity-70 transition hover:opacity-100"
      >
        <svg
          viewBox="0 0 16 16"
          width="15"
          height="15"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        Code source
      </a>
      <a
        href={SPONSOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium opacity-70 transition hover:opacity-100"
      >
        <span aria-hidden="true">☕</span>
        M'offrir un café
      </a>
    </div>
  );
}
