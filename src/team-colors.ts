const LS_TEAM1 = 'mb_color_team1';
const LS_TEAM2 = 'mb_color_team2';

export const DEFAULT_TEAM1_COLOR = '#e53935';
export const DEFAULT_TEAM2_COLOR = '#26a3b8';

export interface TeamColors {
  team1: string;
  team2: string;
}

type Listener = (colors: TeamColors) => void;
const listeners = new Set<Listener>();

function readColor(key: string, fallback: string): string {
  try {
    const stored = localStorage.getItem(key);
    if (stored && /^#[0-9a-fA-F]{6}$/.test(stored)) return stored;
  } catch {
    /* localStorage unavailable */
  }
  return fallback;
}

export function getTeamColors(): TeamColors {
  return {
    team1: readColor(LS_TEAM1, DEFAULT_TEAM1_COLOR),
    team2: readColor(LS_TEAM2, DEFAULT_TEAM2_COLOR),
  };
}

function notify(): void {
  const next = getTeamColors();
  listeners.forEach(l => l(next));
}

export function setTeamColor(side: 'team1' | 'team2', color: string): void {
  try {
    localStorage.setItem(side === 'team1' ? LS_TEAM1 : LS_TEAM2, color);
  } catch {
    /* ignore */
  }
  notify();
}

export function resetTeamColors(): void {
  try {
    localStorage.removeItem(LS_TEAM1);
    localStorage.removeItem(LS_TEAM2);
  } catch {
    /* ignore */
  }
  notify();
}

export function subscribeTeamColors(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
