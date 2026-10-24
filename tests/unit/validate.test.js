import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/levels/levels.js';
import { DEFAULT_SETTINGS } from '../../src/config/appConfig.js';
import {
  sanitizeAlias,
  safeNumber,
  sanitizeSettings,
  validateImport,
} from '../../src/progress/validate.js';

const VALID_IDS = new Set(LEVELS.map((l) => l.id));

const validImport = () => ({
  app: 'tecladoaventura',
  version: 1,
  exportedAt: '2026-01-01T10:00:00.000Z',
  profile: {
    alias: '  Ana <3  ',
    tutorialDone: true,
    settings: {
      layout: 'es',
      inputMode: 'position',
      volume: 0.42,
      sound: false,
      highContrast: true,
      reducedMotion: false,
    },
    progress: {
      w1l1: {
        completed: true,
        stars: 99,
        bestScore: 1200,
        attempts: 2,
        correct: 10,
        incorrect: 1,
        accuracy: 90.9,
        helps: 0,
        timeMs: 5000,
        gatesCompleted: 0,
      },
      w2l1: { completed: false, stars: 1, accuracy: -3 },
      nivelInventado: { completed: true, stars: 3 },
    },
    keyErrors: { A: 3, 'Ñ': 2, X: 'muchos', 'clave demasiado larga para guardar': 9 },
  },
});

describe('saneamiento de datos', () => {
  it('limpia apodos y limita su longitud', () => {
    expect(sanitizeAlias('  Ana <3  ')).toBe('Ana 3');
    expect(sanitizeAlias('<script>alert(1)</script>')).toHaveLength(16);
    expect(sanitizeAlias('<script>alert(1)</script>')).toBe('scriptalert(1)sc');
    expect(sanitizeAlias('')).toBe('Aventurero');
    expect(sanitizeAlias(null)).toBe('Aventurero');
    expect(sanitizeAlias('a'.repeat(40))).toHaveLength(16);
  });

  it('normaliza números y ajustes fuera de rango', () => {
    expect(safeNumber(NaN, 5)).toBe(5);
    expect(safeNumber(-4, 5, 0, 10)).toBe(0);
    expect(safeNumber(40, 5, 0, 10)).toBe(10);
    expect(safeNumber(3.6)).toBe(4);
    const settings = sanitizeSettings({
      layout: 'us',
      inputMode: 'posicion',
      sound: 'sí',
      volume: 5,
      largeText: true,
    });
    expect(settings.layout).toBe('us');
    expect(settings.inputMode).toBe(DEFAULT_SETTINGS.inputMode);
    expect(settings.sound).toBe(DEFAULT_SETTINGS.sound);
    expect(settings.volume).toBe(1);
    expect(settings.largeText).toBe(true);
  });
});

describe('validación de archivos de progreso', () => {
  it('rechaza archivos que no son de Tecladoaventura', () => {
    for (const raw of [null, undefined, [], 'texto', 42]) {
      const result = validateImport(raw, VALID_IDS);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('formato');
    }
    expect(validateImport({ app: 'otro', version: 1 }, VALID_IDS)).toMatchObject({
      ok: false,
      error: expect.stringContaining('no pertenece'),
    });
  });

  it('rechaza versiones incompatibles', () => {
    for (const version of [0, 2, 99, '1', null]) {
      const raw = { ...validImport(), version };
      expect(validateImport(raw, VALID_IDS).ok).toBe(false);
    }
  });

  it('rechaza archivos sin perfil o sin progreso', () => {
    expect(validateImport({ app: 'tecladoaventura', version: 1 }, VALID_IDS)).toMatchObject({
      ok: false,
      error: expect.stringContaining('perfil'),
    });
    expect(
      validateImport({ app: 'tecladoaventura', version: 1, profile: { alias: 'Ana' } }, VALID_IDS),
    ).toMatchObject({ ok: false, error: expect.stringContaining('progreso') });
    expect(
      validateImport(
        { app: 'tecladoaventura', version: 1, profile: { progress: null } },
        VALID_IDS,
      ),
    ).toMatchObject({ ok: false, error: expect.stringContaining('progreso') });
  });

  it('rechaza un progreso que no corresponde a ningún nivel del juego', () => {
    const raw = validImport();
    raw.profile.progress = { nivelInventado: { completed: true, stars: 3 } };
    const result = validateImport(raw, VALID_IDS);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('no corresponde');
  });

  it('acepta y sanea un archivo válido', () => {
    const result = validateImport(validImport(), VALID_IDS);
    expect(result.ok).toBe(true);
    const profile = result.profile;
    expect(profile.alias).toBe('Ana 3');
    expect(profile.tutorialDone).toBe(true);
    expect(profile.settings.layout).toBe('es');
    expect(profile.settings.inputMode).toBe('position');
    expect(profile.settings.volume).toBeCloseTo(0.42);
    expect(Object.keys(profile.progress).sort()).toEqual(['w1l1', 'w2l1']);
    expect(profile.progress.w1l1.stars).toBe(3);
    expect(profile.progress.w1l1.accuracy).toBe(90.9);
    expect(profile.progress.w2l1.stars).toBe(1);
    expect(profile.progress.w2l1.accuracy).toBe(0);
    expect(profile.keyErrors).toEqual({ A: 3, 'Ñ': 2, X: 0 });
    expect(result.stats).toEqual({ levels: 1, stars: 4 });
  });

  it('acepta un perfil sin progreso como inicio limpio', () => {
    const raw = validImport();
    raw.profile.progress = {};
    const result = validateImport(raw, VALID_IDS);
    expect(result.ok).toBe(true);
    expect(result.stats).toEqual({ levels: 0, stars: 0 });
  });
});
