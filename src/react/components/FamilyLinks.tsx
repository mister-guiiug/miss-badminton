import {
  SPONSOR_URL,
  repoUrl,
} from '@mister-guiiug/dev-pwa-config/apps-catalog';
import { currentIssueReportUrl } from '@mister-guiiug/dev-pwa-config/issue-report';

const REPO_URL = repoUrl('miss-badminton');

/**
 * Les liens de la règle famille — code source, soutien, SIGNALER — rendus par
 * la COQUILLE, hors des routes, donc sur tous les écrans.
 *
 * PAS DE NUMÉRO DE VERSION. Il y en avait un, lié vers
 * `…/releases/tag/vX.Y.Z` : aucune app du parc ne pose de tag git, le lien
 * répondait donc 404 partout. Le numéro voyage toujours dans le rapport de
 * bug — `currentIssueReportUrl` le préremplit —, là où il sert vraiment.
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
 *
 * C'est pour la même raison que « Signaler un problème » n'arrive pas ici par
 * la prop `issues` d'`AppFooter` (socle 4.4.0) mais par le module qui la
 * nourrit, `issue-report` : celui-ci n'a pas d'icône et pas de React. L'URL
 * est calculée AU CLIC, jamais au rendu — la version, l'écran courant et le
 * navigateur y entrent préremplis, et la route change sans que ce pied de
 * page ne se rende à nouveau.
 */
export function FamilyLinks() {
  return (
    <div
      // `mt-6` sur téléphone : ces huit pixels comptent dans un accueil qui
      // doit tenir sans défilement. L'écart reste franc — le bloc est déjà
      // séparé par un fond et par sa taille de texte.
      className="mt-6 flex flex-col items-center gap-2 pb-6 text-sm sm:mt-8"
      style={{ color: 'var(--text)' }}
    >
      <div className="flex flex-wrap items-center justify-center gap-4">
        <a
          href={REPO_URL}
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
        <a
          href={`${REPO_URL}/issues/new?template=bug.yml`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={event => {
            // L'URL PRÉREMPLIE se calcule au clic : version, commit, écran
            // courant et navigateur. Le `href` statique reste le repli — un
            // clic milieu, un « ouvrir dans un nouvel onglet », un JS en
            // panne — et mène au même formulaire, vide.
            const url = currentIssueReportUrl({ repoUrl: REPO_URL });
            if (url) event.currentTarget.href = url;
          }}
          className="inline-flex items-center gap-1.5 font-medium opacity-70 transition hover:opacity-100"
        >
          <span aria-hidden="true">🐞</span>
          Signaler un problème
        </a>
      </div>
    </div>
  );
}
