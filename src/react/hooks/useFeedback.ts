import { useCallback, useState } from 'react';
import {
  useFeedback as useSensoryFeedback,
  type FeedbackSpec,
} from '@mister-guiiug/dev-pwa-config/react/use-feedback';
import { storage } from '../../storage';

export type FeedbackEvent = 'point' | 'setWon' | 'matchWon';

/**
 * Les trois évènements de l'app, avec leur vibration et leurs notes. Ce sont
 * exactement les motifs, fréquences, durées et décalages de la synthèse locale
 * d'avant (`beep(660, 70)`, `[40, 30, 40]`…), portés en secondes ; `volume:
 * 0.18` parce que le socle sonne à 0,15 par défaut et qu'on ne baisse pas le
 * son en changeant de moteur. Le socle ne connaît ni « point » ni « set » : la
 * table est à l'app, la synthèse (`audio.js`) et la vibration (`haptics.js`)
 * sont à lui.
 */
const EVENTS: Record<FeedbackEvent, FeedbackSpec> = {
  point: {
    vibration: 15,
    sound: [{ freq: 660, duration: 0.07, volume: 0.18 }],
  },
  setWon: {
    vibration: [40, 30, 40],
    sound: [
      { freq: 523, duration: 0.11, volume: 0.18 },
      { freq: 659, duration: 0.11, volume: 0.18, at: 0.13 },
      { freq: 784, duration: 0.16, volume: 0.18, at: 0.26 },
    ],
  },
  matchWon: {
    vibration: [60, 40, 60, 40, 120],
    sound: [
      { freq: 523, duration: 0.12, volume: 0.18 },
      { freq: 659, duration: 0.12, volume: 0.18, at: 0.14 },
      { freq: 784, duration: 0.12, volume: 0.18, at: 0.28 },
      { freq: 1047, duration: 0.26, volume: 0.18, at: 0.42 },
    ],
  },
};

export interface FeedbackPrefs {
  sound: boolean;
  haptic: boolean;
  setSound: (v: boolean) => void;
  setHaptic: (v: boolean) => void;
  trigger: (event: FeedbackEvent) => void;
}

/**
 * Les deux préférences restent lues et écrites ICI, dans `storage` : le socle
 * ne porte que les interrupteurs, pas leur persistance. `trigger` est le
 * `useFeedback` du socle, branché dessus.
 */
export function useFeedback(): FeedbackPrefs {
  const [sound, setSoundState] = useState<boolean>(() =>
    storage.loadBoolPref('sound', true)
  );
  const [haptic, setHapticState] = useState<boolean>(() =>
    storage.loadBoolPref('haptic', true)
  );

  const setSound = useCallback((v: boolean) => {
    setSoundState(v);
    storage.saveBoolPref('sound', v);
  }, []);

  const setHaptic = useCallback((v: boolean) => {
    setHapticState(v);
    storage.saveBoolPref('haptic', v);
  }, []);

  const trigger = useSensoryFeedback<FeedbackEvent>(EVENTS, { sound, haptic });

  return { sound, haptic, setSound, setHaptic, trigger };
}
