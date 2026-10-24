import { APP } from '../config/appConfig.js';
import { LEVELS } from '../levels/levels.js';
import {
  emptyProfile,
  sanitizeAlias,
  sanitizeSettings,
  validateImport,
  safeNumber,
} from './validate.js';

const VALID_LEVEL_IDS = new Set(LEVELS.map((l) => l.id));
const LEVEL_ORDER = LEVELS.map((l) => l.id);

function uid() {
  if (globalThis.crypto?.randomUUID) return `p_${globalThis.crypto.randomUUID().slice(0, 12)}`;
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

export function createEmptySave() {
  const profile = emptyProfile(uid(), 'Aventurero');
  return {
    app: 'tecladoaventura',
    version: 1,
    activeProfileId: profile.id,
    profiles: [profile],
    updatedAt: new Date().toISOString(),
  };
}

export class ProgressStore {
  constructor(storage) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : memoryStorage());
    this.lastError = null;
    this.save = this.load();
  }

  load() {
    try {
      const raw = this.storage.getItem(APP.saveKey);
      if (!raw) return createEmptySave();
      const parsed = JSON.parse(raw);
      return this.migrate(parsed);
    } catch (error) {
      this.lastError = 'No pudimos leer el progreso guardado. Empezaremos de nuevo.';
      return createEmptySave();
    }
  }

  migrate(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.profiles) || raw.profiles.length === 0) {
      return createEmptySave();
    }
    const profiles = [];
    for (const p of raw.profiles.slice(0, 8)) {
      if (!p || typeof p !== 'object') continue;
      const profile = emptyProfile(
        typeof p.id === 'string' && p.id.length < 60 ? p.id : uid(),
        sanitizeAlias(p.alias),
      );
      profile.createdAt = typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString();
      profile.tutorialDone = p.tutorialDone === true;
      profile.settings = sanitizeSettings(p.settings);
      profile.keyErrors = {};
      if (p.keyErrors && typeof p.keyErrors === 'object') {
        for (const [k, v] of Object.entries(p.keyErrors)) {
          if (typeof k === 'string' && k.length <= 30) {
            profile.keyErrors[k] = safeNumber(v, 0, 0, 1e6);
          }
        }
      }
      if (p.progress && typeof p.progress === 'object') {
        for (const [id, stats] of Object.entries(p.progress)) {
          if (!VALID_LEVEL_IDS.has(id) || !stats || typeof stats !== 'object') continue;
          profile.progress[id] = {
            completed: stats.completed === true,
            stars: safeNumber(stats.stars, 0, 0, 3),
            bestScore: safeNumber(stats.bestScore, 0, 0, 1e7),
            attempts: safeNumber(stats.attempts, 0, 0, 1e6),
            correct: safeNumber(stats.correct, 0, 0, 1e6),
            incorrect: safeNumber(stats.incorrect, 0, 0, 1e6),
            accuracy:
              typeof stats.accuracy === 'number' && Number.isFinite(stats.accuracy)
                ? Math.min(100, Math.max(0, stats.accuracy))
                : null,
            helps: safeNumber(stats.helps, 0, 0, 1e6),
            timeMs: safeNumber(stats.timeMs, 0, 0, 1e9),
            gatesCompleted: safeNumber(stats.gatesCompleted, 0, 0, 1e6),
            completedAt: typeof stats.completedAt === 'string' ? stats.completedAt : null,
            lastPlayed: typeof stats.lastPlayed === 'string' ? stats.lastPlayed : null,
          };
        }
      }
      profiles.push(profile);
    }
    if (profiles.length === 0) return createEmptySave();
    const activeProfileId = profiles.some((p) => p.id === raw.activeProfileId)
      ? raw.activeProfileId
      : profiles[0].id;
    return {
      app: 'tecladoaventura',
      version: 1,
      activeProfileId,
      profiles,
      updatedAt: new Date().toISOString(),
    };
  }

  persist() {
    this.save.updatedAt = new Date().toISOString();
    try {
      this.storage.setItem(APP.saveKey, JSON.stringify(this.save));
      this.lastError = null;
      return true;
    } catch (error) {
      this.lastError = 'No se pudo guardar. Revisa el espacio disponible del navegador.';
      return false;
    }
  }

  get profile() {
    return (
      this.save.profiles.find((p) => p.id === this.save.activeProfileId) || this.save.profiles[0]
    );
  }

  get profiles() {
    return this.save.profiles;
  }

  get settings() {
    return this.profile.settings;
  }

  updateSettings(patch) {
    this.profile.settings = sanitizeSettings({ ...this.profile.settings, ...patch });
    this.persist();
    return this.profile.settings;
  }

  setActiveProfile(id) {
    if (!this.save.profiles.some((p) => p.id === id)) return false;
    this.save.activeProfileId = id;
    this.persist();
    return true;
  }

  createProfile(alias) {
    if (this.save.profiles.length >= 8) return null;
    const profile = emptyProfile(uid(), sanitizeAlias(alias));
    this.save.profiles.push(profile);
    this.save.activeProfileId = profile.id;
    this.persist();
    return profile;
  }

  markTutorialDone() {
    this.profile.tutorialDone = true;
    this.persist();
  }

  levelStats(levelId) {
    return this.profile.progress[levelId] || null;
  }

  isCompleted(levelId) {
    return Boolean(this.profile.progress[levelId]?.completed);
  }

  isLevelUnlocked(levelId) {
    const index = LEVEL_ORDER.indexOf(levelId);
    if (index < 0) return false;
    if (index === 0) return true;
    const prevId = LEVEL_ORDER[index - 1];
    const current = LEVELS[index];
    const prev = LEVELS[index - 1];
    if (current.index === 1 && current.world !== prev.world) {
      // El primer nivel de un mundo requiere terminar el último del mundo anterior.
      return this.isCompleted(prevId);
    }
    return this.isCompleted(prevId);
  }

  isWorldUnlocked(worldId) {
    if (worldId === 1) return true;
    const prevLast = LEVELS.find((l) => l.world === worldId - 1 && l.index === 4);
    return prevLast ? this.isCompleted(prevLast.id) : false;
  }

  nextPlayableLevel() {
    for (const level of LEVELS) {
      if (this.isLevelUnlocked(level.id) && !this.isCompleted(level.id)) return level.id;
    }
    // Si terminó todo, ofrecer el último nivel desbloqueado.
    for (let i = LEVELS.length - 1; i >= 0; i -= 1) {
      if (this.isLevelUnlocked(LEVELS[i].id)) return LEVELS[i].id;
    }
    return LEVELS[0].id;
  }

  lastPlayedLevel() {
    let best = null;
    let bestTime = 0;
    for (const [id, stats] of Object.entries(this.profile.progress)) {
      const t = Date.parse(stats.lastPlayed || '') || 0;
      if (t > bestTime) {
        bestTime = t;
        best = id;
      }
    }
    return best && this.isLevelUnlocked(best) ? best : null;
  }

  completeLevel(levelId, result) {
    if (!VALID_LEVEL_IDS.has(levelId) || !result) return null;
    const existing = this.profile.progress[levelId];
    const now = new Date().toISOString();
    const merged = {
      completed: true,
      stars: Math.max(existing?.stars || 0, safeNumber(result.stars, 0, 0, 3)),
      bestScore: Math.max(existing?.bestScore || 0, safeNumber(result.score, 0, 0, 1e7)),
      attempts: Math.max(existing?.attempts || 0, 1),
      correct: safeNumber(result.correct, 0, 0, 1e6),
      incorrect: safeNumber(result.incorrect, 0, 0, 1e6),
      accuracy:
        typeof result.accuracy === 'number' && Number.isFinite(result.accuracy)
          ? result.accuracy
          : null,
      helps: safeNumber(result.helps, 0, 0, 1e6),
      timeMs: safeNumber(result.timeMs, 0, 0, 1e9),
      gatesCompleted: safeNumber(result.gatesCompleted, 0, 0, 1e6),
      completedAt: now,
      lastPlayed: now,
    };
    this.profile.progress[levelId] = merged;
    if (result.keyMistakes && typeof result.keyMistakes === 'object') {
      for (const [key, count] of Object.entries(result.keyMistakes)) {
        if (typeof key !== 'string' || key.length > 30) continue;
        this.profile.keyErrors[key] =
          (this.profile.keyErrors[key] || 0) + safeNumber(count, 0, 0, 1e6);
      }
    }
    this.persist();
    return merged;
  }

  recordAttempt(levelId) {
    if (!VALID_LEVEL_IDS.has(levelId)) return;
    const existing = this.profile.progress[levelId] || {};
    this.profile.progress[levelId] = {
      completed: Boolean(existing.completed),
      stars: existing.stars || 0,
      bestScore: existing.bestScore || 0,
      attempts: (existing.attempts || 0) + 1,
      correct: existing.correct || 0,
      incorrect: existing.incorrect || 0,
      accuracy: existing.accuracy ?? null,
      helps: existing.helps || 0,
      timeMs: existing.timeMs || 0,
      gatesCompleted: existing.gatesCompleted || 0,
      completedAt: existing.completedAt || null,
      lastPlayed: new Date().toISOString(),
    };
    this.persist();
  }

  recordWrongKey(expectedKey) {
    if (typeof expectedKey !== 'string') return;
    const key = expectedKey.slice(0, 30);
    this.profile.keyErrors[key] = (this.profile.keyErrors[key] || 0) + 1;
    this.persist();
  }

  resetActiveProgress() {
    const p = this.profile;
    p.progress = {};
    p.keyErrors = {};
    p.tutorialDone = false;
    this.persist();
  }

  resetAll() {
    const activeId = this.profile.id;
    this.save = createEmptySave();
    this.save.activeProfileId = activeId;
    this.save.profiles[0].id = activeId;
    this.persist();
  }

  totalStars() {
    return Object.values(this.profile.progress).reduce((sum, p) => sum + (p.stars || 0), 0);
  }

  completedCount() {
    return Object.values(this.profile.progress).filter((p) => p.completed).length;
  }

  worldStars(worldId) {
    const ids = LEVELS.filter((l) => l.world === worldId).map((l) => l.id);
    return ids.reduce((sum, id) => sum + (this.profile.progress[id]?.stars || 0), 0);
  }

  worldCompleted(worldId) {
    const ids = LEVELS.filter((l) => l.world === worldId).map((l) => l.id);
    return ids.every((id) => this.profile.progress[id]?.completed);
  }

  topKeyErrors(limit = 6) {
    return Object.entries(this.profile.keyErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  exportActive() {
    const p = this.profile;
    return {
      app: 'tecladoaventura',
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: {
        alias: p.alias,
        tutorialDone: p.tutorialDone,
        settings: p.settings,
        progress: p.progress,
        keyErrors: p.keyErrors,
      },
      meta: {
        levelsCompleted: this.completedCount(),
        stars: this.totalStars(),
        note: 'Progreso local de Tecladoaventura. No contiene datos personales.',
      },
    };
  }

  exportJson() {
    return JSON.stringify(this.exportActive(), null, 2);
  }

  importFromObject(raw) {
    const result = validateImport(raw, VALID_LEVEL_IDS, 1);
    if (!result.ok) return result;
    const profile = result.profile;
    profile.id = uid();
    profile.alias = sanitizeAlias(profile.alias);
    profile.createdAt = new Date().toISOString();
    if (this.save.profiles.length >= 8) return { ok: false, error: 'Ya hay 8 perfiles guardados.' };
    this.save.profiles.push(profile);
    this.save.activeProfileId = profile.id;
    this.persist();
    return { ...result, ok: true, profile };
  }

  importFromText(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: 'El archivo no es un JSON válido.' };
    }
    return this.importFromObject(parsed);
  }
}

export { VALID_LEVEL_IDS, LEVEL_ORDER };
