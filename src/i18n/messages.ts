export type Locale = 'fr' | 'en' | 'es';

export const LOCALES: Locale[] = ['fr', 'en', 'es'];

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
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
    points: string;
    cap: string;
    capNone: string;
    capValue: string;
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
  };
  shortcuts: {
    title: string;
    addTeam1: string;
    addTeam2: string;
    undo: string;
    reset: string;
    swap: string;
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
    sets: 'Nombre de sets',
    points: 'Points par set',
    cap: 'Plafond',
    capNone: 'Sans',
    capValue: '{n}',
    sideChange: 'Changement de côté',
    sideChangeDecisive: 'Set décisif uniquement',
    sideChangeEachSet: 'Chaque set',
    sideChangeMidMatch: 'Mi-match (à 11)',
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
  },
  shortcuts: {
    title: 'Raccourcis clavier',
    addTeam1: 'A ou 1 — point équipe rouge',
    addTeam2: 'L ou 2 — point équipe bleue',
    undo: 'U — annuler le dernier point',
    reset: 'R — remettre à zéro',
    swap: 'S — permuter les équipes',
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
    sets: 'Number of sets',
    points: 'Points per set',
    cap: 'Cap',
    capNone: 'None',
    capValue: '{n}',
    sideChange: 'Side change',
    sideChangeDecisive: 'Decisive set only',
    sideChangeEachSet: 'Each set',
    sideChangeMidMatch: 'Mid-match (at 11)',
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
  },
  shortcuts: {
    title: 'Keyboard shortcuts',
    addTeam1: 'A or 1 — point for red team',
    addTeam2: 'L or 2 — point for blue team',
    undo: 'U — undo last point',
    reset: 'R — reset scores',
    swap: 'S — swap teams',
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
    sets: 'Número de sets',
    points: 'Puntos por set',
    cap: 'Tope',
    capNone: 'Sin tope',
    capValue: '{n}',
    sideChange: 'Cambio de lado',
    sideChangeDecisive: 'Solo set decisivo',
    sideChangeEachSet: 'Cada set',
    sideChangeMidMatch: 'A mitad de partido (a 11)',
    redTeam: 'Equipo rojo',
    blueTeam: 'Equipo azul',
    back: 'Atrás',
    next: 'Siguiente',
    start: 'Empezar',
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
  },
  shortcuts: {
    title: 'Atajos de teclado',
    addTeam1: 'A o 1 — punto para el equipo rojo',
    addTeam2: 'L o 2 — punto para el equipo azul',
    undo: 'U — deshacer el último punto',
    reset: 'R — reiniciar el marcador',
    swap: 'S — intercambiar equipos',
  },
};

export const messages: Record<Locale, Messages> = { fr, en, es };
