import { Link } from 'react-router-dom';

export function HomeView() {
  return (
    <div className="max-w-lg mx-auto text-center py-12 space-y-8">
      <div className="text-6xl">🏸</div>
      <h1 className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>
        Miss Badminton
      </h1>
      <p style={{ color: 'var(--muted)' }}>
        Suivez vos scores et statistiques de badminton en temps réel.
      </p>
      <div className="flex flex-col gap-3">
        <Link
          to="/match"
          className="inline-block rounded-xl px-6 py-3 font-semibold text-white"
          style={{ background: 'var(--primary)' }}
        >
          Nouveau match
        </Link>
        <Link
          to="/historique"
          className="inline-block rounded-xl px-6 py-3 font-semibold"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          Voir l'historique
        </Link>
      </div>
    </div>
  );
}
