import { WORLD_BY_ID } from '../worlds/worlds.js';
import { makeTarget } from '../input/layouts.js';
import { paragraphKind } from '../input/paragraph.js';
import { APP } from '../config/appConfig.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Distancia horizontal máxima que el jugador puede recorrer mientras está
 * a una altura `height` por encima del punto de salto. Sirve para validar
 * que los huecos y desniveles sean alcanzables.
 */
export function jumpReach(physics, height = 0) {
  const disc = physics.jumpSpeed ** 2 - 2 * physics.gravity * Math.max(0, height);
  if (disc <= 0) return 0;
  const window = (2 * Math.sqrt(disc)) / physics.gravity;
  return window * physics.moveSpeed;
}

export function gateLabel(gate) {
  if (!gate) return '';
  if (gate.paragraph) {
    return paragraphKind(gate.paragraph) === 'párrafo'
      ? 'Escribe un párrafo completo'
      : 'Escribe una frase completa';
  }
  if (gate.word) return `Escribe ${gate.word}`;
  const targets = gate.keys.map((k) => makeTarget(k).display);
  if (targets.length === 1) return `Pulsa ${targets[0]}`;
  return `Escribe ${targets.join(' + ')}`;
}

/**
 * Convierte una definición de nivel en un recorrido concreto.
 * Las plataformas nunca exigen saltos imposibles: se validan los límites
 * de salto del jugador al generar cada hueco y desnivel.
 */
export function buildLevel(def) {
  const world = WORLD_BY_ID[def.world] || WORLD_BY_ID[1];
  const rng = mulberry32(def.seed);
  const level = {
    ...def,
    worldData: world,
    width: def.length + 320,
    platforms: [],
    gates: [],
    coins: [],
    obstacles: [],
    checkpoints: [],
    decorations: [],
    spawn: { x: 90, y: 460 - 48 },
    portal: null,
    minX: 0,
    maxX: 0,
  };

  const flat = !def.gap || def.gap[1] === 0;
  let previousY = 460;

  if (flat) {
    level.platforms.push({
      x: 0,
      y: 460,
      w: Math.max(1400, def.length + 260),
      h: 120,
      kind: 'ground',
      id: 'p0',
    });
  } else {
    level.platforms.push({ x: 0, y: 460, w: 420, h: 120, kind: 'ground', id: 'p0' });
    let x = 420;
    let index = 1;
    let guard = 0;
    while (x < def.length - 360 && guard < 60) {
      guard += 1;
      const [gapMin, gapMax] = def.gap;
      let gap = gapMin + rng() * (gapMax - gapMin);
      const elevation = def.elevation || [0, 50];
      const delta = Math.round((rng() * 2 - 1) * elevation[1]);
      let y = clamp(previousY + delta, 305, 460);
      // El desnivel se limita para que el salto sea cómodo con el movimiento
      // vertical de las plataformas y el hueco se calcula con la altura real.
      if (previousY - y > 45) y = previousY - 45;
      const uphill = Math.max(0, previousY - y);
      const reach = jumpReach(APP.physics, uphill + 12);
      gap = Math.min(gap, Math.max(45, reach - 52));
      let w = Math.round(175 + rng() * 120);
      if (def.world >= 6) w = Math.round(155 + rng() * 105);
      const id = `p${index}`;
      const platform = { x: Math.round(x + gap), y, w, h: 26, kind: 'platform', id };
      level.platforms.push(platform);
      x = platform.x + w;
      previousY = y;
      index += 1;
      if (x > def.length - 200) break;
    }
    // Plataforma final amplia y segura.
    const last = level.platforms[level.platforms.length - 1];
    const finalX = Math.max(x + 15, last.x + last.w + 70);
    level.platforms.push({
      x: finalX,
      y: 455,
      w: 430,
      h: 110,
      kind: 'ground',
      id: `p${index}`,
    });
  }

  const platforms = level.platforms;
  const lastPlatform = platforms[platforms.length - 1];
  level.width = lastPlatform.x + lastPlatform.w + 80;

  // Plataformas móviles: se eligen separadas entre sí para que el salto
  // siempre tenga una plataforma estable desde la cual esperar el momento.
  if (def.moving > 0) {
    const candidates = platforms.filter((p, i) => i > 1 && i < platforms.length - 1);
    const selected = candidates
      .filter((_, idx) => idx % 2 === 0)
      .slice(0, Math.min(def.moving, Math.ceil(candidates.length / 2)));
    selected.forEach((platform, i) => {
      platform.moving = {
        axis: i % 2 === 0 ? 'x' : 'y',
        baseX: platform.x,
        baseY: platform.y,
        range: i % 2 === 0 ? 12 + rng() * 10 : 8 + rng() * 6,
        speed: 0.35 + rng() * 0.25,
        phase: rng() * Math.PI * 2,
      };
    });
  }

  // Monedas: sobre plataformas y en arcos sobre los huecos.
  const coinSpots = [];
  for (let i = 0; i < platforms.length; i += 1) {
    const p = platforms[i];
    if (p.kind === 'ground' && i === 0) continue;
    coinSpots.push({ x: p.x + p.w * 0.5, y: p.y - 62 });
    if (i > 0) {
      const prev = platforms[i - 1];
      const gap = p.x - (prev.x + prev.w);
      if (gap > 45) {
        coinSpots.push({
          x: prev.x + prev.w + gap * 0.5,
          y: Math.min(prev.y, p.y) - 96,
        });
      }
    }
  }
  if (flat) {
    const count = Math.max(def.coins, 4);
    for (let i = 0; i < count; i += 1) {
      coinSpots.push({
        x: 300 + (i * (Math.max(700, def.length - 520))) / Math.max(1, count - 1),
        y: 398,
      });
    }
  }
  while (coinSpots.length < def.coins) {
    const p = platforms[1 + Math.floor(rng() * Math.max(1, platforms.length - 2))];
    if (!p) break;
    coinSpots.push({ x: p.x + 35 + rng() * Math.max(20, p.w - 70), y: p.y - 58 });
  }
  level.coins = coinSpots
    .slice(0, Math.min(def.coins + 2, coinSpots.length))
    .map((c, i) => ({ ...c, id: `c${i}`, r: 13, collected: false, spin: rng() * Math.PI * 2 }));

  // Puertas educativas.
  const gatePlatforms = [];
  const gateDefs = def.gates || [];
  gateDefs.forEach((gateDef, i) => {
    const fraction = gateDef.at ?? (i + 1) / (gateDefs.length + 1);
    let idx = Math.round(fraction * (platforms.length - 1));
    idx = clamp(idx, 1, platforms.length - 2);
    let guard = 0;
    while (gatePlatforms.includes(idx) && guard < platforms.length) {
      idx = clamp(idx + 1, 1, platforms.length - 2);
      guard += 1;
    }
    gatePlatforms.push(idx);
    const p = platforms[idx];
    level.gates.push({
      ...gateDef,
      id: `g${i}`,
      x: p.x + p.w * 0.5,
      y: p.y - 64,
      platformIndex: idx,
      progress: 0,
      completed: false,
      pulse: rng() * Math.PI * 2,
      label: gateLabel(gateDef),
    });
  });

  // Banderines de control.
  for (let i = 0; i < def.checkpoints; i += 1) {
    const fraction = (i + 1) / (def.checkpoints + 1);
    const idx = clamp(Math.round(fraction * (platforms.length - 1)), 1, platforms.length - 2);
    const p = platforms[idx];
    level.checkpoints.push({
      x: p.x + Math.min(70, p.w * 0.35),
      y: p.y - 86,
      active: false,
      id: `cp${i}`,
      index: idx,
    });
  }

  // Obstáculos amistosos que patrullan.
  const obstaclePlatforms = platforms
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => i > 1 && i < platforms.length - 1 && p.w > 150);
  for (let i = 0; i < def.obstacles; i += 1) {
    const spot = obstaclePlatforms[Math.floor(rng() * obstaclePlatforms.length)];
    if (!spot) break;
    const p = spot.p;
    level.obstacles.push({
      x: p.x + 45 + rng() * Math.max(20, p.w - 120),
      y: p.y - 30,
      w: 34,
      h: 30,
      minX: p.x + 24,
      maxX: p.x + p.w - 58,
      dir: rng() > 0.5 ? 1 : -1,
      speed: 30 + rng() * 34,
      phase: rng() * Math.PI * 2,
      kind: def.world >= 7 ? 'cristal' : def.world === 6 ? 'murcielago' : 'babosa',
      baseY: p.y - 30,
    });
  }

  // Portal final.
  level.portal = {
    x: lastPlatform.x + lastPlatform.w - 90,
    y: lastPlatform.y - 126,
    w: 64,
    h: 126,
    locked: true,
  };
  level.maxX = level.width;
  level.spawn = { x: 80, y: 460 - 48 };
  level.totalGates = level.gates.length;
  level.totalCoins = level.coins.length;
  level.phases = def.phases || 1;
  return level;
}

