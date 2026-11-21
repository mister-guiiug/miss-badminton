/**
 * UN JEU DE DÉMONSTRATION pour le proxy — des tournois et des joueurs
 * FICTIFS.
 *
 * Il sert aux tests, et à essayer l'import sans convention FFBaD :
 * `VITE_EBAD_PROXY_URL=mock` le branche dans l'application, à travers le
 * vrai gestionnaire du proxy. Les dates se placent autour d'aujourd'hui pour
 * que la recherche « à partir d'aujourd'hui » trouve quelque chose.
 */
import type { RemoteTournament, TournamentMatches } from '../ebad-contract';
import type { EbadUpstream } from './upstream';

function dayOffset(days: number, now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function createMockUpstream(now: Date = new Date()): EbadUpstream {
  const day0 = dayOffset(0, now);
  const day1 = dayOffset(1, now);
  const tournaments: RemoteTournament[] = [
    {
      id: 'demo-1',
      name: 'Tournoi de démonstration',
      startDate: day0,
      endDate: day1,
      city: 'Villedémo',
    },
    {
      id: 'demo-2',
      name: 'Plumes d’automne (démo)',
      startDate: dayOffset(14, now),
      endDate: dayOffset(15, now),
      city: 'Bourg-Exemple',
    },
  ];
  const matches: Record<string, TournamentMatches> = {
    'demo-1': {
      tournament: { id: 'demo-1', name: 'Tournoi de démonstration' },
      matches: [
        {
          id: 'm1',
          discipline: 'SH',
          date: day0,
          time: '09:30',
          court: '1',
          round: 'P10 — Poule A',
          reference: '101',
          points: 15,
          team1: { primary: 'ALPHA Jean' },
          team2: { primary: 'BRAVO Paul' },
          score: [
            { team1: 15, team2: 11 },
            { team1: 15, team2: 13 },
          ],
        },
        {
          id: 'm2',
          discipline: 'SD',
          date: day0,
          time: '10:00',
          court: '2',
          round: 'P10 — Poule B',
          reference: '102',
          points: 15,
          team1: { primary: 'CHARLIE Léa' },
          team2: { primary: 'DELTA Zoé' },
        },
        {
          id: 'm3',
          discipline: 'DX',
          date: day1,
          time: '14:15',
          court: '4',
          round: 'D9 — 1/2 finale',
          reference: '210',
          points: 15,
          team1: { primary: 'ALPHA Jean', partner: 'CHARLIE Léa' },
          team2: { primary: 'ECHO Marc', partner: 'DELTA Zoé' },
        },
      ],
    },
    'demo-2': {
      tournament: { id: 'demo-2', name: 'Plumes d’automne (démo)' },
      matches: [],
    },
  };

  const fold = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  return {
    searchTournaments({ q, from, to }) {
      return Promise.resolve(
        tournaments.filter(t => {
          if (q && !fold(`${t.name} ${t.city ?? ''}`).includes(fold(q))) {
            return false;
          }
          if (from && (t.endDate ?? t.startDate ?? '') < from) return false;
          if (to && (t.startDate ?? '') > to) return false;
          return true;
        })
      );
    },
    tournamentMatches(id) {
      return Promise.resolve(matches[id] ?? null);
    },
  };
}
