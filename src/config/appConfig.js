export const APP = {
  name: 'Tecladoaventura',
  subtitle: 'El Reino de las Teclas',
  version: '1.0.0',
  saveKey: 'tecladoaventura.save.v1',
  settingsKey: 'tecladoaventura.settings.v1',
  logicalWidth: 960,
  logicalHeight: 540,
  levelsPerWorld: 4,
  worldCount: 12,
  physics: {
    gravity: 1650,
    moveSpeed: 235,
    accel: 2100,
    friction: 2600,
    airControl: 0.72,
    jumpSpeed: 555,
    jumpCut: 210,
    maxFall: 820,
    coyoteTime: 0.09,
    jumpBuffer: 0.12,
  },
  stars: { two: 70, three: 88 },
  maxHearts: 3,
  timestep: 1 / 60,
};

export const MOVEMENT = {
  left: { codes: ['ArrowLeft', 'KeyA'], label: 'Izquierda', arrow: '←', char: '←' },
  right: { codes: ['ArrowRight', 'KeyD'], label: 'Derecha', arrow: '→', char: '→' },
  jump: { codes: ['Space', 'ArrowUp', 'KeyW'], label: 'Saltar', arrow: '⤒', char: 'ESPACIO' },
};

export const DEFAULT_SETTINGS = {
  layout: 'latam',
  inputMode: 'char',
  sound: true,
  music: true,
  volume: 0.7,
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  onScreenControls: false,
  showKeyboardHints: true,
};

export const UI_TEXT = {
  wrongKey: '¡Casi! Busca la tecla que está iluminada.',
  wrongCombo: 'Ups, esa no era. Mira la tecla brillante e inténtalo otra vez.',
  correct: '¡Muy bien!',
  lockedPortal: 'Aún faltan teclas mágicas. ¡Vamos por ellas!',
  fall: '¡Uy! Vuelve a intentarlo desde el último banderín.',
  bump: '¡Cuidado con el amiguito! Sigue adelante.',
};
