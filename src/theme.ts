const LS_THEME = 'mb_theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type Listener = (resolved: ResolvedTheme) => void;
const listeners = new Set<Listener>();

export function getStoredThemePreference(): ThemePreference {
  const s = localStorage.getItem(LS_THEME);
  if (s === 'light' || s === 'dark' || s === 'system') return s;
  return 'system';
}

export function getResolvedTheme(): ResolvedTheme {
  const pref = getStoredThemePreference();
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]'
  );
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#4f46e5' : '#0f172a');
  }
  listeners.forEach(l => l(theme));
}

export function applyResolvedTheme(): void {
  applyTheme(getResolvedTheme());
}

export function setThemePreference(pref: ThemePreference): void {
  localStorage.setItem(LS_THEME, pref);
  applyResolvedTheme();
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function wireSystemThemeListener(): void {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  mq.addEventListener('change', () => {
    if (getStoredThemePreference() === 'system') {
      applyTheme(mq.matches ? 'light' : 'dark');
    }
  });
}
