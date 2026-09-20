import { useEffect, useState } from 'react';
import { RiveAnimation } from '@mister-guiiug/dev-pwa-config/react/rive';

interface RiveSceneProps {
  src: string;
  stateMachine?: string;
  artboard?: string;
  className?: string;
  fallback?: React.ReactNode;
  ariaLabel?: string;
}

interface ProbeState {
  src: string;
  status: 'pending' | 'ok' | 'missing';
}

const RIVE_MAGIC = 'RIVE';

/**
 * LA SONDE RESTE À L'APP, ET VOICI POURQUOI. `RiveAnimation` du socle garantit
 * le repli quand le RUNTIME manque — son `lazy()` rejette, sa frontière
 * l'attrape — et quand l'utilisateur réduit les animations. Mais un `.riv`
 * absent ou corrompu, le runtime ne le LÈVE pas : `@rive-app/canvas` 2.42
 * écrit « Problem loading file; may be corrupt! » dans la console et émet
 * `onLoadError`, que l'enveloppe React ne remonte à personne. Une frontière
 * d'erreur ne voit rien passer, et l'écran garderait une toile vide là où la
 * décoration devait être. D'où ces quatre octets lus AVANT de monter quoi que
 * ce soit — et avant de demander le runtime.
 */
async function probeRiveFile(src: string): Promise<boolean> {
  try {
    const response = await fetch(src, { cache: 'no-store' });
    if (!response.ok) return false;
    const buffer = await response.clone().arrayBuffer();
    if (buffer.byteLength < 4) return false;
    const head = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
    return head === RIVE_MAGIC;
  } catch {
    return false;
  }
}

/**
 * L'animation elle-même est celle du socle : runtime chargé à la demande par
 * son `lazy()`, `prefers-reduced-motion` respecté (le repli statique, sans
 * même charger le runtime), `role="img"` + `aria-label` quand un libellé est
 * donné, `aria-hidden` sinon. La disposition d'avant — `Fit.Contain` centré —
 * est celle par défaut du runtime : rien à passer.
 *
 * Le runtime pèse 56,8 ko gzip au build (203 ko brut), plus le WASM qu'il va
 * chercher lui-même : `vite.config.ts` lui réserve son propre morceau, sans
 * quoi `manualChunks` le renverrait dans `vendor`, qui est PRÉCHARGÉ, et le
 * `lazy()` ne servirait à rien.
 */
export function RiveScene({
  src,
  stateMachine,
  artboard,
  className,
  fallback,
  ariaLabel,
}: RiveSceneProps) {
  const [probe, setProbe] = useState<ProbeState>({ src, status: 'pending' });

  useEffect(() => {
    let cancelled = false;
    probeRiveFile(src).then(ok => {
      if (!cancelled) setProbe({ src, status: ok ? 'ok' : 'missing' });
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (probe.src !== src || probe.status !== 'ok') {
    return <>{fallback ?? null}</>;
  }

  return (
    <RiveAnimation
      src={src}
      stateMachines={stateMachine}
      artboard={artboard}
      className={className}
      ariaLabel={ariaLabel}
      fallback={fallback}
    />
  );
}