/**
 * Comprobación conservadora de alcanzabilidad: cada salto horizontal debe
 * caber en el alcance del jugador y el desnivel no puede superar su salto.
 */
export function checkReachability(level, physics = APP.physics) {
  const airtime = (2 * physics.jumpSpeed) / physics.gravity;
  const maxDistance = airtime * physics.moveSpeed;
  const maxHeight = (physics.jumpSpeed ** 2) / (2 * physics.gravity);
  const platforms = level.platforms;
  const issues = [];
  for (let i = 1; i < platforms.length; i += 1) {
    const prev = platforms[i - 1];
    const next = platforms[i];
    const prevRangeX = prev.moving?.axis === 'x' ? prev.moving.range : 0;
    const nextRangeX = next.moving?.axis === 'x' ? next.moving.range : 0;
    const prevRangeY = prev.moving?.axis === 'y' ? prev.moving.range : 0;
    const nextRangeY = next.moving?.axis === 'y' ? next.moving.range : 0;
    // Peor caso: las plataformas se separan y la siguiente está más alta.
    const gap = next.x - (prev.x + prev.w) + prevRangeX + nextRangeX;
    const uphill = prev.y - next.y + prevRangeY + nextRangeY;
    const reach = jumpReach(physics, uphill);
    if (uphill > maxHeight - 18) {
      issues.push({ from: prev.id, to: next.id, reason: 'desnivel', value: Math.round(uphill) });
    }
    if (reach === 0 || gap > reach - 22) {
      issues.push({ from: prev.id, to: next.id, reason: 'hueco', value: Math.round(gap) });
    }
    if (gap < 0) {
      issues.push({ from: prev.id, to: next.id, reason: 'solapamiento', value: Math.round(gap) });
    }
  }
  for (const gate of level.gates) {
    const p = platforms[gate.platformIndex];
    if (!p) issues.push({ gate: gate.id, reason: 'sin plataforma' });
  }
  return { ok: issues.length === 0, issues, maxDistance, maxHeight };
}
