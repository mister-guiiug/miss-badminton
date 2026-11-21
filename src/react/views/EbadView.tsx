import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@mister-guiiug/dev-pwa-config/react/confirm-dialog';
import { useI18n } from '../../i18n';
import type { Locale } from '../../i18n/messages';
import { PageContainer } from '../components/layout/PageContainer';
import {
  MatchSetupWizard,
  type MatchConfig,
  type Team,
} from '../components/MatchSetupWizard';
import { EbadMatchForm } from '../components/EbadMatchForm';
import {
  EbadLinkSheet,
  type EbadLinkCandidate,
} from '../components/EbadLinkSheet';
import {
  CalendarIcon,
  LinkIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  Trash2Icon,
} from '../components/icons';
import {
  compareReported,
  configFromEbad,
  ebadTeamLabel,
  formatSets,
  groupByTournament,
  knownTournaments,
  linkScore,
  scoreForEbad,
  suggestSavedMatches,
  type EbadMatch,
} from '../../ebad';
import { useEbadStore } from '../../store/useEbadStore';
import { useMatchStore } from '../../store/useMatchStore';
import { indexById, teamDisplayNames, teamLabel } from '../../players';
import type { SavedMatch } from '../../schemas';

function formatDay(date: string | undefined, locale: Locale): string | null {
  if (!date) return null;
  const ts = Date.parse(`${date}T12:00:00`);
  if (Number.isNaN(ts)) return date;
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(ts);
  } catch {
    return date;
  }
}

