import { useCallback, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { storage, type SavedMatch } from '../../storage';
import type { Locale } from '../../i18n/messages';
import { useTeamColors } from '../hooks/useTeamColors';
import { PageContainer } from '../components/layout/PageContainer';

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

export function HistoryView() {
  const { t, locale } = useI18n();
  const colors = useTeamColors();
  const [matches, setMatches] = useState<SavedMatch[]>(() =>
    storage.loadHistory()
  );

  const refresh = useCallback(() => {
    setMatches(storage.loadHistory());
  }, []);

  const handleDelete = (id: string) => {
    storage.removeMatchFromHistory(id);
    refresh();
  };

  const handleClear = () => {
    if (!window.confirm(t('history.confirmClear'))) return;
    storage.clearHistory();
    refresh();
  };

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

      {matches.length === 0 ? (
        <p
          className="rounded-2xl border text-center text-sm"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            color: 'var(--muted)',
            padding: 'clamp(1rem, 3.2vw, 1.75rem)',
          }}
        >
          {t('history.empty')}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-2">
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
                className="flex items-start justify-between gap-3 rounded-2xl border"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  padding: 'clamp(0.75rem, 2.4vw, 1.25rem)',
                }}
              >
                <div className="flex-1 space-y-1">
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {t('history.matchOn', {
                      date: formatDate(match.completedAt, locale),
                    })}
                  </p>
                  <p
                    className="font-semibold break-words"
                    style={{ fontSize: 'clamp(0.95rem, 2.4vw, 1.125rem)' }}
                  >
                    <span
                      style={{
                        color:
                          match.winner === 'team1' ? colors.team1 : undefined,
                      }}
                    >
                      {t1}
                    </span>
                    {'  '}
                    <span
                      style={{ color: 'var(--muted)' }}
                      className="font-medium"
                    >
                      {match.finalSetWins.team1}–{match.finalSetWins.team2}
                    </span>
                    {'  '}
                    <span
                      style={{
                        color:
                          match.winner === 'team2' ? colors.team2 : undefined,
                      }}
                    >
                      {t2}
                    </span>
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    🏆 {winnerName} · {setsLine}
                  </p>
                  <div
                    className="flex flex-wrap gap-3 pt-1 text-xs"
                    style={{ color: 'var(--muted)' }}
                  >
                    {typeof match.durationMs === 'number' && (
                      <span>
                        ⏱{' '}
                        {t('history.duration', {
                          time: formatDuration(match.durationMs),
                        })}
                      </span>
                    )}
                    {match.maxStreak && (
                      <span>
                        🔥{' '}
                        {t('history.maxStreak', {
                          a: match.maxStreak.team1,
                          b: match.maxStreak.team2,
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(match.id)}
                  aria-label={t('history.delete')}
                  className="flex touch-target items-center justify-center rounded-md text-base leading-none hover:bg-black/5"
                  style={{ color: 'var(--muted)' }}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
