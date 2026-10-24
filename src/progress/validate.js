import { DEFAULT_SETTINGS } from '../config/appConfig.js';

const SETTING_ENUMS = {
  layout: ['latam', 'es', 'us'],
  inputMode: ['char', 'position'],
};
const BOOL_SETTINGS = [
  'sound',
  'music',
  'reducedMotion',
  'highContrast',
  'largeText',
  'onScreenControls',
  'showKeyboardHints',
];

export function sanitizeAlias(value) {
  if (typeof value !== 'string') return 'Aventurero';
  const clean = value.replace(/[<>{}[\]\\/]/g, '').trim().slice(0, 16);
  return clean || 'Aventurero';
}

export function safeNumber(value, fallback = 0, min = 0, max = 1e9) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function sanitizeSettings(raw = {}) {
  const out = { ...DEFAULT_SETTINGS };
  for (const [key, allowed] of Object.entries(SETTING_ENUMS)) {
    if (allowed.includes(raw?.[key])) out[key] = raw[key];
  }
  for (const key of BOOL_SETTINGS) {
    if (typeof raw?.[key] === 'boolean') out[key] = raw[key];
  }
  if (typeof raw?.volume === 'number' && Number.isFinite(raw.volume)) {
    out.volume = Math.min(1, Math.max(0, raw.volume));
  }
  return out;
}

export function sanitizeLevelStats(raw, validIds) {
  const progress = {};
  if (!raw || typeof raw !== 'object') return progress;
  for (const [id, stats] of Object.entries(raw)) {
    if (!validIds.has(id) || !stats || typeof stats !== 'object') continue;
    const accuracyValue =
      typeof stats.accuracy === 'number' && Number.isFinite(stats.accuracy)
        ? Math.min(100, Math.max(0, stats.accuracy))
        : null;
    progress[id] = {
      completed: stats.completed === true,
      stars: safeNumber(stats.stars, 0, 0, 3),
      bestScore: safeNumber(stats.bestScore, 0, 0, 1e7),
      attempts: safeNumber(stats.attempts, 0, 0, 1e6),
      correct: safeNumber(stats.correct, 0, 0, 1e6),
      incorrect: safeNumber(stats.incorrect, 0, 0, 1e6),
      accuracy: accuracyValue,
      helps: safeNumber(stats.helps, 0, 0, 1e6),
      timeMs: safeNumber(stats.timeMs, 0, 0, 1e9),
      completedAt: typeof stats.completedAt === 'string' ? stats.completedAt : null,
      lastPlayed: typeof stats.lastPlayed === 'string' ? stats.lastPlayed : null,
      gatesCompleted: safeNumber(stats.gatesCompleted, 0, 0, 1e6),
    };
  }
  return progress;
}

export function sanitizeKeyErrors(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key !== 'string' || key.length > 30) continue;
    out[key.slice(0, 30)] = safeNumber(value, 0, 0, 1e6);
  }
  return out;
}

export function emptyProfile(id, alias) {
  return {
    id,
    alias,
    createdAt: new Date().toISOString(),
    tutorialDone: false,
    settings: { ...DEFAULT_SETTINGS },
    progress: {},
    keyErrors: {},
  };
}

export function sanitizeProfile(raw, id = null) {
  if (!raw || typeof raw !== 'object') return null;
  const profile = emptyProfile(
    id || (typeof raw.id === 'string' && raw.id.length < 60 ? raw.id : 'p_imported'),
    sanitizeAlias(raw.alias),
  );
  profile.tutorialDone = raw.tutorialDone === true;
  profile.settings = sanitizeSettings(raw.settings);
  profile.progress = sanitizeLevelStats(raw.progress, raw.__validIds || new Set());
  profile.keyErrors = sanitizeKeyErrors(raw.keyErrors);
  return profile;
}

export function validateImport(raw, validIds, currentVersion = 1) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'El archivo no tiene el formato de Tecladoaventura.' };
  }
  if (raw.app !== 'tecladoaventura') {
    return { ok: false, error: 'Este archivo no pertenece a Tecladoaventura.' };
  }
  if (!Number.isInteger(raw.version) || raw.version < 1 || raw.version > currentVersion) {
    return { ok: false, error: 'La versión del archivo no es compatible.' };
  }
  const source = raw.profile;
  if (!source || typeof source !== 'object') {
    return { ok: false, error: 'El archivo no contiene un perfil válido.' };
  }
  if (!source.progress || typeof source.progress !== 'object') {
    return { ok: false, error: 'El archivo no contiene datos de progreso.' };
  }
  const imported = sanitizeProfile({ ...source, __validIds: validIds });
  const importedLevels = Object.keys(imported.progress).length;
  if (importedLevels === 0 && Object.keys(source.progress).length > 0) {
    return { ok: false, error: 'El progreso no corresponde a niveles de este juego.' };
  }
  return { ok: true, profile: imported, stats: summarizeImport(imported) };
}

function summarizeImport(profile) {
  const levels = Object.values(profile.progress);
  return {
    levels: levels.filter((l) => l.completed).length,
    stars: levels.reduce((sum, l) => sum + (l.stars || 0), 0),
  };
}
