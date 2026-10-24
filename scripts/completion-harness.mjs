#!/usr/bin/env node
/**
 * Harness de completitud de niveles.
 *
 * Valida, sin navegador, que los 48 niveles estén bien definidos, que se
 * puedan construir de forma determinista, que sus retos usen teclas válidas
 * en las dos distribuciones, que las frases y párrafos se puedan escribir y
 * que todos los saltos sean alcanzables.
 *
 * Uso: npm run test:levels
 */

import { APP } from '../src/config/appConfig.js';
import { LEVELS, LEVEL_BY_ID, levelsOfWorld, nextLevelId } from '../src/levels/levels.js';
import { buildLevel, checkReachability, jumpReach } from '../src/game/levelBuilder.js';
import { WORLDS } from '../src/worlds/worlds.js';
import { makeTarget, matchesTarget } from '../src/input/layouts.js';
import { paragraphKind, paragraphStatus } from '../src/input/paragraph.js';

const failures = [];
const notes = [];

function fail(levelId, message) {
  failures.push(`${levelId}: ${message}`);
}

function assert(levelId, condition, message) {
  if (!condition) fail(levelId, message);
}

const REQUIRED_TEXT = ['name', 'skill', 'intro', 'objective', 'extraChallenge'];

// ── Estructura general ──────────────────────────────────────────────────
assert('global', WORLDS.length === 12, `se esperaban 12 mundos y hay ${WORLDS.length}`);
assert('global', LEVELS.length === 48, `se esperaban 48 niveles y hay ${LEVELS.length}`);
assert(
  'global',
  nextLevelId('w8l4') === 'w9l1',
  `el mundo 8 no continúa en el mundo 9 (${nextLevelId('w8l4')})`,
);
assert(
  'global',
  new Set(LEVELS.map((level) => level.id)).size === LEVELS.length,
  'hay identificadores de nivel repetidos',
);
assert(
  'global',
  new Set(LEVELS.map((level) => level.seed)).size === LEVELS.length,
  'hay semillas repetidas (dos niveles compartirían recorrido)',
);

for (const world of WORLDS) {
  const levels = levelsOfWorld(world.id);
  assert(
    `mundo ${world.id}`,
    levels.length === 4,
    `el mundo ${world.id} tiene ${levels.length} niveles en vez de 4`,
  );
  assert(
    `mundo ${world.id}`,
    levels.map((level) => level.index).join(',') === '1,2,3,4',
    `los índices del mundo ${world.id} no son 1,2,3,4`,
  );
  assert(
    `mundo ${world.id}`,
    levels.every((level) => level.world === world.id),
    `algún nivel del mundo ${world.id} apunta a otro mundo`,
  );
}

// ── Definiciones y recorridos ───────────────────────────────────────────
const rows = [];

