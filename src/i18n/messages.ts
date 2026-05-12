export type Locale = 'fr' | 'en';

export const LOCALES: Locale[] = ['fr', 'en'];

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
};

export interface Messages {
  appName: string;
  nav: {
    home: string;
    match: string;
    history: string;
    settings: string;
    openMenu: string;
    closeMenu: string;
    menuLabel: string;
  };
  documentTitle: {
    home: string;
    match: string;
    history: string;
    settings: string;
  };
  home: {
    subtitleEmpty: string;
    subtitleReady: string;
    newMatch: string;
    viewHistory: string;
    scoreboardLabel: string;
  };
  scoreboard: {
    title: string;
    swap: string;
    edit: string;
    reset: string;
    addPoint: string;
    historyAria: string;
    settingsAria: string;
    holdHint: string;
    serviceFor: string;
  };
  wizard: {
    closeLabel: string;
    stepLabel: string;
    typeTitle: string;
    rulesTitle: string;
    playersTitle: string;
    singlesTitle: string;
    singlesSubtitle: string;
    doublesTitle: string;
    doublesSubtitle: string;
    sets: string;
    points: string;
    sideChange: string;
    sideChangeDecisive: string;
    sideChangeEachSet: string;
    sideChangeMidMatch: string;
    redTeam: string;
    blueTeam: string;
    back: string;
    next: string;
    start: string;
  };
  players: {
    player1: string;
    player2: string;
    partner1: string;
    partner2: string;
  };
  fullscreen: {
    message: string;
    activate: string;
    dismiss: string;
    dialogLabel: string;
  };
  matchOver: {
    label: string;
    winnerText: string;
    score: string;
    newMatch: string;
  };
  scoreboardExtra: {
    invertPlayers: string;
  };
  settings: {
    languageLabel: string;
    languageHelp: string;
  };
}

const fr: Messages = {
  appName: 'Miss Badminton',
  nav: {
    home: 'Accueil',
    match: 'Match',
    history: 'Historique',
    settings: 'Paramètres',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    menuLabel: 'Menu de navigation',
  },
  documentTitle: {
    home: 'Miss Badminton',
    match: 'Match en cours — Miss Badminton',
    history: 'Historique — Miss Badminton',
    settings: 'Paramètres — Miss Badminton',
  },
  home: {
    subtitleEmpty: 'Touchez le tableau pour configurer un nouveau match.',
    subtitleReady:
      "Maintenez la zone d'une équipe pour marquer un point (évite les clics accidentels).",
    newMatch: 'Nouveau match',
    viewHistory: "Voir l'historique",
    scoreboardLabel: 'Tableau de score',
  },
  scoreboard: {
    title: 'Miss Badminton',
    swap: 'Permuter les joueurs',
    edit: 'Configurer le match',
    reset: 'Remettre les scores à zéro',
    addPoint: 'Ajouter un point pour {name}',
    historyAria: "Voir l'historique",
    settingsAria: 'Ouvrir les paramètres',
    holdHint: 'Maintenez pour marquer',
    serviceFor: 'Service pour {name}',
  },
  wizard: {
    closeLabel: "Fermer l'assistant",
    stepLabel: 'Étape {n} / 3',
    typeTitle: 'Type de match',
    rulesTitle: 'Règles',
    playersTitle: 'Joueurs',
    singlesTitle: 'Seul',
    singlesSubtitle: 'Simple — 1 vs 1',
    doublesTitle: 'En double',
    doublesSubtitle: 'Double — 2 vs 2',
    sets: 'Nombre de sets',
    points: 'Points par set',
    sideChange: 'Changement de côté',
    sideChangeDecisive: 'Set décisif uniquement',
    sideChangeEachSet: 'Chaque set',
    sideChangeMidMatch: 'Mi-match',
    redTeam: 'Équipe rouge',
    blueTeam: 'Équipe bleue',
    back: 'Retour',
    next: 'Suivant',
    start: 'Commencer',
  },
  players: {
    player1: 'joueur 1',
    player2: 'joueur 2',
    partner1: 'partenaire 1',
    partner2: 'partenaire 2',
  },
  fullscreen: {
    message:
      'Pivote ton écran et passe en plein écran pour une meilleure expérience.',
    activate: 'Activer',
    dismiss: 'Ignorer',
    dialogLabel: 'Mode paysage plein écran',
  },
  matchOver: {
    label: 'Match terminé',
    winnerText: '{name} remporte le match',
    score: 'Sets : {a} – {b}',
    newMatch: 'Nouveau match',
  },
  scoreboardExtra: {
    invertPlayers: 'Intervertir haut et bas',
  },
  settings: {
    languageLabel: 'Langue',
    languageHelp: "Choisissez la langue de l'interface.",
  },
};

const en: Messages = {
  appName: 'Miss Badminton',
  nav: {
    home: 'Home',
    match: 'Match',
    history: 'History',
    settings: 'Settings',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    menuLabel: 'Navigation menu',
  },
  documentTitle: {
    home: 'Miss Badminton',
    match: 'Match in progress — Miss Badminton',
    history: 'History — Miss Badminton',
    settings: 'Settings — Miss Badminton',
  },
  home: {
    subtitleEmpty: 'Tap the scoreboard to configure a new match.',
    subtitleReady: 'Hold a side to add a point (prevents accidental taps).',
    newMatch: 'New match',
    viewHistory: 'View history',
    scoreboardLabel: 'Scoreboard',
  },
  scoreboard: {
    title: 'Miss Badminton',
    swap: 'Swap players',
    edit: 'Configure match',
    reset: 'Reset scores',
    addPoint: 'Add a point for {name}',
    historyAria: 'View history',
    settingsAria: 'Open settings',
    holdHint: 'Hold to score',
    serviceFor: 'Service for {name}',
  },
  wizard: {
    closeLabel: 'Close the assistant',
    stepLabel: 'Step {n} / 3',
    typeTitle: 'Match type',
    rulesTitle: 'Rules',
    playersTitle: 'Players',
    singlesTitle: 'Singles',
    singlesSubtitle: 'Singles — 1 vs 1',
    doublesTitle: 'Doubles',
    doublesSubtitle: 'Doubles — 2 vs 2',
    sets: 'Number of sets',
    points: 'Points per set',
    sideChange: 'Side change',
    sideChangeDecisive: 'Decisive set only',
    sideChangeEachSet: 'Each set',
    sideChangeMidMatch: 'Mid-match',
    redTeam: 'Red team',
    blueTeam: 'Blue team',
    back: 'Back',
    next: 'Next',
    start: 'Start',
  },
  players: {
    player1: 'player 1',
    player2: 'player 2',
    partner1: 'partner 1',
    partner2: 'partner 2',
  },
  fullscreen: {
    message: 'Rotate your screen and go fullscreen for a better experience.',
    activate: 'Activate',
    dismiss: 'Dismiss',
    dialogLabel: 'Fullscreen landscape mode',
  },
  matchOver: {
    label: 'Match over',
    winnerText: '{name} wins the match',
    score: 'Sets: {a} – {b}',
    newMatch: 'New match',
  },
  scoreboardExtra: {
    invertPlayers: 'Swap top and bottom',
  },
  settings: {
    languageLabel: 'Language',
    languageHelp: 'Choose the interface language.',
  },
};

export const messages: Record<Locale, Messages> = { fr, en };
