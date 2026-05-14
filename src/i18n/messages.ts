export type Locale = 'fr' | 'en' | 'es';

export const LOCALES: Locale[] = ['fr', 'en', 'es'];

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
};

/** Drapeaux affichés à la place du nom de langue dans les sélecteurs. */
export const LOCALE_FLAGS: Record<Locale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
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
    forceLandscape: string;
    forcePortrait: string;
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
    undo: string;
    share: string;
    shareTitle: string;
    shareBody: string;
    addPoint: string;
    historyAria: string;
    settingsAria: string;
    holdHint: string;
    serviceFor: string;
    matchPoint: string;
    setPoint: string;
    setHeader: string;
    invertPlayers: string;
    streak: string;
    duration: string;
    pauseChrono: string;
    resumeChrono: string;
    resetChrono: string;
    confirmResetChrono: string;
  };
  sideChange: {
    title: string;
    body: string;
    swapNow: string;
    later: string;
  };
  setTransition: {
    title: string;
    score: string;
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
    setsHelp: string;
    setsWinning: string;
    points: string;
    pointsHelp: string;
    cap: string;
    capHelp: string;
    capNone: string;
    capValue: string;
    sideChange: string;
    sideChangeHelp: string;
    sideChangeDecisive: string;
    sideChangeEachSet: string;
    sideChangeMidMatch: string;
    redTeam: string;
    blueTeam: string;
    back: string;
    next: string;
    start: string;
    summaryLabel: string;
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
    setsList: string;
    newMatch: string;
    share: string;
  };
  history: {
    title: string;
    empty: string;
    matchOn: string;
    versus: string;
    clearAll: string;
    confirmClear: string;
    delete: string;
    duration: string;
    maxStreak: string;
  };
  pwa: {
    installPrompt: string;
    install: string;
    dismiss: string;
  };
  settings: {
    languageLabel: string;
    languageHelp: string;
    themeLabel: string;
    themeHelp: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    soundLabel: string;
    soundHelp: string;
    hapticLabel: string;
    hapticHelp: string;
    enabled: string;
    disabled: string;
    colorsLabel: string;
    colorsHelp: string;
    colorTeam1: string;
    colorTeam2: string;
    resetColors: string;
    updateLabel: string;
    updateHelp: string;
    updateButton: string;
    updateChecking: string;
  };
  shortcuts: {
    title: string;
    addTeam1: string;
    addTeam2: string;
    undo: string;
    reset: string;
    swap: string;
  };
  onboarding: {
    title: string;
    tap: string;
    hold: string;
    swap: string;
    undo: string;
    gotIt: string;
  };
  toast: {
    pointAdded: string;
    pointRemoved: string;
  };
  liveScore: string;
  scoreSubtract: string;
  confirm: {
    title: string;
    confirm: string;
    cancel: string;
  };
  offline: {
    banner: string;
  };
  historyExtra: {
    replay: string;
    statsTitle: string;
    statsTotal: string;
    statsWinRate: string;
    statsTopPlayer: string;
    statsNone: string;
  };
  matchOverExtra: {
    rematch: string;
    backHome: string;
  };
  wizardExtra: {
    quickStart: string;
    quickStartHint: string;
  };
  settingsExtra: {
    contrastWarning: string;
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
    forceLandscape: 'Forcer le mode paysage',
    forcePortrait: 'Forcer le mode portrait',
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
    undo: 'Annuler le dernier point',
    share: 'Partager le résultat',
    shareTitle: 'Match Miss Badminton',
    shareBody: '{a} {sa} – {sb} {b} ({sets})',
    addPoint: 'Ajouter un point pour {name}',
    historyAria: "Voir l'historique",
    settingsAria: 'Ouvrir les paramètres',
    holdHint: 'Maintenez pour marquer',
    serviceFor: 'Service pour {name}',
    matchPoint: 'Balle de match',
    setPoint: 'Balle de set',
    setHeader: 'Set {n} / {total} — {points} pts',
    invertPlayers: 'Intervertir haut et bas',
    streak: '{n} d’affilée',
    duration: 'Durée',
    pauseChrono: 'Mettre le chrono en pause',
    resumeChrono: 'Reprendre le chrono',
    resetChrono: 'Remettre le chrono à zéro',
    confirmResetChrono: 'Remettre le chrono à 0 ?',
  },
  sideChange: {
    title: 'Changement de côté',
    body: 'Les équipes échangent leurs zones du terrain.',
    swapNow: 'Permuter maintenant',
    later: 'Plus tard',
  },
  setTransition: {
    title: 'Set remporté par {name}',
    score: '{a} – {b}',
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
    sets: 'Format',
    setsHelp: 'Premier à {wins} sets gagnants',
    setsWinning: '{wins} sets gagnants',
    points: 'Points par set',
    pointsHelp: 'Le set s’arrête au premier à ce score',
    cap: 'Plafond',
    capHelp: 'Score limite si égalité prolongée',
    capNone: 'Sans',
    capValue: '{n}',
    sideChange: 'Changement de côté',
    sideChangeHelp: 'Quand échanger les zones du terrain',
    sideChangeDecisive: 'Set décisif uniquement',
    sideChangeEachSet: 'Chaque set',
    sideChangeMidMatch: 'Mi-match (à 11)',
    redTeam: 'Équipe rouge',
    blueTeam: 'Équipe bleue',
    back: 'Retour',
    next: 'Suivant',
    start: 'Commencer',
    summaryLabel: 'Résumé',
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
    setsList: 'Détail : {sets}',
    newMatch: 'Nouveau match',
    share: 'Partager',
  },
  history: {
    title: 'Historique des matchs',
    empty: 'Aucun match enregistré pour le moment.',
    matchOn: 'Match du {date}',
    versus: '{a} vs {b}',
    clearAll: 'Tout effacer',
    confirmClear: "Effacer tout l'historique ?",
    delete: 'Supprimer',
    duration: 'Durée : {time}',
    maxStreak: 'Plus longue série : {a} – {b}',
  },
  pwa: {
    installPrompt: 'Installer Miss Badminton sur votre appareil.',
    install: 'Installer',
    dismiss: 'Plus tard',
  },
  settings: {
    languageLabel: 'Langue',
    languageHelp: "Choisissez la langue de l'interface.",
    themeLabel: 'Thème',
    themeHelp: 'Apparence claire, sombre ou suivant le système.',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    themeSystem: 'Système',
    soundLabel: 'Sons',
    soundHelp: 'Bip court à chaque point, mélodie en fin de set/match.',
    hapticLabel: 'Vibrations',
    hapticHelp: 'Retour haptique sur les appareils qui le supportent.',
    enabled: 'Activé',
    disabled: 'Désactivé',
    colorsLabel: 'Couleurs des équipes',
    colorsHelp: 'Choisissez la couleur de chaque équipe sur le tableau.',
    colorTeam1: 'Équipe 1',
    colorTeam2: 'Équipe 2',
    resetColors: 'Couleurs par défaut',
    updateLabel: 'Mises à jour',
    updateHelp:
      "Force la recherche d'une nouvelle version et recharge l'application.",
    updateButton: 'Forcer la mise à jour',
    updateChecking: 'Vérification…',
  },
  shortcuts: {
    title: 'Raccourcis clavier',
    addTeam1: 'A ou 1 — point équipe rouge',
    addTeam2: 'L ou 2 — point équipe bleue',
    undo: 'U — annuler le dernier point',
    reset: 'R — remettre à zéro',
    swap: 'S — permuter les équipes',
  },
  onboarding: {
    title: 'Bienvenue 🏸',
    tap: 'Tape la moitié d’une équipe pour ajouter un point.',
    hold: 'Maintiens 0,4 s pour retirer un point.',
    swap: 'Bouton ⇄ central : change de côté.',
    undo: 'Bouton ↶ en bas : annule le dernier point.',
    gotIt: 'C’est compris',
  },
  toast: {
    pointAdded: '+1 {name}',
    pointRemoved: '−1 {name}',
  },
  liveScore: 'Score : {a} contre {b}',
  scoreSubtract: 'Retirer un point à {name}',
  confirm: {
    title: 'Confirmer',
    confirm: 'Confirmer',
    cancel: 'Annuler',
  },
  offline: {
    banner: 'Hors ligne — les scores restent enregistrés localement.',
  },
  historyExtra: {
    replay: 'Rejouer ce match',
    statsTitle: 'Statistiques',
    statsTotal: '{n} match{s, plural, one {} other {s}}',
    statsWinRate: 'Joueur le plus victorieux',
    statsTopPlayer: '{name} — {wins}/{total}',
    statsNone: 'Pas encore de stats.',
  },
  matchOverExtra: {
    rematch: 'Rejouer',
    backHome: 'Retour à l’accueil',
  },
  wizardExtra: {
    quickStart: 'Match standard',
    quickStartHint: 'Simple · 2 sets gagnants · 21 pts · plafond 30',
  },
  settingsExtra: {
    contrastWarning:
      'Les deux couleurs choisies sont très proches : difficile de distinguer les équipes.',
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
    forceLandscape: 'Force landscape mode',
    forcePortrait: 'Force portrait mode',
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
    undo: 'Undo last point',
    share: 'Share result',
    shareTitle: 'Miss Badminton match',
    shareBody: '{a} {sa} – {sb} {b} ({sets})',
    addPoint: 'Add a point for {name}',
    historyAria: 'View history',
    settingsAria: 'Open settings',
    holdHint: 'Hold to score',
    serviceFor: 'Service for {name}',
    matchPoint: 'Match point',
    setPoint: 'Set point',
    setHeader: 'Set {n} / {total} — {points} pts',
    invertPlayers: 'Swap top and bottom',
    streak: '{n} in a row',
    duration: 'Duration',
    pauseChrono: 'Pause the timer',
    resumeChrono: 'Resume the timer',
    resetChrono: 'Reset the timer to zero',
    confirmResetChrono: 'Reset the timer to 0?',
  },
  sideChange: {
    title: 'Change ends',
    body: 'Teams swap court sides.',
    swapNow: 'Swap now',
    later: 'Later',
  },
  setTransition: {
    title: '{name} wins the set',
    score: '{a} – {b}',
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
    sets: 'Format',
    setsHelp: 'First to {wins} winning sets',
    setsWinning: '{wins} winning sets',
    points: 'Points per set',
    pointsHelp: 'A set ends at this score',
    cap: 'Cap',
    capHelp: 'Maximum score to close a tied set',
    capNone: 'None',
    capValue: '{n}',
    sideChange: 'Side change',
    sideChangeHelp: 'When to swap court sides',
    sideChangeDecisive: 'Decisive set only',
    sideChangeEachSet: 'Each set',
    sideChangeMidMatch: 'Mid-match (at 11)',
    redTeam: 'Red team',
    blueTeam: 'Blue team',
    back: 'Back',
    next: 'Next',
    start: 'Start',
    summaryLabel: 'Summary',
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
    setsList: 'Sets: {sets}',
    newMatch: 'New match',
    share: 'Share',
  },
  history: {
    title: 'Match history',
    empty: 'No matches recorded yet.',
    matchOn: 'Match on {date}',
    versus: '{a} vs {b}',
    clearAll: 'Clear all',
    confirmClear: 'Clear the entire history?',
    delete: 'Delete',
    duration: 'Duration: {time}',
    maxStreak: 'Longest run: {a} – {b}',
  },
  pwa: {
    installPrompt: 'Install Miss Badminton on your device.',
    install: 'Install',
    dismiss: 'Later',
  },
  settings: {
    languageLabel: 'Language',
    languageHelp: 'Choose the interface language.',
    themeLabel: 'Theme',
    themeHelp: 'Light, dark or follow the system.',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    soundLabel: 'Sounds',
    soundHelp: 'Short beep on each point, melody on set/match win.',
    hapticLabel: 'Haptics',
    hapticHelp: 'Vibration feedback on supported devices.',
    enabled: 'On',
    disabled: 'Off',
    colorsLabel: 'Team colours',
    colorsHelp: 'Pick the colour of each team on the scoreboard.',
    colorTeam1: 'Team 1',
    colorTeam2: 'Team 2',
    resetColors: 'Reset to defaults',
    updateLabel: 'Updates',
    updateHelp: 'Force a check for a new version and reload the app.',
    updateButton: 'Force update',
    updateChecking: 'Checking…',
  },
  shortcuts: {
    title: 'Keyboard shortcuts',
    addTeam1: 'A or 1 — point for red team',
    addTeam2: 'L or 2 — point for blue team',
    undo: 'U — undo last point',
    reset: 'R — reset scores',
    swap: 'S — swap teams',
  },
  onboarding: {
    title: 'Welcome 🏸',
    tap: 'Tap a team’s half to add a point.',
    hold: 'Hold 0.4 s to subtract a point.',
    swap: 'Central ⇄ button: swap sides.',
    undo: 'Bottom ↶ button: undo the last point.',
    gotIt: 'Got it',
  },
  toast: {
    pointAdded: '+1 {name}',
    pointRemoved: '−1 {name}',
  },
  liveScore: 'Score: {a} versus {b}',
  scoreSubtract: 'Subtract a point from {name}',
  confirm: {
    title: 'Confirm',
    confirm: 'Confirm',
    cancel: 'Cancel',
  },
  offline: {
    banner: 'Offline — scores are still saved locally.',
  },
  historyExtra: {
    replay: 'Replay this match',
    statsTitle: 'Stats',
    statsTotal: '{n} match{s, plural, one {} other {es}}',
    statsWinRate: 'Top player',
    statsTopPlayer: '{name} — {wins}/{total}',
    statsNone: 'No stats yet.',
  },
  matchOverExtra: {
    rematch: 'Rematch',
    backHome: 'Back to home',
  },
  wizardExtra: {
    quickStart: 'Standard match',
    quickStartHint: 'Singles · Best of 3 · 21 pts · cap 30',
  },
  settingsExtra: {
    contrastWarning:
      'The two chosen colours are very close: it will be hard to tell the teams apart.',
  },
};

