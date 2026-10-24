import { APP } from '../config/appConfig.js';

/**
 * Motor de evaluación independiente de la presentación.
 * Nunca divide entre cero: si no hay pulsaciones evaluadas, la precisión es null.
 */
export function accuracy(correct, incorrect) {
  const total = correct + incorrect;
  if (total <= 0) return null;
  return Math.round((correct / total) * 1000) / 10;
}

export function computeStars({
  completed = false,
  accuracy: precision = null,
  helps = 0,
  gatesCompleted = 0,
  totalGates = 0,
  coins = 0,
  requiredCoins = 0,
}) {
  if (!completed) return 0;
  const objectivesDone = gatesCompleted >= totalGates && coins >= requiredCoins;
  if (!objectivesDone) return 1;
  if (precision === null || precision >= APP.stars.two) {
    if ((precision === null || precision >= APP.stars.three) && helps <= 1) return 3;
    return 2;
  }
  return 1;
}

export function starMessage(stars, precision) {
  if (stars >= 3) return '¡Excelente! Ya dominas estas teclas.';
  if (stars === 2) return '¡Cada vez conoces mejor tu teclado!';
  if (stars === 1) return '¡Lo lograste! Practiquemos una vez más para mejorar.';
  return '¡Vamos a intentarlo otra vez!';
}

export function scoreFor({ correct = 0, coins = 0, stars = 0, helps = 0, completed = false }) {
  if (!completed) return 0;
  return Math.max(0, correct * 10 + coins * 5 + stars * 100 + 250 - helps * 15);
}

export class LevelEvaluator {
  constructor(level) {
    this.level = level;
    this.attempts = 1;
    this.correct = 0;
    this.incorrect = 0;
    this.helps = 0;
    this.gatesCompleted = 0;
    this.totalGates = Array.isArray(level.gates) ? level.gates.length : 0;
    this.startedAt = performance.now();
    this.finishedAt = null;
    this.falls = 0;
    this.bumps = 0;
    this.completed = false;
    this.keyMistakes = {};
    this.prevKeyMistakes = 0;
    this.lastExpected = null;
  }

  recordCorrect(target) {
    this.correct += 1;
    this.lastExpected = target?.display || null;
  }

  recordWrong(expected, pressed) {
    this.incorrect += 1;
    const key = expected?.display || '?';
    this.keyMistakes[key] = (this.keyMistakes[key] || 0) + 1;
    this.lastPressed = pressed;
    this.lastExpected = key;
  }

  recordHelp() {
    this.helps += 1;
  }

  recordFall() {
    this.falls += 1;
  }

  recordBump() {
    this.bumps += 1;
  }

  completeGate() {
    this.gatesCompleted = Math.min(this.totalGates, this.gatesCompleted + 1);
  }

  get accuracy() {
    return accuracy(this.correct, this.incorrect);
  }

  get elapsedMs() {
    return (this.finishedAt ?? performance.now()) - this.startedAt;
  }

  get isStruggling() {
    return (this.incorrect >= 3 && this.accuracy !== null && this.accuracy < 65) || this.helps >= 2;
  }

  finish({ coins = 0, requiredCoins = 0 } = {}) {
    this.completed = true;
    this.finishedAt = performance.now();
    this.stars = computeStars({
      completed: true,
      accuracy: this.accuracy,
      helps: this.helps,
      gatesCompleted: this.gatesCompleted,
      totalGates: this.totalGates,
      coins,
      requiredCoins,
    });
    this.score = scoreFor({
      correct: this.correct,
      coins,
      stars: this.stars,
      helps: this.helps,
      completed: true,
    });
    this.coins = coins;
    this.requiredCoins = requiredCoins;
    return this.summary();
  }

  summary() {
    return {
      levelId: this.level.id,
      world: this.level.world,
      attempts: this.attempts,
      correct: this.correct,
      incorrect: this.incorrect,
      accuracy: this.accuracy,
      gatesCompleted: this.gatesCompleted,
      totalGates: this.totalGates,
      helps: this.helps,
      timeMs: Math.round(this.elapsedMs),
      stars: this.stars ?? 0,
      score: this.score ?? 0,
      falls: this.falls,
      bumps: this.bumps,
      keyMistakes: { ...this.keyMistakes },
      completed: this.completed,
      coins: this.coins ?? 0,
      requiredCoins: this.requiredCoins ?? 0,
      lastExpected: this.lastExpected,
    };
  }
}
