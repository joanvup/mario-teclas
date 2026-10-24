import './styles/index.css';
import { ProgressStore } from './progress/storage.js';
import { AudioEngine } from './audio/audioEngine.js';
import { KeyboardManager } from './input/keyboardManager.js';
import { Game } from './game/game.js';
import { UI } from './ui/ui.js';
import { LEVELS } from './levels/levels.js';
import { WORLDS } from './worlds/worlds.js';

const store = new ProgressStore();
const audio = new AudioEngine();
const keyboard = new KeyboardManager();
const canvas = document.getElementById('game-canvas');

let ui = null;

const game = new Game(canvas, {
  store,
  audio,
  keyboard,
  callbacks: {
    onHud: (state) => ui?.onHud(state),
    onToast: (message, type) => ui?.toast(message, type),
    onChallengeOpen: (state) => ui?.showChallenge(state),
    onChallengeUpdate: (state) => ui?.onChallengeUpdate(state),
    onChallengeClose: () => ui?.onChallengeClose(),
    onPauseChange: (paused) => ui?.onPauseChange(paused),
    onVictory: (summary) => {
      store.completeLevel(summary.levelId, summary);
      store.markTutorialDone();
      ui?.showVictory(summary);
      game.stop();
    },
  },
});

ui = new UI({ store, audio, game });
ui.showTitle();

// El audio solo se activa después de una interacción real del usuario.
let audioUnlocked = false;
const unlockAudio = () => {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audio.unlock();
  audio.setWorld(1, 'menu');
};
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

// Pausar automáticamente si el niño cambia de pestaña o ventana.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') game.pause();
});

// Cierre seguro del audio al salir.
window.addEventListener('pagehide', () => audio.stopMusic());

if (store.lastError) {
  setTimeout(() => ui.toast(store.lastError, 'warn'), 800);
}

// API de apoyo para pruebas automatizadas y docentes técnicos.
window.__TKA__ = {
  store,
  game,
  ui,
  levels: LEVELS,
  worlds: WORLDS,
  version: '1.0.0',
  startAnyLevel(levelId) {
    ui.startGame(levelId, { force: true });
  },
  finishActiveLevel() {
    game._testFinish();
  },
  completeActiveGate() {
    game._testCompleteGate();
  },
  openGate(index = 0) {
    const gate = game.level?.gates?.[index];
    if (gate && game.state === 'playing') {
      game.player.x = gate.x - 15;
      game.player.y = gate.y - 20;
      game.openChallenge(gate);
      return true;
    }
    return false;
  },
  snapshot() {
    return {
      state: game.state,
      level: game.level
        ? {
            id: game.level.id,
            width: game.level.width,
            platforms: game.level.platforms.length,
            gates: game.level.gates.length,
            coins: game.level.coins.length,
            checkpoints: game.level.checkpoints.length,
            obstacles: game.level.obstacles.length,
          }
        : null,
      player: game.player ? { x: game.player.x, y: game.player.y } : null,
      hud: ui.lastHudState,
      store: {
        active: store.profile.alias,
        completed: store.completedCount(),
        stars: store.totalStars(),
      },
    };
  },
};
