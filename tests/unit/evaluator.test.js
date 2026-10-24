import { describe, expect, it } from 'vitest';
import {
  accuracy,
  computeStars,
  starMessage,
  scoreFor,
  LevelEvaluator,
} from '../../src/education/evaluator.js';
import { makeTarget } from '../../src/input/layouts.js';

describe('precisión y estrellas', () => {
  it('nunca divide entre cero', () => {
    expect(accuracy(0, 0)).toBe(null);
    expect(accuracy(3, 0)).toBe(100);
    expect(accuracy(0, 3)).toBe(0);
    expect(accuracy(2, 1)).toBe(66.7);
    expect(accuracy(1, 2)).toBe(33.3);
    expect(accuracy(7, 3)).toBe(70);
  });

  it('no entrega estrellas si el nivel no está completado', () => {
    expect(computeStars({ completed: false, accuracy: 100 })).toBe(0);
  });

  it('entrega 1 estrella si faltan objetivos', () => {
    expect(
      computeStars({
        completed: true,
        accuracy: 100,
        gatesCompleted: 1,
        totalGates: 3,
        coins: 0,
        requiredCoins: 5,
      }),
    ).toBe(1);
  });

  it('entrega 2 estrellas con precisión suficiente pero ayuda extra', () => {
    expect(
      computeStars({
        completed: true,
        accuracy: 95,
        helps: 2,
        gatesCompleted: 3,
        totalGates: 3,
        coins: 5,
        requiredCoins: 5,
      }),
    ).toBe(2);
    expect(
      computeStars({
        completed: true,
        accuracy: 75,
        helps: 0,
        gatesCompleted: 3,
        totalGates: 3,
        coins: 5,
        requiredCoins: 5,
      }),
    ).toBe(2);
  });

  it('entrega 3 estrellas con objetivos, precisión y pocas ayudas', () => {
    const base = {
      completed: true,
      accuracy: 93,
      helps: 1,
      gatesCompleted: 3,
      totalGates: 3,
      coins: 5,
      requiredCoins: 5,
    };
    expect(computeStars(base)).toBe(3);
    expect(computeStars({ ...base, accuracy: null })).toBe(3);
    expect(computeStars({ ...base, helps: 2 })).toBe(2);
    expect(computeStars({ ...base, accuracy: 60 })).toBe(1);
  });

  it('usa mensajes positivos en todos los casos', () => {
    expect(starMessage(3, 100)).toContain('Excelente');
    expect(starMessage(2, 80)).toContain('Cada vez');
    expect(starMessage(1, 50)).toContain('Lo lograste');
    expect(starMessage(0, 0)).toContain('intentarlo');
  });

  it('calcula un puntaje solo al completar', () => {
    expect(scoreFor({ completed: false, correct: 10, coins: 5, stars: 3 })).toBe(0);
    expect(
      scoreFor({ completed: true, correct: 10, coins: 5, stars: 3, helps: 1 }),
    ).toBe(100 + 25 + 300 + 250 - 15);
  });
});

describe('evaluador de nivel', () => {
  it('cuenta aciertos, errores y ayudas sin dividir entre cero', () => {
    const evaluator = new LevelEvaluator({ id: 'x', world: 1, gates: [{}, {}] });
    expect(evaluator.accuracy).toBe(null);
    evaluator.recordCorrect(makeTarget('A'));
    evaluator.recordCorrect(makeTarget('B'));
    evaluator.recordWrong(makeTarget('C'), 'X');
    evaluator.recordHelp();
    evaluator.recordFall();
    evaluator.recordBump();
    expect(evaluator.correct).toBe(2);
    expect(evaluator.incorrect).toBe(1);
    expect(evaluator.accuracy).toBe(66.7);
    expect(evaluator.helps).toBe(1);
    expect(evaluator.falls).toBe(1);
    expect(evaluator.bumps).toBe(1);
    expect(evaluator.keyMistakes).toEqual({ C: 1 });
  });

  it('produce un resumen completo al terminar', () => {
    const evaluator = new LevelEvaluator({ id: 'w1l1', world: 1, gates: [{}, {}] });
    evaluator.recordCorrect(makeTarget('A'));
    evaluator.recordCorrect(makeTarget('E'));
    evaluator.recordCorrect(makeTarget('I'));
    evaluator.recordWrong(makeTarget('I'), 'U');
    evaluator.completeGate();
    evaluator.completeGate();
    const summary = evaluator.finish({ coins: 6, requiredCoins: 4 });
    expect(summary).toMatchObject({
      levelId: 'w1l1',
      world: 1,
      completed: true,
      correct: 3,
      incorrect: 1,
      gatesCompleted: 2,
      totalGates: 2,
      coins: 6,
      requiredCoins: 4,
      stars: 2,
      accuracy: 75,
    });
    expect(summary.score).toBeGreaterThan(0);
    expect(summary.timeMs).toBeGreaterThanOrEqual(0);
    expect(summary.keyMistakes).toEqual({ I: 1 });
  });

  it('detecta cuando el estudiante necesita apoyo', () => {
    const evaluator = new LevelEvaluator({ id: 'x', world: 1, gates: [] });
    for (let i = 0; i < 3; i += 1) evaluator.recordWrong(makeTarget('A'), 'B');
    expect(evaluator.accuracy).toBe(0);
    expect(evaluator.isStruggling).toBe(true);
    const other = new LevelEvaluator({ id: 'y', world: 1, gates: [] });
    other.recordHelp();
    other.recordHelp();
    expect(other.isStruggling).toBe(true);
  });
});
