import { registerSW } from 'virtual:pwa-register';

const UPDATE_BANNER_ID = 'sw-update-banner';

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | undefined;

function showUpdateBanner(): void {
  if (document.getElementById(UPDATE_BANNER_ID)) return;

  const bar = document.createElement('div');
  bar.id = UPDATE_BANNER_ID;
  bar.className = 'sw-update-banner';
  bar.setAttribute('role', 'status');
  bar.innerHTML = `
    <p class="sw-update-banner__text">Une nouvelle version de l'application est disponible.</p>
    <button type="button" class="sw-update-banner__btn">Mettre à jour</button>
  `;
  document.body.appendChild(bar);

  bar
    .querySelector<HTMLButtonElement>('.sw-update-banner__btn')
    ?.addEventListener('click', () => {
      updateSWFn?.(true);
    });
}

export function registerServiceWorker(): void {
  if (import.meta.env.DEV) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
          });
        })
        .catch(() => {});
    }
    return;
  }

  updateSWFn = registerSW({
    onNeedRefresh() {
      showUpdateBanner();
    },
    onOfflineReady() {},
  });
}

/**
 * Force the PWA to fetch any waiting service worker, activate it and reload
 * the page. In dev (no SW) or when no update is found, falls back to a hard
 * reload so the user always gets the latest assets.
 */
export async function forceAppUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(reg => reg.update().catch(() => undefined))
      );
    }
  } catch {
    /* registration check failed, fall through to reload */
  }

  if (updateSWFn) {
    try {
      await updateSWFn(true);
      return;
    } catch {
      /* fall through */
    }
  }

  window.location.reload();
}