function formatDateTime(timestamp: number, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

const secondaryButton =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors';

/**
 * TOURNOIS eBad — préparer un match de tournoi, et rapprocher son résultat.
 *
 * Le parcours d'un jour de tournoi : on recopie depuis eBad les matchs qu'on
 * va jouer ou arbitrer (tableau, terrain, joueurs), on touche « Préparer » et
 * l'assistant s'ouvre prérempli ; le match scoré en direct se lie tout seul à
 * son match eBad en finissant. Un match scoré sans préparation se lie à la
 * main, ici ou depuis l'historique, avec des suggestions.
 *
 * Une fois lié, la carte donne le score À SAISIR dans eBad, dans l'ordre des
 * équipes eBad, et le compare à celui qui y a été saisi s'il a été recopié.
 */
export function EbadView() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { matches, addMatch, updateMatch, removeMatch, link, unlink } =
    useEbadStore();
  const {
    match: activeMatch,
    matchWinner,
    setMatch,
    matchHistory,
    historyHydrated,
    players,
  } = useMatchStore();

  const byId = useMemo(() => indexById(players), [players]);
  const namesOf = useCallback(
    (team: Team) => teamDisplayNames(team, byId),
    [byId]
  );
  const historyById = useMemo(
    () => new Map(matchHistory.map(m => [m.id, m])),
    [matchHistory]
  );
  const groups = useMemo(() => groupByTournament(matches), [matches]);
  const tournaments = useMemo(() => knownTournaments(matches), [matches]);
  const playerNames = useMemo(() => players.map(p => p.name), [players]);

  const [form, setForm] = useState<
    { mode: 'add' } | { mode: 'edit'; match: EbadMatch } | null
  >(null);
  const [linkTarget, setLinkTarget] = useState<EbadMatch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EbadMatch | null>(null);
  const [confirmPrepare, setConfirmPrepare] = useState<EbadMatch | null>(null);
  const [wizardConfig, setWizardConfig] = useState<MatchConfig | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedId) return;
    const timer = setTimeout(() => setCopiedId(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedId]);

  const savedLabel = (m: SavedMatch) =>
    `${teamLabel(m.config.team1, t('players.player1'), byId)} vs ${teamLabel(
      m.config.team2,
      t('players.player2'),
      byId
    )}`;

  /*
   * PRÉPARER REMPLACE LE MATCH EN COURS — on le dit avant. Un match fini
   * (vainqueur posé) n'a plus rien à perdre : pas de question.
   */
  const prepare = (e: EbadMatch) => {
    if (activeMatch && !matchWinner) {
      setConfirmPrepare(e);
      return;
    }
    setWizardConfig(configFromEbad(e));
  };

  const copy = (id: string, text: string) => {
    try {
      void navigator.clipboard
        ?.writeText(text)
        .then(() => setCopiedId(id))
        .catch(() => {
          /* presse-papiers refusé : le score reste lisible à l'écran */
        });
    } catch {
      /* navigateur sans presse-papiers */
    }
  };

  const candidates: EbadLinkCandidate[] = linkTarget
    ? suggestSavedMatches(linkTarget, matchHistory, matches, namesOf).map(
        ({ match, assessment }) => ({
          id: match.id,
          primary: `${savedLabel(match)} — ${formatSets(match.setScores)}`,
          secondary: formatDateTime(match.completedAt, locale),
          likely: assessment.likely,
          current: linkTarget.linkedMatchId === match.id,
        })
      )
    : [];

  return (
    <PageContainer width="lg">
      <header className="flex flex-col gap-2 pt-2">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <CalendarIcon size={24} />
          {t('ebad.title')}
        </h1>
        <p className="max-w-2xl text-sm" style={{ color: 'var(--muted)' }}>
          {t('ebad.intro')}
        </p>
        <p className="max-w-2xl text-xs" style={{ color: 'var(--muted)' }}>
          {t('ebad.noApi')}
        </p>
      </header>

      <button
        type="button"
        onClick={() => setForm({ mode: 'add' })}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-bold sm:w-auto sm:self-start"
        style={{
          background: 'var(--cta)',
          color: 'var(--cta-ink)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <PlusIcon size={20} strokeWidth={3} />
        {t('ebad.add')}
      </button>

      {groups.length === 0 ? (
        <p
          className="rounded-2xl border px-4 py-6 text-center text-sm"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            color: 'var(--muted)',
          }}
        >
          {t('ebad.empty')}
        </p>
      ) : (
        groups.map(group => (
          <section
            key={group.tournament}
            className="flex flex-col gap-2"
            aria-label={group.tournament}
          >
            <h2
              className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--muted)' }}
            >
              {group.tournament}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {group.matches.map(e => {
                const saved = e.linkedMatchId
                  ? historyById.get(e.linkedMatchId)
                  : undefined;
                const missing = !!e.linkedMatchId && !saved && historyHydrated;
                const toReport = saved
                  ? formatSets(scoreForEbad(e, saved, namesOf))
                  : null;
                const swapped =
                  saved &&
                  linkScore(e, saved, namesOf).orientation === 'swapped';
                const reportedState = compareReported(e, saved, namesOf);
                const meta = [
                  formatDay(e.date, locale),
                  e.time,
                  e.court ? t('ebad.courtShort', { n: e.court }) : null,
                  e.reference ? t('ebad.refShort', { n: e.reference }) : null,
                ].filter(Boolean);
                return (
                  <li
                    key={e.id}
                    className="flex flex-col gap-3 rounded-2xl border"
                    style={{
                      background: 'var(--surface)',
                      borderColor: saved ? 'var(--primary)' : 'var(--border)',
                      color: 'var(--text)',
                      padding: '1rem',
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className="rounded-md px-1.5 py-0.5 font-bold"
                        style={{
                          background: 'var(--surface-highlight)',
                        }}
                        title={t(`ebad.discipline${e.discipline}`)}
                      >
                        {e.discipline}
                      </span>
                      {e.round && (
                        <span className="font-semibold">{e.round}</span>
                      )}
                      {meta.length > 0 && (
                        <span style={{ color: 'var(--muted)' }}>
                          {meta.join(' · ')}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <p className="truncate text-base font-bold">
                        {ebadTeamLabel(e.team1)}
                      </p>
                      <p
                        className="text-[0.65rem] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--muted)' }}
                      >
                        vs
                      </p>
                      <p className="truncate text-base font-bold">
                        {ebadTeamLabel(e.team2)}
                      </p>
                    </div>

                    <div
                      className="flex flex-col gap-1.5 border-t pt-3 text-sm"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      {saved && toReport !== null ? (
                        <>
                          <p
                            className="text-xs font-semibold"
                            style={{ color: 'var(--primary)' }}
                          >
                            {t('ebad.statusLinked')} ·{' '}
                            {formatDateTime(saved.completedAt, locale)}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs opacity-70">
                              {t('ebad.scoreToReport')}
                            </span>
                            <span className="font-mono text-base font-bold tabular-nums">
                              {toReport}
                            </span>
                            <button
                              type="button"
                              onClick={() => copy(e.id, toReport)}
                              className={secondaryButton}
                              style={{
                                borderColor: 'var(--border)',
                                color: 'var(--text)',
                              }}
                            >
                              {copiedId === e.id
                                ? t('ebad.copied')
                                : t('ebad.copy')}
                            </button>
                          </div>
                          {swapped && (
                            <p className="text-xs opacity-70">
                              {t('ebad.swappedNote')}
                            </p>
                          )}
                          <p
                            className="text-xs font-semibold"
                            style={{
                              color:
                                reportedState === 'mismatch'
                                  ? 'var(--danger, #dc2626)'
                                  : reportedState === 'match'
                                    ? 'var(--success, #16a34a)'
                                    : 'var(--muted)',
                            }}
                          >
                            {reportedState === 'match'
                              ? t('ebad.reportedOk')
                              : reportedState === 'mismatch'
                                ? t('ebad.reportedMismatch', {
                                    reported: formatSets(e.reportedScore ?? []),
                                  })
                                : t('ebad.reportedNone')}
                          </p>
                        </>
                      ) : (
                        <p
                          className="text-xs font-semibold"
                          style={{ color: 'var(--muted)' }}
                        >
                          {missing
                            ? t('ebad.statusMissing')
                            : t('ebad.statusToPlay')}
                          {e.reportedScore && e.reportedScore.length > 0
                            ? ` · ${t('ebad.reportedScore')} : ${formatSets(e.reportedScore)}`
                            : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!e.linkedMatchId && (
                        <button
                          type="button"
                          onClick={() => prepare(e)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--primary-ink)]"
                          style={{ background: 'var(--primary)' }}
                        >
                          <PlayIcon size={14} fill="currentColor" />
                          {t('ebad.prepare')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setLinkTarget(e)}
                        className={secondaryButton}
                        style={{
                          borderColor: 'var(--border)',
                          color: 'var(--text)',
                        }}
                      >
                        <LinkIcon size={14} />
                        {e.linkedMatchId
                          ? t('ebad.changeLink')
                          : t('ebad.link')}
                      </button>
                      {e.linkedMatchId && (
                        <button
                          type="button"
                          onClick={() => unlink(e.id)}
                          className={secondaryButton}
                          style={{
                            borderColor: 'var(--border)',
                            color: 'var(--muted)',
                          }}
                        >
                          {t('ebad.unlink')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setForm({ mode: 'edit', match: e })}
                        className={secondaryButton}
                        style={{
                          borderColor: 'var(--border)',
                          color: 'var(--muted)',
                        }}
                        aria-label={`${t('ebad.edit')} — ${ebadTeamLabel(e.team1)} vs ${ebadTeamLabel(e.team2)}`}
                      >
                        <PencilIcon size={14} />
                        {t('ebad.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(e)}
                        className={secondaryButton}
                        style={{
                          borderColor: 'var(--border)',
                          color: 'var(--muted)',
                        }}
                        aria-label={`${t('ebad.delete')} — ${ebadTeamLabel(e.team1)} vs ${ebadTeamLabel(e.team2)}`}
                      >
                        <Trash2Icon size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {form && (
        <EbadMatchForm
          initial={form.mode === 'edit' ? form.match : undefined}
          tournaments={tournaments}
          players={playerNames}
          onCancel={() => setForm(null)}
          onSave={input => {
            if (form.mode === 'edit') updateMatch(form.match.id, input);
            else addMatch(input);
            setForm(null);
          }}
        />
      )}

      {linkTarget && (
        <EbadLinkSheet
          title={t('ebad.linkTitle')}
          closeLabel={t('ebad.cancel')}
          suggestedLabel={t('ebad.suggested')}
          emptyText={t('ebad.noCandidates')}
          candidates={candidates}
          onPick={id => {
            link(linkTarget.id, id);
            setLinkTarget(null);
          }}
          onClose={() => setLinkTarget(null)}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        className="z-[80]"
        title={t('confirm.title')}
        message={t('ebad.confirmDelete')}
        confirmLabel={t('confirm.confirm')}
        cancelLabel={t('confirm.cancel')}
        destructive
        onConfirm={() => {
          if (deleteTarget) removeMatch(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={confirmPrepare !== null}
        className="z-[80]"
        title={t('confirm.title')}
        message={t('ebad.activeMatchWarning')}
        confirmLabel={t('confirm.confirm')}
        cancelLabel={t('confirm.cancel')}
        onConfirm={() => {
          if (confirmPrepare) setWizardConfig(configFromEbad(confirmPrepare));
          setConfirmPrepare(null);
        }}
        onCancel={() => setConfirmPrepare(null)}
      />

      {wizardConfig && (
        <MatchSetupWizard
          initial={wizardConfig}
          onCancel={() => setWizardConfig(null)}
          onComplete={config => {
            setWizardConfig(null);
            setMatch(config);
            navigate('/match');
          }}
        />
      )}
    </PageContainer>
  );
}