for (const def of LEVELS) {
  const id = def.id;
  const level = buildLevel(def);
  const builtAgain = buildLevel(def);

  for (const field of REQUIRED_TEXT) {
    assert(id, typeof def[field] === 'string' && def[field].trim().length >= 8, `campo ${field} vacío o demasiado corto`);
  }
  assert(id, Number.isInteger(def.world) && def.world >= 1 && def.world <= 12, 'mundo fuera de rango');
  assert(id, Number.isFinite(def.length) && def.length >= 900, 'recorrido demasiado corto');
  assert(id, def.requiredCoins > 0 && def.requiredCoins <= def.coins, 'monedas requeridas incoherentes');
  assert(id, def.coins >= def.requiredCoins, 'no hay monedas suficientes para el objetivo');

  assert(id, level.id === def.id, 'el nivel construido no conserva el id');
  assert(id, level.platforms.length > 0, 'el nivel no tiene plataformas');
  assert(id, level.portal, 'el nivel no tiene portal');
  assert(id, level.coins.length >= def.requiredCoins, 'hay menos monedas construidas que las requeridas');
  assert(id, level.gates.length === def.gates.length, 'se perdió alguna burbuja educativa');
  assert(id, level.checkpoints.length <= def.checkpoints, 'se generaron más banderines de los declarados');
  assert(id, level.obstacles.length <= def.obstacles, 'se generaron más obstáculos de los declarados');
  assert(
    id,
    level.platforms.filter((platform) => platform.moving).length <= def.moving,
    'se generaron más plataformas móviles de las declaradas',
  );
  if (def.moving > 0) {
    assert(id, level.platforms.some((platform) => platform.moving), 'faltan plataformas móviles declaradas');
  }
  if (def.obstacles > 0) {
    assert(id, level.obstacles.length > 0, 'faltan obstáculos declarados');
  }

  // Determinismo: la misma semilla debe producir el mismo recorrido.
  assert(
    id,
    JSON.stringify(level.platforms) === JSON.stringify(builtAgain.platforms) &&
      JSON.stringify(level.coins) === JSON.stringify(builtAgain.coins) &&
      JSON.stringify(level.gates.map((gate) => [gate.x, gate.y, gate.keys])) ===
        JSON.stringify(builtAgain.gates.map((gate) => [gate.x, gate.y, gate.keys])),
    'el recorrido no es determinista para la misma semilla',
  );

  // Retos educativos: teclas resolubles en latam y US, palabras y párrafos coherentes.
  for (const [index, gate] of level.gates.entries()) {
    assert(id, Array.isArray(gate.keys) && gate.keys.length > 0, `la burbuja ${index} no tiene teclas`);
    assert(
      id,
      gate.keys.every((key) => typeof key === 'string' && key.length > 0),
      `la burbuja ${index} tiene una tecla vacía`,
    );
    if (gate.paragraph) {
      assert(
        id,
        gate.keys.join('') === gate.paragraph,
        `el párrafo ${index} y sus teclas no coinciden`,
      );
      assert(
        id,
        gate.paragraph.trim() === gate.paragraph && gate.paragraph.length >= 8,
        `el párrafo ${index} está vacío o tiene espacios sobrantes`,
      );
      assert(
        id,
        /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9 ,.;:!?]+$/u.test(gate.paragraph),
        `el párrafo ${index} contiene caracteres que no se pueden teclear con una sola pulsación`,
      );
      assert(
        id,
        ['frase', 'párrafo'].includes(paragraphKind(gate.paragraph)),
        `el párrafo ${index} no se clasifica como frase ni párrafo`,
      );
      const status = paragraphStatus(gate.paragraph, gate.paragraph);
      assert(id, status.completed && status.exact, `el párrafo ${index} no se reconoce al escribirlo completo`);
      assert(id, gate.progress === 0, `el párrafo ${index} no empieza sin escribir`);
      assert(id, gate.progress === 0, `el párrafo ${index} no empieza sin escribir`);
    } else {
      assert(
        id,
        gate.keys.every((key) => makeTarget(key, 'latam').code && makeTarget(key, 'us').code),
        `la burbuja ${index} tiene una tecla no resoluble en algún teclado`,
      );
      if (gate.word) {
        assert(id, gate.word === gate.keys.join(''), `la palabra ${gate.word} no coincide con sus teclas`);
      }
    }
    assert(id, gate.x > 0 && gate.x < level.portal.x + 80, `la burbuja ${index} queda fuera del recorrido`);
  }

  // Alcanzabilidad física de todos los saltos.
  const reach = checkReachability(level, APP.physics);
  assert(id, reach.ok, `saltos imposibles: ${reach.issues.map((issue) => issue.reason).join(', ')}`);

  // Continuidad entre niveles.
  const next = nextLevelId(id);
  if (def.world === 12 && def.index === 4) {
    assert(id, next === null, 'el último nivel debería terminar la aventura');
  } else {
    assert(id, next && LEVEL_BY_ID[next], `no se pudo calcular el nivel siguiente de ${id}`);
  }

  rows.push({
    id,
    world: def.world,
    index: def.index,
    name: def.name,
    skill: def.skill,
    platforms: level.platforms.length,
    coins: `${def.requiredCoins}/${level.coins.length}`,
    gates: level.gates.length,
    moving: level.platforms.filter((platform) => platform.moving).length,
    reach: reach.ok ? 'OK' : 'FALLA',
  });
}

// ── Cobertura educativa ─────────────────────────────────────────────────
const allKeys = LEVELS.flatMap((level) => level.gates.flatMap((gate) => gate.keys));
const requiredKeys = ['Ñ', 'ESPACIO', 'ENTER', 'RETROCESO'];
for (const key of requiredKeys) {
  assert('cobertura', allKeys.includes(key), `ningún reto usa la tecla ${key}`);
}
const numericKeys = allKeys.filter((key) => /^[0-9]$/.test(key));
assert('cobertura', numericKeys.length >= 5, 'la fila numérica aparece poco en los retos');

