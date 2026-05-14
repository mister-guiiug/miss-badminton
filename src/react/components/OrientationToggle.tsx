import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { ScreenLandscapeIcon, ScreenPortraitIcon } from './icons';

interface OrientationLock {
  lock?: (
    orientation: 'landscape' | 'portrait' | 'landscape-primary' | 'portrait-primary'
  ) => Promise<void>;
}

function isOrientationLockSupported(): boolean {
  if (typeof screen === 'undefined') return false;
  const orientation = screen.orientation as
    | (ScreenOrientation & OrientationLock)
    | undefined;
  return typeof orientation?.lock === 'function';
}

/**
 * Bouton flottant en haut à droite — bascule entre orientation paysage et
 * portrait via Screen Orientation API (nécessite le plein écran sur la
 * plupart des navigateurs). Sur desktop ou si l'API n'est pas dispo, le
 * bouton est masqué.
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

  const target: 'landscape' | 'portrait' = isPortrait ? 'landscape' : 'portrait';
  const label = isPortrait ? t('nav.forceLandscape') : t('nav.forcePortrait');

  const handleClick = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => undefined);
      }
      const orientation = screen.orientation as ScreenOrientation &
        OrientationLock;
      if (orientation?.lock) {
        await orientation.lock(target).catch(() => undefined);
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
      className="fixed right-safe-3 top-safe-3 z-30 flex touch-target items-center justify-center rounded-full text-white shadow-lg backdrop-blur-md transition-transform hover:scale-105 active:scale-95 lg:hidden"
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      {isPortrait ? (
        <ScreenLandscapeIcon size={22} />
      ) : (
        <ScreenPortraitIcon size={22} />
      )}
    </button>
  );
}
