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
  RotateCwIcon,
  Trash2Icon,
  TrophyIcon,
} from '../components/icons';
import { useMatchStore } from '../../store/useMatchStore';

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
}

function computeStats(matches: SavedMatch[]): {
  total: number;
  topPlayer: PlayerStat | null;
  totalDurationMs: number;
} {
  if (matches.length === 0)
    return { total: 0, topPlayer: null, totalDurationMs: 0 };
  const stats = new Map<string, PlayerStat>();
  let totalDurationMs = 0;

  const bump = (name: string, won: boolean) => {
    const key = name.trim().toLowerCase();
    if (!key) return;
    const existing = stats.get(key) ?? {
      name: name.trim(),
      wins: 0,
      total: 0,
      winRate: 0,
    };
    existing.total += 1;
    if (won) existing.wins += 1;
    existing.winRate = (existing.wins / existing.total) * 100;
    stats.set(key, existing);
  };

  for (const m of matches) {
    totalDurationMs += m.durationMs ?? 0;
    const names1 = [m.config.team1.primary, m.config.team1.partner].filter(
      (n): n is string => !!n && n.trim().length > 0
    );
    const names2 = [m.config.team2.primary, m.config.team2.partner].filter(
      (n): n is string => !!n && n.trim().length > 0
    );
    const winner1 = m.winner === 'team1';
    names1.forEach(n => bump(n, winner1));
    names2.forEach(n => bump(n, !winner1));
  }

  let best: PlayerStat | null = null;
  for (const stat of stats.values()) {
    if (stat.total < 1) continue;
    if (
      !best ||
      stat.winRate > best.winRate ||
      (stat.winRate === best.winRate && stat.total > best.total)
    ) {
      best = stat;
    }
  }
  return { total: matches.length, topPlayer: best, totalDurationMs };
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
  } = useMatchStore();
  const [clearOpen, setClearOpen] = useState(false);

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

  const stats = useMemo(() => computeStats(matches), [matches]);

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

      {matches.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-3xl border py-16 text-center"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            color: 'var(--muted)',
          }}
        >
          <HistoryIcon size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">{t('history.empty')}</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {matches.map(match => {
            const t1 = teamLabel(match.config.team1, t('players.player1'));
            const t2 = teamLabel(match.config.team2, t('players.player2'));
            const winnerName = match.winner === 'team1' ? t1 : t2;
            const setsLine = match.setScores
              .map(s => `${s.team1}-${s.team2}`)
              .join(', ');
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
                      onClick={() => handleReplay(match)}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
                      style={{ color: 'var(--primary)' }}
                    >
                      <RotateCwIcon size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromHistory(match.id)}
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
                  <span className="text-xs font-medium opacity-40">
                    {setsLine}
                  </span>
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
    </PageContainer>
  );
}
