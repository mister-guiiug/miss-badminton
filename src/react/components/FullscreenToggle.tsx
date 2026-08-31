import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { MaximizeIcon, MinimizeIcon } from './icons';

function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  return typeof document.documentElement.requestFullscreen === 'function';
}

/**
 * Bouton flottant — bascule l'application en plein écran natif et inversement.
 * Sur desktop l'icône reste visible aussi (utile pour les écrans tactiles
 * type Surface). Masqué si l'API Fullscreen n'est pas disponible.
 */
export function FullscreenToggle() {
  const { t } = useI18n();
  const [supported] = useState<boolean>(() => isFullscreenSupported());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    () => typeof document !== 'undefined' && !!document.fullscreenElement
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const refresh = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', refresh);
    return () => document.removeEventListener('fullscreenchange', refresh);
  }, []);

  if (!supported) return null;

  const label = isFullscreen
    ? t('nav.exitFullscreen')
    : t('nav.enterFullscreen');

  const handleClick = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      } else {
        await document.documentElement
          .requestFullscreen()
          .catch(() => undefined);
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
      aria-pressed={isFullscreen}
      title={label}
      className="fixed right-safe-3 top-safe-3 z-30 flex touch-target items-center justify-center rounded-full text-white shadow-lg backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      {isFullscreen ? <MinimizeIcon size={22} /> : <MaximizeIcon size={22} />}
    </button>
  );
}
