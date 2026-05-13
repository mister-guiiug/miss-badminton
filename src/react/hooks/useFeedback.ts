import { useCallback, useEffect, useRef, useState } from 'react';
import { storage } from '../../storage';

interface AudioContextConstructor {
  new (): AudioContext;
}

function getAudioCtor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export type FeedbackEvent = 'point' | 'setWon' | 'matchWon';

export interface FeedbackPrefs {
  sound: boolean;
  haptic: boolean;
  setSound: (v: boolean) => void;
  setHaptic: (v: boolean) => void;
  trigger: (event: FeedbackEvent) => void;
}

export function useFeedback(): FeedbackPrefs {
  const [sound, setSoundState] = useState<boolean>(() =>
    storage.loadBoolPref('sound', true)
  );
  const [haptic, setHapticState] = useState<boolean>(() =>
    storage.loadBoolPref('haptic', true)
  );
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => undefined);
    };
  }, []);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctor = getAudioCtor();
    if (!Ctor) return null;
    audioCtxRef.current = new Ctor();
    return audioCtxRef.current;
  }, []);

  const beep = useCallback(
    (freq: number, durationMs: number, delayMs = 0): void => {
      const ctx = ensureCtx();
      if (!ctx) return;
      const start = ctx.currentTime + delayMs / 1000;
      const stop = start + durationMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(stop);
    },
    [ensureCtx]
  );

  const setSound = useCallback((v: boolean) => {
    setSoundState(v);
    storage.saveBoolPref('sound', v);
  }, []);

  const setHaptic = useCallback((v: boolean) => {
    setHapticState(v);
    storage.saveBoolPref('haptic', v);
  }, []);

  const trigger = useCallback(
    (event: FeedbackEvent) => {
      if (haptic) {
        if (event === 'point') vibrate(15);
        if (event === 'setWon') vibrate([40, 30, 40]);
        if (event === 'matchWon') vibrate([60, 40, 60, 40, 120]);
      }
      if (sound) {
        if (event === 'point') beep(660, 70);
        if (event === 'setWon') {
          beep(523, 110, 0);
          beep(659, 110, 130);
          beep(784, 160, 260);
        }
        if (event === 'matchWon') {
          beep(523, 120, 0);
          beep(659, 120, 140);
          beep(784, 120, 280);
          beep(1047, 260, 420);
        }
      }
    },
    [beep, haptic, sound]
  );

  return { sound, haptic, setSound, setHaptic, trigger };
}
