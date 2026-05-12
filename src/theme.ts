const LS_THEME = 'mb_theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

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
    meta.setAttribute('content', theme === 'light' ? '#166534' : '#052e16');
  }
}

export function applyResolvedTheme(): void {
  applyTheme(getResolvedTheme());
}

export function wireSystemThemeListener(): void {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  mq.addEventListener('change', () => {
    if (getStoredThemePreference() === 'system') {
      applyTheme(mq.matches ? 'light' : 'dark');
    }
  });
}
