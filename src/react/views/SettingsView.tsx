import { useI18n } from '../../i18n/useI18n';
import { LOCALES, LOCALE_LABELS, type Locale } from '../../i18n/messages';

export function SettingsView() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div className="max-w-lg mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
        {t('nav.settings')}
      </h1>

      <section
        className="rounded-2xl border p-4 space-y-3"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: 'var(--muted)' }}
        >
          {t('settings.languageLabel')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text)' }}>
          {t('settings.languageHelp')}
        </p>
        <div
          role="radiogroup"
          aria-label={t('settings.languageLabel')}
          className="flex flex-wrap gap-2"
        >
          {LOCALES.map(l => {
            const selected = l === locale;
            return (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setLocale(l as Locale)}
                className="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
                style={{
                  borderColor: selected ? 'var(--primary)' : 'var(--border)',
                  background: selected ? 'var(--primary)' : 'transparent',
                  color: selected ? '#fff' : 'var(--text)',
                }}
              >
                {LOCALE_LABELS[l]}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
