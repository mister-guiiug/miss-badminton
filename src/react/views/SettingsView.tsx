import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { LOCALES, LOCALE_LABELS, type Locale } from '../../i18n/messages';
import {
  getStoredThemePreference,
  setThemePreference,
  type ThemePreference,
} from '../../theme';
import { useFeedback } from '../hooks/useFeedback';

const THEMES: ThemePreference[] = ['light', 'dark', 'system'];

export function SettingsView() {
  const { t, locale, setLocale } = useI18n();
  const feedback = useFeedback();
  const [theme, setTheme] = useState<ThemePreference>(() =>
    getStoredThemePreference()
  );

  useEffect(() => {
    setThemePreference(theme);
  }, [theme]);

  const themeLabel = (pref: ThemePreference): string => {
    if (pref === 'light') return t('settings.themeLight');
    if (pref === 'dark') return t('settings.themeDark');
    return t('settings.themeSystem');
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-16">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
        {t('nav.settings')}
      </h1>

      <Section
        title={t('settings.languageLabel')}
        help={t('settings.languageHelp')}
      >
        <Pills
          ariaLabel={t('settings.languageLabel')}
          value={locale}
          options={LOCALES.map(l => ({ value: l, label: LOCALE_LABELS[l] }))}
          onChange={v => setLocale(v as Locale)}
        />
      </Section>

      <Section title={t('settings.themeLabel')} help={t('settings.themeHelp')}>
        <Pills
          ariaLabel={t('settings.themeLabel')}
          value={theme}
          options={THEMES.map(p => ({ value: p, label: themeLabel(p) }))}
          onChange={v => setTheme(v as ThemePreference)}
        />
      </Section>

      <Section title={t('settings.soundLabel')} help={t('settings.soundHelp')}>
        <Toggle
          ariaLabel={t('settings.soundLabel')}
          value={feedback.sound}
          onChange={feedback.setSound}
          enabledLabel={t('settings.enabled')}
          disabledLabel={t('settings.disabled')}
        />
      </Section>

      <Section
        title={t('settings.hapticLabel')}
        help={t('settings.hapticHelp')}
      >
        <Toggle
          ariaLabel={t('settings.hapticLabel')}
          value={feedback.haptic}
          onChange={feedback.setHaptic}
          enabledLabel={t('settings.enabled')}
          disabledLabel={t('settings.disabled')}
        />
      </Section>

      <Section title={t('shortcuts.title')}>
        <ul className="space-y-1 text-sm" style={{ color: 'var(--text)' }}>
          <li>{t('shortcuts.addTeam1')}</li>
          <li>{t('shortcuts.addTeam2')}</li>
          <li>{t('shortcuts.undo')}</li>
          <li>{t('shortcuts.reset')}</li>
          <li>{t('shortcuts.swap')}</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="space-y-3 rounded-2xl border p-4"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <h2
        className="text-sm font-semibold uppercase tracking-wide"
        style={{ color: 'var(--muted)' }}
      >
        {title}
      </h2>
      {help && (
        <p className="text-sm" style={{ color: 'var(--text)' }}>
          {help}
        </p>
      )}
      {children}
    </section>
  );
}

interface PillsProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function Pills<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: PillsProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2"
    >
      {options.map(opt => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              borderColor: selected ? 'var(--primary)' : 'var(--border)',
              background: selected ? 'var(--primary)' : 'transparent',
              color: selected ? '#fff' : 'var(--text)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface ToggleProps {
  ariaLabel: string;
  value: boolean;
  onChange: (v: boolean) => void;
  enabledLabel: string;
  disabledLabel: string;
}

function Toggle({
  ariaLabel,
  value,
  onChange,
  enabledLabel,
  disabledLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      onClick={() => onChange(!value)}
      className="inline-flex items-center gap-3 rounded-full border px-3 py-1.5"
      style={{
        borderColor: value ? 'var(--primary)' : 'var(--border)',
        background: value ? 'var(--primary)' : 'transparent',
        color: value ? '#fff' : 'var(--text)',
      }}
    >
      <span
        aria-hidden
        className="inline-block h-3 w-3 rounded-full"
        style={{ background: value ? '#fff' : 'var(--muted)' }}
      />
      <span className="text-sm font-medium">
        {value ? enabledLabel : disabledLabel}
      </span>
    </button>
  );
}