const es: Messages = {
  appName: 'Miss Badminton',
  nav: {
    home: 'Inicio',
    match: 'Partido',
    history: 'Historial',
    settings: 'Ajustes',
    openMenu: 'Abrir el menú',
    closeMenu: 'Cerrar el menú',
    menuLabel: 'Menú de navegación',
    forceLandscape: 'Forzar modo paisaje',
    forcePortrait: 'Forzar modo retrato',
  },
  documentTitle: {
    home: 'Miss Badminton',
    match: 'Partido en curso — Miss Badminton',
    history: 'Historial — Miss Badminton',
    settings: 'Ajustes — Miss Badminton',
  },
  home: {
    subtitleEmpty: 'Toca el marcador para configurar un nuevo partido.',
    subtitleReady: 'Mantén pulsada la zona de un equipo para sumar un punto.',
    newMatch: 'Nuevo partido',
    viewHistory: 'Ver historial',
    scoreboardLabel: 'Marcador',
  },
  scoreboard: {
    title: 'Miss Badminton',
    swap: 'Intercambiar equipos',
    edit: 'Configurar el partido',
    reset: 'Reiniciar el marcador',
    undo: 'Deshacer el último punto',
    share: 'Compartir el resultado',
    shareTitle: 'Partido Miss Badminton',
    shareBody: '{a} {sa} – {sb} {b} ({sets})',
    addPoint: 'Sumar un punto para {name}',
    historyAria: 'Ver historial',
    settingsAria: 'Abrir ajustes',
    holdHint: 'Mantén pulsado',
    serviceFor: 'Saque para {name}',
    matchPoint: 'Punto de partido',
    setPoint: 'Punto de set',
    setHeader: 'Set {n} / {total} — {points} pts',
    invertPlayers: 'Intercambiar arriba y abajo',
    streak: '{n} seguidos',
    duration: 'Duración',
    pauseChrono: 'Pausar el cronómetro',
    resumeChrono: 'Reanudar el cronómetro',
    resetChrono: 'Reiniciar el cronómetro',
    confirmResetChrono: '¿Reiniciar el cronómetro a 0?',
  },
  sideChange: {
    title: 'Cambio de lado',
    body: 'Los equipos cambian de lado de la pista.',
    swapNow: 'Cambiar ahora',
    later: 'Más tarde',
  },
  setTransition: {
    title: '{name} gana el set',
    score: '{a} – {b}',
  },
  wizard: {
    closeLabel: 'Cerrar el asistente',
    stepLabel: 'Paso {n} / 3',
    typeTitle: 'Tipo de partido',
    rulesTitle: 'Reglas',
    playersTitle: 'Jugadores',
    singlesTitle: 'Individual',
    singlesSubtitle: 'Individual — 1 vs 1',
    doublesTitle: 'Dobles',
    doublesSubtitle: 'Dobles — 2 vs 2',
    sets: 'Formato',
    setsHelp: 'Primer a {wins} sets ganados',
    setsWinning: '{wins} sets ganados',
    points: 'Puntos por set',
    pointsHelp: 'Un set termina al primero en alcanzar este puntaje',
    cap: 'Tope',
    capHelp: 'Puntaje límite en caso de empate',
    capNone: 'Sin tope',
    capValue: '{n}',
    sideChange: 'Cambio de lado',
    sideChangeHelp: 'Cuándo intercambiar lados de la pista',
    sideChangeDecisive: 'Solo set decisivo',
    sideChangeEachSet: 'Cada set',
    sideChangeMidMatch: 'A mitad de partido (a 11)',
    redTeam: 'Equipo rojo',
    blueTeam: 'Equipo azul',
    back: 'Atrás',
    next: 'Siguiente',
    start: 'Empezar',
    summaryLabel: 'Resumen',
  },
  players: {
    player1: 'jugador 1',
    player2: 'jugador 2',
    partner1: 'compañero 1',
    partner2: 'compañero 2',
  },
  fullscreen: {
    message:
      'Gira la pantalla y pasa a pantalla completa para una mejor experiencia.',
    activate: 'Activar',
    dismiss: 'Ignorar',
    dialogLabel: 'Modo paisaje a pantalla completa',
  },
  matchOver: {
    label: 'Partido terminado',
    winnerText: '{name} gana el partido',
    score: 'Sets: {a} – {b}',
    setsList: 'Detalle: {sets}',
    newMatch: 'Nuevo partido',
    share: 'Compartir',
  },
  history: {
    title: 'Historial de partidos',
    empty: 'No hay partidos registrados.',
    matchOn: 'Partido del {date}',
    versus: '{a} vs {b}',
    clearAll: 'Borrar todo',
    confirmClear: '¿Borrar todo el historial?',
    delete: 'Eliminar',
    duration: 'Duración: {time}',
    maxStreak: 'Mejor racha: {a} – {b}',
  },
  pwa: {
    installPrompt: 'Instala Miss Badminton en tu dispositivo.',
    install: 'Instalar',
    dismiss: 'Más tarde',
  },
  settings: {
    languageLabel: 'Idioma',
    languageHelp: 'Elige el idioma de la interfaz.',
    themeLabel: 'Tema',
    themeHelp: 'Claro, oscuro o según el sistema.',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    themeSystem: 'Sistema',
    soundLabel: 'Sonidos',
    soundHelp: 'Pitido corto en cada punto, melodía al ganar set/partido.',
    hapticLabel: 'Vibración',
    hapticHelp: 'Respuesta háptica en los dispositivos compatibles.',
    enabled: 'Activado',
    disabled: 'Desactivado',
    colorsLabel: 'Colores de los equipos',
    colorsHelp: 'Elige el color de cada equipo en el marcador.',
    colorTeam1: 'Equipo 1',
    colorTeam2: 'Equipo 2',
    resetColors: 'Restablecer colores',
    updateLabel: 'Actualizaciones',
    updateHelp:
      'Fuerza la búsqueda de una nueva versión y recarga la aplicación.',
    updateButton: 'Forzar actualización',
    updateChecking: 'Comprobando…',
  },
  shortcuts: {
    title: 'Atajos de teclado',
    addTeam1: 'A o 1 — punto para el equipo rojo',
    addTeam2: 'L o 2 — punto para el equipo azul',
    undo: 'U — deshacer el último punto',
    reset: 'R — reiniciar el marcador',
    swap: 'S — intercambiar equipos',
  },
  onboarding: {
    title: 'Bienvenido 🏸',
    tap: 'Toca la mitad de un equipo para sumar un punto.',
    hold: 'Mantén 0,4 s para restar un punto.',
    swap: 'Botón ⇄ central: cambia de lado.',
    undo: 'Botón ↶ inferior: deshace el último punto.',
    gotIt: 'Entendido',
  },
  toast: {
    pointAdded: '+1 {name}',
    pointRemoved: '−1 {name}',
  },
  liveScore: 'Marcador: {a} contra {b}',
  scoreSubtract: 'Restar un punto a {name}',
  confirm: {
    title: 'Confirmar',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
  },
  offline: {
    banner: 'Sin conexión — los marcadores siguen guardándose localmente.',
  },
  historyExtra: {
    replay: 'Repetir este partido',
    statsTitle: 'Estadísticas',
    statsTotal: '{n} partido{s, plural, one {} other {s}}',
    statsWinRate: 'Mejor jugador',
    statsTopPlayer: '{name} — {wins}/{total}',
    statsNone: 'Aún no hay estadísticas.',
  },
  matchOverExtra: {
    rematch: 'Revancha',
    backHome: 'Volver al inicio',
  },
  wizardExtra: {
    quickStart: 'Partido estándar',
    quickStartHint: 'Individual · Al mejor de 3 · 21 pts · tope 30',
  },
  settingsExtra: {
    contrastWarning:
      'Los dos colores elegidos son muy parecidos: será difícil distinguir los equipos.',
  },
};

export const messages: Record<Locale, Messages> = { fr, en, es };
