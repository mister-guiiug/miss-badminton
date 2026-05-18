import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { ScreenLandscapeIcon, ScreenPortraitIcon } from './icons';

interface OrientationLock {
  lock?: (
    orientation:
      | 'landscape'
      | 'portrait'
      | 'landscape-primary'
      | 'portrait-primary'
  ) => Promise<void>;
}

function isOrientationLockSupported(): boolean {
  if (typeof screen === 'undefined') return false;
  const orientation = screen.orientation as
    | (ScreenOrientation & OrientationLock)
    | undefined;
  return typeof orientation?.lock === 'function';
}

function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  return typeof document.documentElement.requestFullscreen === 'function';
}

/**
 * Bouton flottant — bascule entre orientation paysage et portrait via
 * Screen Orientation API (nécessite le plein écran sur la plupart des
 * navigateurs ; s'en occupe automatiquement si nécessaire). Masqué si
 * l'API n'est pas disponible. Positionné juste à gauche du bouton plein écran.
 */
export function OrientationToggle() {
  const { t } = useI18n();
  const [isPortrait, setIsPortrait] = useState<boolean>(() =>
    typeof window === 'undefined'
      ? true
      : window.matchMedia('(orientation: portrait)').matches
  );
  const [supported] = useState<boolean>(() => isOrientationLockSupported());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(orientation: portrait)');
    const refresh = () => setIsPortrait(mq.matches);
    mq.addEventListener('change', refresh);
    return () => mq.removeEventListener('change', refresh);
  }, []);

  if (!supported) return null;

  const label = isPortrait ? t('nav.forceLandscape') : t('nav.forcePortrait');

  const handleClick = async () => {
    try {
      // Demande le plein écran si nécessaire (requis pour locker sur mobile)
      if (typeof document !== 'undefined' && !document.fullscreenElement) {
        await document.documentElement
          .requestFullscreen()
          .catch(() => undefined);
      }

      const orientation = screen.orientation;
      if (isPortrait) {
        const lockable = orientation as ScreenOrientation & OrientationLock;
        if (lockable.lock) {
          await lockable.lock('landscape').catch(() => undefined);
        }
      } else {
        orientation.unlock();
      }
    } catch {
      /* refusé par le navigateur — silence */
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className="fixed top-safe-3 z-30 flex touch-target items-center justify-center rounded-full text-white shadow-lg backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
      style={{
        background: 'rgba(0,0,0,0.55)',
        // Décalé à gauche du bouton plein écran s'il est supporté : 4rem.
        // Sinon collé à droite (right-safe-3) : 0.75rem.
        right: isFullscreenSupported()
          ? 'calc(max(env(safe-area-inset-right, 0px), 0px) + 4rem)'
          : 'calc(max(env(safe-area-inset-right, 0px), 0px) + 0.75rem)',
      }}
    >
      {isPortrait ? (
        <ScreenLandscapeIcon size={22} />
      ) : (
        <ScreenPortraitIcon size={22} />
      )}
    </button>
  );
}
