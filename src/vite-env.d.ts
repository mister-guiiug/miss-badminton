/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /**
   * Clé de projet PostHog (`phc_…`), nuage EUROPÉEN — ADR 0012. LA MÊME pour
   * tout le parc, et c'est délibéré : un seul projet, les applications
   * distinguées dedans par la super-propriété `app_name` que le socle déduit
   * du chemin de base. L'inverse — un projet par dépôt — rendait le total
   * illisible. Publique par conception (elle part dans le bundle), donc
   * `vars` et jamais `secrets`. Absente, le bandeau de consentement ne rend
   * rien et rien n'est mesuré : c'est le seul interrupteur.
   */
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  /**
   * Adresse du proxy eBad / FFBaD (`src/ebad-proxy/`, contrat dans
   * `src/ebad-contract.ts`). Publique : elle ne porte AUCUN identifiant, le
   * proxy les garde côté serveur. Absente, l'import FFBaD ne s'affiche pas ;
   * `mock` branche le jeu de démonstration (en développement seulement).
   */
  readonly VITE_EBAD_PROXY_URL?: string;
  /**
   * « Se connecter avec MyFFBaD » (`src/ebad-oauth.ts`) : l'adresse
   * d'autorisation OAuth 2.0 de la FFBaD et l'identifiant client qu'elle
   * délivre en enregistrant l'app. Publics par nature (ils partent dans
   * l'adresse de connexion) ; le secret client, s'il existe, reste au proxy.
   * Absents, le bouton ne s'affiche pas ; `mock` simule le fournisseur en
   * développement.
   */
  readonly VITE_EBAD_OAUTH_AUTHORIZE_URL?: string;
  readonly VITE_EBAD_OAUTH_CLIENT_ID?: string;
  /** Portées OAuth demandées, séparées par des espaces (facultatif). */
  readonly VITE_EBAD_OAUTH_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
