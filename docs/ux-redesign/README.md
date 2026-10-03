# Propositions UX/UI — Miss Badminton

Board interactif des maquettes de refonte (3 directions × 6 écrans).

## Ouvrir

```bash
# depuis la racine du dépôt
npx --yes serve docs/ux-redesign -p 4177
```

Puis ouvrir [http://localhost:4177](http://localhost:4177).

Ou ouvrir directement `index.html` dans le navigateur.

## Directions

| Id  | Nom                        | Intention                                             |
| --- | -------------------------- | ----------------------------------------------------- |
| A   | **Court Pro** (recommandé) | Sport premium, vert terrain + lime — clubs & tournois |
| B   | **Match Ops**              | SaaS zinc/teal dense — stats & multi-matchs           |
| C   | **Broadcast**              | Régie TV sombre — tablette / projection               |

## Écrans couverts

Accueil · Assistant match · Scoreboard · Fin de match · Historique · Paramètres  
(chacun en mobile + desktop dans le board)

## Rendus haute fidélité

Fichiers `.jpg` à côté de `index.html` (accueil, scoreboard, historique, wizard/paramètres).

## Mobile paysage — bandes latérales

Le terrain reste en **16:10** (non étiré). Board dédié :

- [`landscape-mobile.html`](./landscape-mobile.html) — 4 propositions pour les gouttières
- `miss-badminton-landscape-*.jpg` — rendus A/B/C
