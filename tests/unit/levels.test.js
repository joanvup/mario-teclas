import { describe, expect, it } from 'vitest';
import { LEVELS, LEVEL_BY_ID, levelsOfWorld, nextLevelId } from '../../src/levels/levels.js';
import { buildLevel, checkReachability, jumpReach } from '../../src/game/levelBuilder.js';
import { WORLDS, WORLD_BY_ID } from '../../src/worlds/worlds.js';
import { APP } from '../../src/config/appConfig.js';

const built = LEVELS.map((def) => ({ def, level: buildLevel(def) }));

describe('estructura de los 48 niveles', () => {
  it('tiene 12 mundos y 4 niveles por mundo, sin identificadores repetidos', () => {
    expect(WORLDS).toHaveLength(12);
    expect(LEVELS).toHaveLength(48);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(48);
    expect(new Set(LEVELS.map((l) => l.seed)).size).toBe(48);
    for (const world of WORLDS) {
      const levels = levelsOfWorld(world.id);
      expect(levels).toHaveLength(4);
      expect(levels.map((l) => l.index)).toEqual([1, 2, 3, 4]);
      expect(levels.every((l) => l.world === world.id)).toBe(true);
    }
  });

  it('define una habilidad, un objetivo y una introducción para cada nivel', () => {
    for (const level of LEVELS) {
      expect(level.name.length).toBeGreaterThan(3);
      expect(level.skill.length).toBeGreaterThan(3);
      expect(level.objective.length).toBeGreaterThan(8);
      expect(level.intro.length).toBeGreaterThan(8);
      expect(WORLD_BY_ID[level.world]).toBeTruthy();
      expect(level.requiredCoins).toBeLessThanOrEqual(level.coins);
      expect(level.requiredCoins).toBeGreaterThan(0);
    }
  });

  it('genera un recorrido distinto para cada nivel', () => {
    const signatures = built.map(({ level }) =>
      level.platforms.map((p) => `${p.x}:${p.y}:${p.w}`).join('|'),
    );
    expect(new Set(signatures).size).toBe(LEVELS.length);
    expect(levelSignature('w1l1')).not.toBe(levelSignature('w1l2'));
    expect(levelSignature('w3l1')).not.toBe(levelSignature('w3l2'));
  });

  it('construye plataformas, monedas, portales y objetivos coherentes', () => {
    for (const { def, level } of built) {
      expect(level.id).toBe(def.id);
      expect(level.platforms.length).toBeGreaterThanOrEqual(1);
      expect(level.portal).toBeTruthy();
      expect(level.portal.x).toBeGreaterThan(level.platforms[0].x);
      expect(level.coins.length).toBeGreaterThanOrEqual(def.requiredCoins);
      expect(level.coins.length).toBeLessThanOrEqual(def.coins + 2);
      expect(level.gates.length).toBe(def.gates.length);
      expect(level.checkpoints.length).toBeLessThanOrEqual(def.checkpoints);
      expect(level.obstacles.length).toBeLessThanOrEqual(def.obstacles);
      expect(level.platforms.filter((p) => p.moving).length).toBeLessThanOrEqual(def.moving);
      if (def.moving > 0) {
        expect(level.platforms.some((p) => p.moving)).toBe(true);
      }
    }
  });

  it('mantiene las secuencias y palabras bien formadas', () => {
    for (const { level } of built) {
      for (const gate of level.gates) {
        expect(Array.isArray(gate.keys)).toBe(true);
        expect(gate.keys.length).toBeGreaterThan(0);
        expect(gate.keys.every((k) => typeof k === 'string' && k.length > 0)).toBe(true);
        if (gate.word) expect(gate.word).toBe(gate.keys.join(''));
        if (gate.paragraph) expect(gate.keys.join('')).toBe(gate.paragraph);
        expect(gate.label).not.toContain('undefined');
      }
    }
    expect(LEVEL_BY_ID.w8l2.gates.some((g) => g.keys.includes('Ñ'))).toBe(true);
    expect(LEVEL_BY_ID.w8l4.gates.some((g) => g.word === 'TECLADO')).toBe(true);
  });

  it('añade frases y párrafos progresivos en los mundos altos', () => {
    const paragraphsOf = (id) => LEVEL_BY_ID[id].gates.filter((g) => g.paragraph);
    expect(paragraphsOf('w9l1')).toHaveLength(2);
    expect(paragraphsOf('w12l4')).toHaveLength(4);
    for (const level of LEVELS.filter((l) => l.world >= 9)) {
      expect(level.gates.some((g) => g.paragraph)).toBe(true);
    }
    expect(LEVELS.filter((l) => l.world <= 8).some((l) => l.gates.some((g) => g.paragraph))).toBe(false);
    const longest = Math.max(
      ...built.flatMap(({ level }) => level.gates.filter((g) => g.paragraph).map((g) => g.paragraph.length)),
    );
    expect(longest).toBeGreaterThan(100);
    const allParagraphs = built.flatMap(({ level }) => level.gates.filter((g) => g.paragraph));
    expect(allParagraphs.some((g) => /ñ/i.test(g.paragraph))).toBe(true);
    expect(allParagraphs.some((g) => /[áéíóú]/i.test(g.paragraph))).toBe(true);
    expect(allParagraphs.some((g) => /,/.test(g.paragraph))).toBe(true);
    for (const gate of allParagraphs) {
      expect(gate.keys.join('')).toBe(gate.paragraph);
      expect(gate.label).toMatch(/frase|párrafo/i);
    }
  });

  it('todos los saltos son alcanzables, incluso con plataformas móviles', () => {
    const failures = built
      .map(({ def, level }) => ({ id: def.id, result: checkReachability(level, APP.physics) }))
      .filter(({ result }) => !result.ok);
    expect(failures).toEqual([]);
  });

  it('rechaza un recorrido con un hueco o desnivel imposible', () => {
    const impossible = {
      platforms: [
        { id: 'p0', x: 0, y: 460, w: 100, h: 100 },
        { id: 'p1', x: 9000, y: 100, w: 100, h: 20 },
      ],
      gates: [],
    };
    const result = checkReachability(impossible, APP.physics);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.reason === 'hueco')).toBe(true);
    expect(result.issues.some((i) => i.reason === 'desnivel')).toBe(true);
  });

  it('calcula un alcance de salto realista y decreciente con la altura', () => {
    const flat = jumpReach(APP.physics, 0);
    const high = jumpReach(APP.physics, 40);
    const almostTop = jumpReach(APP.physics, APP.physics.jumpSpeed ** 2 / (2 * APP.physics.gravity) - 1);
    expect(flat).toBeGreaterThan(100);
    expect(flat).toBeLessThan(250);
    expect(high).toBeLessThan(flat);
    expect(almostTop).toBeGreaterThan(0);
    expect(jumpReach(APP.physics, 999)).toBe(0);
  });

  it('genera el mismo recorrido dos veces con la misma semilla', () => {
    const a = buildLevel(LEVEL_BY_ID.w4l2);
    const b = buildLevel(LEVEL_BY_ID.w4l2);
    expect(a.platforms).toEqual(b.platforms);
    expect(a.coins).toEqual(b.coins);
    expect(a.gates.map((g) => [g.x, g.y, g.keys])).toEqual(b.gates.map((g) => [g.x, g.y, g.keys]));
  });

  it('calcula el nivel siguiente y el final de la aventura', () => {
    expect(nextLevelId('w1l1')).toBe('w1l2');
    expect(nextLevelId('w1l4')).toBe('w2l1');
    expect(nextLevelId('w8l4')).toBe('w9l1');
    expect(nextLevelId('w11l4')).toBe('w12l1');
    expect(nextLevelId('w12l4')).toBe(null);
  });
});

function levelSignature(id) {
  const { level } = built.find(({ def }) => def.id === id);
  return level.platforms.map((p) => `${p.x}:${p.y}:${p.w}`).join('|');
}
