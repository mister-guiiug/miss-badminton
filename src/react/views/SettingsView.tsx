import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { LOCALES, LOCALE_LABELS, type Locale } from '../../i18n/messages';
import {
  getStoredThemePreference,
  setThemePreference,
  type ThemePreference,
} from '../../theme';
import { useFeedback } from '../hooks/useFeedback';
import { useTeamColors } from '../hooks/useTeamColors';
import {
  DEFAULT_TEAM1_COLOR,
  DEFAULT_TEAM2_COLOR,
  resetTeamColors,
  setTeamColor,
} from '../../team-colors';
import { forceAppUpdate } from '../../register-sw';
import { PageContainer } from '../components/layout/PageContainer';
import { COLOR_CLOSE_THRESHOLD, colorDistance } from '../../color-distance';

const THEMES: ThemePreference[] = ['light', 'dark', 'system'];

export function SettingsView() {
  const { t, locale, setLocale } = useI18n();
  const feedback = useFeedback();
  const colors = useTeamColors();
  const [theme, setTheme] = useState<ThemePreference>(() =>
    getStoredThemePreference()
  );

  const colorsAreDefault =
    colors.team1.toLowerCase() === DEFAULT_TEAM1_COLOR &&
    colors.team2.toLowerCase() === DEFAULT_TEAM2_COLOR;
  const colorsTooClose =
    colorDistance(colors.team1, colors.team2) < COLOR_CLOSE_THRESHOLD;

  const [updating, setUpdating] = useState(false);
  const handleForceUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      await forceAppUpdate();
    } finally {
      // forceAppUpdate triggers a reload, but if it falls through (no SW),
      // restore the button state so the user can retry.
      setUpdating(false);
    }
  };

  useEffect(() => {
    setThemePreference(theme);
  }, [theme]);

  const themeLabel = (pref: ThemePreference): string => {
    if (pref === 'light') return t('settings.themeLight');
    if (pref === 'dark') return t('settings.themeDark');
    return t('settings.themeSystem');
  };

  return (
    <PageContainer width="lg">
      <h1
        className="font-bold"
        style={{
          color: 'var(--primary)',
          fontSize: 'clamp(1.5rem, 4.5vw, 2.25rem)',
        }}
      >
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

      <Section
        title={t('settings.colorsLabel')}
        help={t('settings.colorsHelp')}
      >
        <div className="flex flex-wrap items-center gap-4">
          <ColorField
            label={t('settings.colorTeam1')}
            value={colors.team1}
            onChange={c => setTeamColor('team1', c)}
          />
          <ColorField
            label={t('settings.colorTeam2')}
            value={colors.team2}
            onChange={c => setTeamColor('team2', c)}
          />
          {!colorsAreDefault && (
            <button
              type="button"
              onClick={resetTeamColors}
              className="inline-flex min-h-9 items-center rounded-lg border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--muted)',
              }}
            >
              {t('settings.resetColors')}
            </button>
          )}
        </div>
        {colorsTooClose && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
            style={{
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
            }}
          >
            <span aria-hidden>⚠</span>
            <span>{t('settingsExtra.contrastWarning')}</span>
          </p>
        )}
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

      <Section
        title={t('settings.updateLabel')}
        help={t('settings.updateHelp')}
      >
        <button
          type="button"
          onClick={handleForceUpdate}
          disabled={updating}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'var(--primary)' }}
        >
          <span aria-hidden>{updating ? '⟳' : '⤓'}</span>
          {updating ? t('settings.updateChecking') : t('settings.updateButton')}
        </button>
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
    </PageContainer>
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
      className="space-y-3 rounded-2xl border"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        padding: 'clamp(0.75rem, 2.4vw, 1.25rem)',
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
            className="inline-flex min-h-11 items-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
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
      className="inline-flex min-h-11 items-center gap-3 rounded-full border px-3 py-1.5"
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

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <label
      className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
    >
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
        aria-label={label}
      />
      <span>{label}</span>
      <span className="ml-1 text-xs font-mono uppercase opacity-60" aria-hidden>
        {value}
      </span>
    </label>
  );
}
