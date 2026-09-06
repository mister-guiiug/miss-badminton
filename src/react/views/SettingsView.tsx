import { useCallback, useState, useSyncExternalStore } from 'react';
import {
  FamilyApps,
  useThemeContext,
  type ThemePreference,
} from '@mister-guiiug/dev-pwa-config/react';
import {
  dateSlug,
  downloadJson,
  readJsonFile,
} from '@mister-guiiug/dev-pwa-config/download';
import { useI18n } from '../../i18n';
import {
  LOCALES,
  LOCALE_FLAGS,
  LOCALE_LABELS,
  type Locale,
} from '../../i18n/messages';
import { useFeedback } from '../hooks/useFeedback';
import { useTeamColors } from '../hooks/useTeamColors';
import {
  DEFAULT_TEAM1_COLOR,
  DEFAULT_TEAM2_COLOR,
  resetTeamColors,
  setTeamColor,
} from '../../team-colors';
import { useAppUpdates } from '@mister-guiiug/dev-pwa-config/react/app-updates';
import { useUpdatePrompt } from '@mister-guiiug/dev-pwa-config/react/use-update-prompt';
import { PageContainer } from '../components/layout/PageContainer';
import { COLOR_CLOSE_THRESHOLD, colorDistance } from '../../color-distance';
import {
  DownloadIcon,
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
  UserIcon,
} from '../components/icons';
import { useMatchStore } from '../../store/useMatchStore';
import {
  clearErrorLog,
  getErrorLog,
} from '@mister-guiiug/dev-pwa-config/react/observability';

const THEMES: ThemePreference[] = ['light', 'dark', 'system'];

const KEYBOARD_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * Vrai si le device a un pointeur fin + survol — heuristique fiable pour
 * "il y a probablement un clavier". Faux sur smartphone / tablette pur tactile.
 */