// Frases y párrafos: aparecen en los mundos altos, crecen en dificultad y
// incluyen tildes y Ñ para practicar el teclado latinoamericano.
const paragraphGates = LEVELS.flatMap((level) =>
  level.gates.filter((gate) => gate.paragraph).map((gate) => ({ level, gate })),
);
assert('cobertura', paragraphGates.length >= 40, `solo hay ${paragraphGates.length} retos de frase o párrafo`);
assert(
  'cobertura',
  paragraphGates.every(({ level }) => level.world >= 9),
  'hay frases o párrafos antes del mundo 9',
);
const lowParagraphs = LEVELS.filter((level) => level.world <= 8).flatMap((level) =>
  level.gates.filter((gate) => gate.paragraph),
);
assert('cobertura', lowParagraphs.length === 0, 'los mundos 1–8 no deberían tener párrafos');
const lastWorldParagraphs = LEVELS.filter((level) => level.world === 12).flatMap((level) =>
  level.gates.filter((gate) => gate.paragraph),
);
assert('cobertura', lastWorldParagraphs.length >= 10, 'el mundo 12 necesita párrafos suficientes');
assert(
  'cobertura',
  lastWorldParagraphs.some((gate) => paragraphKind(gate.paragraph) === 'párrafo'),
  'el mundo 12 no contiene ningún párrafo largo',
);
assert(
  'cobertura',
  paragraphGates.some(({ gate }) => /[áéíóúü]/i.test(gate.paragraph)),
  'ningún párrafo practica tildes',
);
assert(
  'cobertura',
  paragraphGates.some(({ gate }) => /ñ/i.test(gate.paragraph)),
  'ningún párrafo practica la Ñ',
);
assert(
  'cobertura',
  paragraphGates.some(({ gate }) => /,/.test(gate.paragraph)),
  'ningún párrafo practica la coma',
);
const longestParagraph = Math.max(...paragraphGates.map(({ gate }) => gate.paragraph.length));
const shortestParagraph = Math.min(...paragraphGates.map(({ gate }) => gate.paragraph.length));
assert('cobertura', longestParagraph > shortestParagraph * 2, 'los párrafos no progresan en longitud');

// Las flechas se enseñan en la demostración y en el tutorial, no como reto.
const demoKeys = LEVELS.flatMap((level) => level.demoKeys ?? []);
for (const key of ['ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Backspace', 'KeyÑ']) {
  assert('cobertura', demoKeys.includes(key), `la demostración nunca enseña ${key}`);
}

// Las tildes se practican en el taller; comprobamos que el motor las resuelva.
for (const accented of ['Á', 'É', 'Í', 'Ó', 'Ú']) {
  assert(
    'cobertura',
    matchesTarget({ key: accented, code: 'KeyA' }, makeTarget(accented)),
    `el motor no reconoce la tilde ${accented}`,
  );
}
notes.push(`Teclas distintas en retos: ${new Set(allKeys).size}`);
notes.push(
  `Frases y párrafos: ${paragraphGates.length} retos · longitud ${shortestParagraph}–${longestParagraph} caracteres`,
);
notes.push(`Tildes verificadas en el motor: Á É Í Ó Ú (taller de práctica)`);
notes.push(`Alcance de salto en plano: ${jumpReach(APP.physics, 0).toFixed(1)} px`);

// ── Informe ─────────────────────────────────────────────────────────────
console.log('Tecladoaventura · verificación de los 48 niveles\n');
for (const row of rows) {
  console.log(
    `  ${row.id.padEnd(5)} M${row.world}-${row.index}  ${row.name.padEnd(30)} ` +
      `plataformas=${String(row.platforms).padStart(2)} monedas=${row.coins.padStart(5)} ` +
      `retos=${row.gates} móviles=${row.moving} saltos=${row.reach}`,
  );
}
console.log('');
for (const note of notes) console.log(`  · ${note}`);
console.log('');

if (failures.length) {
  console.error(`✖ ${failures.length} problema(s) encontrados:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exitCode = 1;
} else {
  console.log('✔ 48/48 niveles válidos, deterministas, completables y con saltos alcanzables.');
}
