import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/useI18n';
import { type SavedMatch } from '../../storage';
import type { Locale } from '../../i18n/messages';
import { useTeamColors } from '../hooks/useTeamColors';
import { PageContainer } from '../components/layout/PageContainer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  FlameIcon,
  HistoryIcon,
  PencilIcon,
  RotateCwIcon,
  Share2Icon,
  Trash2Icon,
  TrophyIcon,
} from '../components/icons';
import { useMatchStore } from '../../store/useMatchStore';
import { buildShareText, shareText } from '../../share';

function teamLabel(team: SavedMatch['config']['team1'], fallback: string) {
  const primary = team.primary || fallback;
  if (team.partner !== undefined) {
    const partner = team.partner || '';
    return partner ? `${primary} & ${partner}` : primary;
  }
  return primary;
}

function formatDate(timestamp: number, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

interface PlayerStat {
  name: string;
  wins: number;
  total: number;
  winRate: number;
  /** Plus longue série de victoires consécutives. */
  maxStreak: number;
  /** Durée totale jouée (ms) sur les matches inclus dans la période. */
  durationMs: number;
}

interface HeadToHead {
  a: string;
  b: string;
  winsA: number;
  winsB: number;
}

function namesOfTeam(team: SavedMatch['config']['team1']): string[] {
  return [team.primary, team.partner].filter(
    (n): n is string => !!n && n.trim().length > 0
  );
}

type PeriodFilter = 'all' | '7d' | '30d';

function filterByPeriod(
  matches: SavedMatch[],
  period: PeriodFilter,
  now = Date.now()
): SavedMatch[] {
  if (period === 'all') return matches;
  const days = period === '7d' ? 7 : 30;
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return matches.filter(m => m.completedAt >= cutoff);
}

function computeStats(matches: SavedMatch[]): {
  total: number;
  topPlayer: PlayerStat | null;
  totalDurationMs: number;
  leaderboard: PlayerStat[];
  headToHead: HeadToHead[];
} {
  if (matches.length === 0)
    return {
      total: 0,
      topPlayer: null,
      totalDurationMs: 0,
      leaderboard: [],
      headToHead: [],
    };
  const stats = new Map<string, PlayerStat>();
  const h2hMap = new Map<string, HeadToHead>();
  let totalDurationMs = 0;

  const bump = (
    name: string,
    won: boolean,
    durationMs: number,
    streak: number
  ) => {
    const key = name.trim().toLowerCase();
    if (!key) return;
    const existing = stats.get(key) ?? {
      name: name.trim(),
      wins: 0,
      total: 0,
      winRate: 0,
      maxStreak: 0,
      durationMs: 0,
    };
    existing.total += 1;
    if (won) existing.wins += 1;
    existing.winRate = (existing.wins / existing.total) * 100;
    existing.maxStreak = Math.max(existing.maxStreak, streak);
    existing.durationMs += durationMs;
    stats.set(key, existing);
  };

  for (const m of matches) {
    const d = m.durationMs ?? 0;
    totalDurationMs += d;
    const names1 = namesOfTeam(m.config.team1);
    const names2 = namesOfTeam(m.config.team2);
    const winner1 = m.winner === 'team1';
    const streak1 = m.maxStreak?.team1 ?? 0;
    const streak2 = m.maxStreak?.team2 ?? 0;
    names1.forEach(n => bump(n, winner1, d, streak1));
    names2.forEach(n => bump(n, !winner1, d, streak2));

    // Head-to-head : on enregistre l'affrontement uniquement en simple,
    // pour éviter de devoir choisir comment compter en double (1 vs équipe
    // de 2 ou 4 paires possibles). En simple, paire = {team1.primary, team2.primary}.
    if (m.config.type === 'singles') {
      const a = m.config.team1.primary.trim();
      const b = m.config.team2.primary.trim();
      if (!a || !b) continue;
      const [low, high] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
      const key = `${low.toLowerCase()}|${high.toLowerCase()}`;
      const existing = h2hMap.get(key) ?? {
        a: low,
        b: high,
        winsA: 0,
        winsB: 0,
      };
      // Le "winner du match" peut être team1 ou team2, et a/b sont
      // remappés alphabétiquement : on retraduit.
      const winnerName = winner1 ? a : b;
      if (winnerName.toLowerCase() === low.toLowerCase()) existing.winsA += 1;
      else existing.winsB += 1;
      h2hMap.set(key, existing);
    }
  }

  const leaderboard = [...stats.values()].sort((x, y) => {
    if (y.winRate !== x.winRate) return y.winRate - x.winRate;
    if (y.wins !== x.wins) return y.wins - x.wins;
    return y.total - x.total;
  });

  const headToHead = [...h2hMap.values()]
    .filter(h => h.winsA + h.winsB >= 2)
    .sort((x, y) => y.winsA + y.winsB - (x.winsA + x.winsB));

  return {
    total: matches.length,
    topPlayer: leaderboard[0] ?? null,
    totalDurationMs,
    leaderboard,
    headToHead,
  };
}

export function HistoryView() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const colors = useTeamColors();
  const {
    matchHistory: matches,
    removeFromHistory,
    clearHistory,
    setMatch,
    editHistorySetScore,
  } = useMatchStore();
  const [clearOpen, setClearOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    matchId: string;
    setIndex: number;
    initial: { team1: number; team2: number };
  } | null>(null);

  const handleClear = () => {
    setClearOpen(true);
  };

  const confirmClear = () => {
    clearHistory();
    setClearOpen(false);
  };

  const handleReplay = (m: SavedMatch) => {
    setMatch(m.config);
    navigate('/match');
  };

  const [period, setPeriod] = useState<PeriodFilter>('all');
  const filteredMatches = useMemo(
    () => filterByPeriod(matches, period),
    [matches, period]
  );
  const stats = useMemo(
    () => computeStats(filteredMatches),
    [filteredMatches]
  );

  return (
    <PageContainer width="xl">
      <header className="flex items-center justify-between gap-3">
        <h1
          className="font-bold"
          style={{
            color: 'var(--primary)',
            fontSize: 'clamp(1.5rem, 4.5vw, 2.25rem)',
          }}
        >
          {t('history.title')}
        </h1>
        {matches.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex min-h-9 items-center rounded-lg border px-3 py-1 text-xs font-semibold"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--muted)',
            }}
          >
            {t('history.clearAll')}
          </button>
        )}
      </header>

      {matches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('historyExtra.periodLabel')}>
          {(['all', '30d', '7d'] as PeriodFilter[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className="inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
              style={{
                borderColor: period === p ? 'var(--primary)' : 'var(--border)',
                background:
                  period === p ? 'var(--primary)' : 'var(--surface-highlight)',
                color: period === p ? 'white' : 'var(--text)',
              }}
            >
              {p === 'all'
                ? t('historyExtra.periodAll')
                : p === '30d'
                  ? t('historyExtra.period30d')
                  : t('historyExtra.period7d')}
            </button>
          ))}
        </div>
      )}

      {filteredMatches.length > 0 && (
        <section
          aria-label={t('historyExtra.statsTitle')}
          className="grid grid-cols-2 gap-4 rounded-3xl border md:grid-cols-3"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            padding: '1.5rem',
          }}
        >
          <div className="flex flex-col gap-1">
            <p
              className="text-[0.65rem] font-bold uppercase tracking-widest"
              style={{ color: 'var(--muted)' }}
            >
              {t('settings.totalMatches')}
            </p>
            <p
              className="text-3xl font-black"
              style={{ color: 'var(--primary)' }}
            >
              {stats.total}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <p
              className="text-[0.65rem] font-bold uppercase tracking-widest"
              style={{ color: 'var(--muted)' }}
            >
              {t('settings.playTime')}
            </p>
            <p className="text-3xl font-black" style={{ color: 'var(--text)' }}>
              {formatDuration(stats.totalDurationMs)}
            </p>
          </div>

          <div className="col-span-2 flex flex-col gap-1 md:col-span-1">
            <p
              className="text-[0.65rem] font-bold uppercase tracking-widest"
              style={{ color: 'var(--muted)' }}
            >
              {t('historyExtra.statsWinRate')}
            </p>
            {stats.topPlayer ? (
              <div className="flex items-baseline gap-2">
                <p
                  className="text-2xl font-black"
                  style={{ color: 'var(--primary)' }}
                >
                  {stats.topPlayer.name}
                </p>
                <p className="text-sm font-bold opacity-60">
                  {stats.topPlayer.wins}/{stats.topPlayer.total} (
                  {stats.topPlayer.winRate.toFixed(0)}%)
                </p>
              </div>
            ) : (
              <p className="text-lg font-bold opacity-40">
                {t('historyExtra.statsNone')}
              </p>
            )}
          </div>
        </section>
      )}

      {stats.leaderboard.length >= 2 && (
        <section
          aria-labelledby="leaderboard-title"
          className="rounded-3xl border"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            padding: '1.25rem 1.5rem',
          }}
        >
          <h2
            id="leaderboard-title"
            className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
            style={{ color: 'var(--muted)' }}
          >
            <TrophyIcon size={14} />
            {t('historyExtra.leaderboardTitle')}
          </h2>
          <ol className="flex flex-col">
            {stats.leaderboard.slice(0, 8).map((p, i) => (
              <li
                key={p.name}
                className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0"
                style={{ borderColor: 'var(--border)' }}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span
                    className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-black"
                    style={{
                      background:
                        i === 0
                          ? 'var(--primary)'
                          : 'var(--surface-highlight)',
                      color: i === 0 ? 'white' : 'var(--muted)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-sm font-bold">{p.name}</span>
                </span>
                <span className="flex items-center gap-3 text-xs tabular-nums opacity-70">
                  <span className="font-medium">
                    {p.wins}/{p.total}
                  </span>
                  <span className="font-black" style={{ color: 'var(--primary)' }}>
                    {p.winRate.toFixed(0)}%
                  </span>
                  {p.maxStreak > 1 && (
                    <span className="hidden items-center gap-1 sm:flex">
                      <FlameIcon size={11} />
                      {p.maxStreak}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {stats.headToHead.length > 0 && (
        <section
          aria-labelledby="h2h-title"
          className="rounded-3xl border"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            padding: '1.25rem 1.5rem',
          }}
        >
          <h2
            id="h2h-title"
            className="mb-3 text-sm font-bold uppercase tracking-wider"
            style={{ color: 'var(--muted)' }}
          >
            {t('historyExtra.h2hTitle')}
          </h2>
          <ul className="flex flex-col gap-2">
            {stats.headToHead.slice(0, 5).map(h => (
              <li
                key={`${h.a}|${h.b}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="truncate text-sm font-medium">
                  {h.a} <span className="opacity-40">vs</span> {h.b}
                </span>
                <span className="font-black tabular-nums" style={{ color: 'var(--primary)' }}>
                  {h.winsA} – {h.winsB}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {filteredMatches.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-3xl border py-16 text-center"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            color: 'var(--muted)',
          }}
        >
          <HistoryIcon size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">
            {matches.length === 0
              ? t('history.empty')
              : t('historyExtra.periodEmpty')}
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {filteredMatches.map(match => {
            const t1 = teamLabel(match.config.team1, t('players.player1'));
            const t2 = teamLabel(match.config.team2, t('players.player2'));
            const winnerName = match.winner === 'team1' ? t1 : t2;
            return (
              <li
                key={match.id}
                className="group relative flex flex-col gap-4 rounded-3xl border transition-all hover:shadow-lg"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  padding: '1.25rem',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest opacity-40">
                    {formatDate(match.completedAt, locale)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const text = buildShareText(match, {
                          team1: t1,
                          team2: t2,
                          template: params =>
                            t('scoreboard.shareBody', params),
                        });
                        void shareText(t('scoreboard.shareTitle'), text);
                      }}
                      aria-label={t('scoreboard.share')}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
                      style={{ color: 'var(--muted)' }}
                    >
                      <Share2Icon size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReplay(match)}
                      aria-label={t('historyExtra.replay')}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
                      style={{ color: 'var(--primary)' }}
                    >
                      <RotateCwIcon size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromHistory(match.id)}
                      aria-label={t('history.delete')}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
                      style={{ color: 'var(--muted)' }}
                    >
                      <Trash2Icon size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-lg font-black ${match.winner === 'team1' ? '' : 'opacity-40'}`}
                      style={{
                        color:
                          match.winner === 'team1' ? colors.team1 : undefined,
                      }}
                    >
                      {t1}
                    </p>
                    <p
                      className={`truncate text-lg font-black ${match.winner === 'team2' ? '' : 'opacity-40'}`}
                      style={{
                        color:
                          match.winner === 'team2' ? colors.team2 : undefined,
                      }}
                    >
                      {t2}
                    </p>
                  </div>
                  <div className="text-right text-3xl font-black tabular-nums tracking-tighter">
                    {match.finalSetWins.team1}{' '}
                    <span className="opacity-20">–</span>{' '}
                    {match.finalSetWins.team2}
                  </div>
                </div>

                <div
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-60">
                    <TrophyIcon size={14} />
                    {winnerName}
                  </span>
                  <ul
                    className="flex flex-wrap gap-1"
                    aria-label={t('historyExtra.setsLabel')}
                  >
                    {match.setScores.map((s, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() =>
                            setEditTarget({
                              matchId: match.id,
                              setIndex: i,
                              initial: { team1: s.team1, team2: s.team2 },
                            })
                          }
                          aria-label={t('historyExtra.editSetAria', {
                            n: i + 1,
                          })}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium opacity-50 transition-opacity hover:opacity-100 focus:opacity-100"
                          style={{
                            background: 'var(--surface-highlight)',
                            color: 'var(--text)',
                          }}
                        >
                          {s.team1}-{s.team2}
                          <PencilIcon size={10} className="opacity-50" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="ml-auto flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest opacity-40">
                    {typeof match.durationMs === 'number' && (
                      <span className="flex items-center gap-1">
                        ⏱ {formatDuration(match.durationMs)}
                      </span>
                    )}
                    {match.maxStreak && (
                      <span className="flex items-center gap-1">
                        <FlameIcon size={12} />
                        {Math.max(match.maxStreak.team1, match.maxStreak.team2)}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {clearOpen && (
        <ConfirmDialog
          message={t('history.confirmClear')}
          danger
          onConfirm={confirmClear}
          onCancel={() => setClearOpen(false)}
        />
      )}

      {editTarget && (
        <EditSetDialog
          initial={editTarget.initial}
          title={t('historyExtra.editSetTitle', { n: editTarget.setIndex + 1 })}
          cancelLabel={t('historyExtra.editSetCancel')}
          confirmLabel={t('historyExtra.editSetSave')}
          onCancel={() => setEditTarget(null)}
          onConfirm={({ team1, team2 }) => {
            editHistorySetScore(
              editTarget.matchId,
              editTarget.setIndex,
              team1,
              team2
            );
            setEditTarget(null);
          }}
        />
      )}
    </PageContainer>
  );
}

interface EditSetDialogProps {
  initial: { team1: number; team2: number };
  title: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (next: { team1: number; team2: number }) => void;
}

function EditSetDialog({
  initial,
  title,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: EditSetDialogProps) {
  const [t1, setT1] = useState(initial.team1);
  const [t2, setT2] = useState(initial.team2);
  const invalid = t1 < 0 || t2 < 0 || (t1 === t2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/55" onClick={onCancel} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-5 shadow-2xl"
        style={{ background: 'var(--surface)', color: 'var(--text)' }}
      >
        <h3 className="mb-4 text-base font-bold">{title}</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            <span className="opacity-60">Team 1</span>
            <input
              type="number"
              min={0}
              value={t1}
              onChange={e => setT1(Number(e.target.value))}
              className="rounded-lg border px-3 py-2 text-base"
              style={{
                background: 'var(--surface-highlight)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            <span className="opacity-60">Team 2</span>
            <input
              type="number"
              min={0}
              value={t2}
              onChange={e => setT2(Number(e.target.value))}
              className="rounded-lg border px-3 py-2 text-base"
              style={{
                background: 'var(--surface-highlight)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--muted)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={invalid}
            onClick={() => onConfirm({ team1: t1, team2: t2 })}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--primary)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