function useLikelyHasKeyboard(): boolean {
  return useSyncExternalStore(
    cb => {
      if (typeof window === 'undefined') return () => {};
      const mq = window.matchMedia(KEYBOARD_QUERY);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () =>
      typeof window === 'undefined'
        ? true
        : window.matchMedia(KEYBOARD_QUERY).matches,
    () => true
  );
}

export function SettingsView() {
  const { t, locale, setLocale } = useI18n();
  const feedback = useFeedback();
  const colors = useTeamColors();
  // État partagé du ThemeProvider monté dans main.tsx (persistance, écoute
  // système et <meta theme-color> comprises). Hors fournisseur (test isolé),
  // repli inerte sur `system`.
  const themeCtx = useThemeContext();
  const theme = (themeCtx?.theme ?? 'system') as ThemePreference;
  const setTheme = (pref: ThemePreference): void => {
    themeCtx?.setTheme(pref);
  };
  const hasKeyboard = useLikelyHasKeyboard();
  const { matchHistory, importBundle, players, renamePlayer, removePlayer } =
    useMatchStore();
  const [importError, setImportError] = useState<string | null>(null);
  /** Le profil en cours de renommage, et l'erreur éventuelle du dernier essai. */
  const [renaming, setRenaming] = useState<{
    id: string;
    value: string;
    error: string | null;
  } | null>(null);

  const colorsAreDefault =
    colors.team1.toLowerCase() === DEFAULT_TEAM1_COLOR &&
    colors.team2.toLowerCase() === DEFAULT_TEAM2_COLOR;
  const colorsTooClose =
    colorDistance(colors.team1, colors.team2) < COLOR_CLOSE_THRESHOLD;

  // Même aiguillage que les composants du socle : sous `AppUpdates` on partage
  // l'état du fournisseur (le bandeau et ce bouton disent alors la même chose),
  // hors fournisseur on monte son propre crochet — sans `registerSW`, ce qui
  // suffit : « Forcer la mise à jour » n'a jamais eu besoin d'enregistrement.
  // Les deux crochets sont appelés inconditionnellement (règle des hooks).
  const sharedUpdates = useAppUpdates();
  const ownUpdates = useUpdatePrompt();
  const { updating, forceUpdate } = sharedUpdates ?? ownUpdates;
  const handleForceUpdate = () => {
    if (updating) return;
    void forceUpdate();
  };

  const themeLabel = (pref: ThemePreference): string => {
    if (pref === 'light') return t('settings.themeLight');
    if (pref === 'dark') return t('settings.themeDark');
    return t('settings.themeSystem');
  };

  const handleExport = () => {
    const data = {
      history: matchHistory,
      // DEUX CHAMPS, ET C'EST VOULU (cf. `ExportBundleSchema`) : `players`
      // reste la liste de NOMS, qu'une version d'avant les profils sait
      // relire ; `playerProfiles` porte les identifiants, que celle-ci
      // préfère à la relecture.
      players: players.map(p => p.name),
      playerProfiles: players,
      settings: {
        theme,
        locale,
        team1Color: colors.team1,
        team2Color: colors.team2,
        sound: feedback.sound,
        haptic: feedback.haptic,
      },
    };
    downloadJson(data, `miss-badminton-data-${dateSlug()}.json`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    void (async () => {
      let parsed: unknown;
      try {
        parsed = await readJsonFile(file);
      } catch {
        setImportError(t('settings.importError'));
        return;
      }
      const result = importBundle(parsed);
      if (!result.ok) {
        setImportError(t('settings.importError'));
        return;
      }
      // Réglages "satellites" : ils vivent en dehors du store de match
      // (thème, locale, couleurs équipes, sound, haptic). On les applique
      // ici uniquement si présents et bien typés ; les autres restent
      // inchangés.
      const settings = (parsed as { settings?: unknown }).settings as
        | {
            theme?: 'light' | 'dark' | 'system';
            team1Color?: string;
            team2Color?: string;
            sound?: boolean;
            haptic?: boolean;
          }
        | undefined;
      if (settings?.theme) setTheme(settings.theme);
      if (settings?.team1Color) setTeamColor('team1', settings.team1Color);
      if (settings?.team2Color) setTeamColor('team2', settings.team2Color);
      if (typeof settings?.sound === 'boolean')
        feedback.setSound(settings.sound);
      if (typeof settings?.haptic === 'boolean')
        feedback.setHaptic(settings.haptic);
      // Les joueurs : `importBundle` a déjà reconstruit le registre dans le
      // magasin (profils du fichier, ou migration des noms hérités).
    })();
  };

  /**
   * Le champ de renommage prend le focus dès qu'il paraît, et son contenu est
   * sélectionné : le geste suivant est de RÉÉCRIRE le nom, pas de le compléter.
   *
   * Par une ref de rappel plutôt que par `autoFocus` — la prop vaut un
   * avertissement `jsx-a11y/no-autofocus`, et pour une bonne raison : elle vole
   * le focus au chargement d'une page. Ici le champ naît d'un clic sur
   * « Renommer », donc déplacer le focus est exactement ce qu'il faut faire.
   * `useCallback` garde l'identité stable, sinon React détacherait et
   * rattacherait la ref à chaque frappe.
   */
  const focusRenameField = useCallback((node: HTMLInputElement | null) => {
    node?.focus();
    node?.select();
  }, []);

  const handleRename = () => {
    if (!renaming) return;
    const result = renamePlayer(renaming.id, renaming.value);
    if (result === 'ok') {
      setRenaming(null);
      return;
    }
    setRenaming({
      ...renaming,
      error:
        result === 'duplicate'
          ? t('settingsExtra.renameDuplicate')
          : t('settingsExtra.renameEmpty'),
    });
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
          options={LOCALES.map(l => ({
            value: l,
            label: (
              <span className="text-xl leading-none" aria-hidden>
                {LOCALE_FLAGS[l]}
              </span>
            ),
            srLabel: LOCALE_LABELS[l],
          }))}
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
        title={t('settings.playersLabel')}
        help={t('settings.playersHelp')}
      >
        {players.length === 0 ? (
          <p className="text-sm opacity-50 italic">
            {t('historyExtra.statsNone')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {players.map(player =>
              renaming?.id === player.id ? (
                <span
                  key={player.id}
                  className="inline-flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2"
                  style={{
                    borderColor: 'var(--primary)',
                    background: 'var(--surface-highlight)',
                  }}
                >
                  <input
                    type="text"
                    ref={focusRenameField}
                    value={renaming.value}
                    aria-label={t('settingsExtra.renameLabel', {
                      name: player.name,
                    })}
                    onChange={e =>
                      setRenaming({
                        ...renaming,
                        value: e.target.value,
                        error: null,
                      })
                    }
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    className="min-h-9 rounded-lg border px-2 py-1 text-sm"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRename}
                    className="min-h-9 rounded-lg px-3 py-1 text-sm font-semibold text-white"
                    style={{ background: 'var(--primary)' }}
                  >
                    {t('settingsExtra.renameSave')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenaming(null)}
                    className="min-h-9 rounded-lg border px-3 py-1 text-sm font-semibold"
                    style={{
                      borderColor: 'var(--border)',
                      color: 'var(--muted)',
                    }}
                  >
                    {t('settingsExtra.renameCancel')}
                  </button>
                  {renaming.error && (
                    <span
                      role="alert"
                      className="w-full text-xs font-semibold"
                      style={{ color: 'var(--danger, #dc2626)' }}
                    >
                      {renaming.error}
                    </span>
                  )}
                </span>
              ) : (
                <span
                  key={player.id}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface-highlight)',
                  }}
                >
                  <UserIcon size={14} />
                  {player.name}
                  <button
                    type="button"
                    onClick={() =>
                      setRenaming({
                        id: player.id,
                        value: player.name,
                        error: null,
                      })
                    }
                    className="ml-1 rounded-full p-0.5 hover:bg-black/10"
                    aria-label={t('settingsExtra.renameLabel', {
                      name: player.name,
                    })}
                  >
                    <PencilIcon size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePlayer(player.id)}
                    className="rounded-full p-0.5 hover:bg-black/10"
                    aria-label={t('settingsExtra.playerDelete', {
                      name: player.name,
                    })}
                  >
                    <Trash2Icon size={12} />
                  </button>
                </span>
              )
            )}
          </div>
        )}
      </Section>

      <Section title={t('settings.dataLabel')} help={t('settings.dataHelp')}>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface-highlight)',
              color: 'var(--text)',
            }}
          >
            <DownloadIcon size={16} />
            {t('settings.exportButton')}
          </button>
          <label
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface-highlight)',
              color: 'var(--text)',
            }}
          >
            <UploadIcon size={16} />
            {t('settings.importButton')}
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
        {importError && (
          <p
            role="alert"
            className="mt-2 rounded-lg px-3 py-2 text-xs"
            style={{
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
            }}
          >
            {importError}
          </p>
        )}
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
          <RefreshCwIcon
            size={16}
            className={updating ? 'animate-spin' : undefined}
          />
          {updating ? t('settings.updateChecking') : t('settings.updateButton')}
        </button>
      </Section>

      {hasKeyboard && (
        <Section title={t('shortcuts.title')}>
          <ul className="space-y-1 text-sm" style={{ color: 'var(--text)' }}>
            <li>{t('shortcuts.addTeam1')}</li>
            <li>{t('shortcuts.addTeam2')}</li>
            <li>{t('shortcuts.undo')}</li>
            <li>{t('shortcuts.reset')}</li>
            <li>{t('shortcuts.swap')}</li>
          </ul>
        </Section>
      )}

      <DiagnosticsSection />

      {/* Les deux liens de la règle famille ne sont plus ici : la coquille les
          rend hors des routes, donc sur cet écran comme sur le premier. */}

      <div className="bb-family mt-8">
        <FamilyApps
          currentAppId="miss-badminton"
          showSource={false}
          showSponsor={false}
          labels={
            {
              fr: {
                otherApps: 'Nos autres applications',
                maturity: { alpha: 'Alpha', beta: 'Bêta', stable: 'Stable' },
              },
              en: {
                otherApps: 'Our other apps',
                maturity: { alpha: 'Alpha', beta: 'Beta', stable: 'Stable' },
              },
              es: {
                otherApps: 'Nuestras otras apps',
                maturity: { alpha: 'Alpha', beta: 'Beta', stable: 'Estable' },
              },
            }[locale]
          }
        />
      </div>
    </PageContainer>
  );
}

function DiagnosticsSection() {
  const { t } = useI18n();
  const [count, setCount] = useState(() => getErrorLog().length);

  const handleExport = () => {
    downloadJson(getErrorLog(), `miss-badminton-errors-${dateSlug()}.json`);
  };
  const handleClear = () => {
    clearErrorLog();
    setCount(0);
  };

  if (count === 0) return null;
  return (
    <Section
      title={t('settings.diagnosticsLabel')}
      help={t('settings.diagnosticsHelp', { n: count })}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface-highlight)',
            color: 'var(--text)',
          }}
        >
          <DownloadIcon size={16} />
          {t('settings.diagnosticsExport')}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface-highlight)',
            color: 'var(--muted)',
          }}
        >
          <Trash2Icon size={16} />
          {t('settings.diagnosticsClear')}
        </button>
      </div>
    </Section>
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

interface PillOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Étiquette accessible (utile quand `label` est un drapeau). */
  srLabel?: string;
}

interface PillsProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: PillOption<T>[];
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
            aria-label={opt.srLabel}
            title={opt.srLabel}
            onClick={() => onChange(opt.value)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
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
