import { useEffect, useState } from 'react';

/** Ce que l'application peut honnêtement promettre du hors-ligne. */
export type OfflineState =
  /** Un service worker CONTRÔLE la page : couper le réseau ne change rien. */
  | 'ready'
  /** Un worker est enregistré mais ne contrôle pas encore : première visite. */
  | 'preparing'
  /** Aucun worker — développement, ou navigateur qui n'en veut pas. */
  | 'absent';

/**
 * « L'APPLICATION EST-ELLE UTILISABLE SANS RÉSEAU, MAINTENANT ? »
 *
 * La réponse n'est pas « un service worker est enregistré » mais « un service
 * worker CONTRÔLE cette page » : tant qu'il ne la contrôle pas, la coquille
 * vient encore du réseau, et couper la connexion donnerait un écran blanc. Le
 * contrôle n'arrive qu'après le premier rechargement (`registerType: 'prompt'`,
 * sans `clientsClaim`) — c'est précisément la fenêtre pendant laquelle il ne
 * faut RIEN promettre à personne.
 *
 * TROIS ÉTATS, PAS DEUX, et le troisième est celui qui évite le mensonge : en
 * développement `main.tsx` n'enregistre aucun worker, et un booléen « pas
 * prêt » aurait fait afficher « mise en cache en cours… » à l'infini, pour une
 * mise en cache qui n'arrivera jamais.
 */
export function useOfflineReady(): OfflineState {
  const [state, setState] = useState<OfflineState>(() =>
    typeof navigator !== 'undefined' && navigator.serviceWorker?.controller
      ? 'ready'
      : 'absent'
  );

  useEffect(() => {
    const sw =
      typeof navigator === 'undefined' ? null : navigator.serviceWorker;
    if (!sw) return;

    let vivant = true;
    const relire = () => {
      if (!vivant) return;
      if (sw.controller) {
        setState('ready');
        return;
      }
      void sw
        .getRegistration()
        .then(registration => {
          if (vivant) setState(registration ? 'preparing' : 'absent');
        })
        .catch(() => {});
    };

    relire();
    sw.addEventListener('controllerchange', relire);
    // `ready` se résout dès qu'un worker est actif ; le contrôle peut suivre
    // d'un tour de boucle, d'où la relecture plutôt qu'un « prêt » optimiste.
    void sw.ready.then(relire).catch(() => {});

    return () => {
      vivant = false;
      sw.removeEventListener('controllerchange', relire);
    };
  }, []);

  return state;
}
