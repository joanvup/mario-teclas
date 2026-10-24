import { describe, expect, it } from 'vitest';
import { APP } from '../../src/config/appConfig.js';
import { LEVELS } from '../../src/levels/levels.js';
import { ProgressStore, createEmptySave } from '../../src/progress/storage.js';

function memoryStorage() {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function completeAll(store) {
  LEVELS.forEach((level, i) => {
    store.completeLevel(level.id, {
      stars: 3,
      score: 100 + i,
      correct: 4,
      incorrect: 0,
      accuracy: 100,
      helps: 0,
      timeMs: 1000,
      gatesCompleted: level.gates.length,
    });
  });
}

describe('almacenamiento de progreso', () => {
  it('empieza con un perfil local y el primer nivel desbloqueado', () => {
    const store = new ProgressStore(memoryStorage());
    expect(store.profiles).toHaveLength(1);
    expect(store.profile.alias).toBe('Aventurero');
    expect(store.profile.tutorialDone).toBe(false);
    expect(store.completedCount()).toBe(0);
    expect(store.totalStars()).toBe(0);
    expect(store.isLevelUnlocked('w1l1')).toBe(true);
    expect(store.isLevelUnlocked('w1l2')).toBe(false);
    expect(store.isLevelUnlocked('w2l1')).toBe(false);
    expect(store.isWorldUnlocked(1)).toBe(true);
    expect(store.isWorldUnlocked(2)).toBe(false);
    expect(store.nextPlayableLevel()).toBe('w1l1');
    expect(store.lastPlayedLevel()).toBe(null);
  });

  it('desbloquea el siguiente nivel y el siguiente mundo al completar', () => {
    const store = new ProgressStore(memoryStorage());
    store.completeLevel('w1l1', { stars: 2 });
    expect(store.isCompleted('w1l1')).toBe(true);
    expect(store.isLevelUnlocked('w1l2')).toBe(true);
    expect(store.isLevelUnlocked('w1l3')).toBe(false);
    expect(store.isWorldUnlocked(2)).toBe(false);
    expect(store.nextPlayableLevel()).toBe('w1l2');

    store.completeLevel('w1l2', { stars: 3 });
    store.completeLevel('w1l3', { stars: 1 });
    store.completeLevel('w1l4', { stars: 2 });
    expect(store.worldCompleted(1)).toBe(true);
    expect(store.isWorldUnlocked(2)).toBe(true);
    expect(store.isLevelUnlocked('w2l1')).toBe(true);
    expect(store.nextPlayableLevel()).toBe('w2l1');
    expect(store.worldStars(1)).toBe(8);
  });

  it('conserva la mejor calificación al repetir un nivel', () => {
    const store = new ProgressStore(memoryStorage());
    store.completeLevel('w1l1', { stars: 1, score: 100, accuracy: 50, incorrect: 3 });
    store.completeLevel('w1l1', { stars: 3, score: 400, accuracy: 95, incorrect: 0 });
    store.completeLevel('w1l1', { stars: 2, score: 200, accuracy: 80 });
    const stats = store.levelStats('w1l1');
    expect(stats.stars).toBe(3);
    expect(stats.bestScore).toBe(400);
    expect(stats.accuracy).toBe(80);
    expect(stats.completed).toBe(true);
  });

  it('persiste en el almacenamiento y recupera al crear otra instancia', () => {
    const storage = memoryStorage();
    const store = new ProgressStore(storage);
    store.completeLevel('w1l1', { stars: 3, correct: 4, accuracy: 100 });
    store.recordWrongKey('A');
    store.recordWrongKey('A');
    store.recordWrongKey('Ñ');
    store.updateSettings({ largeText: true, volume: 0.25 });
    expect(storage.map.get(APP.saveKey)).toBeTruthy();

    const reloaded = new ProgressStore(storage);
    expect(reloaded.isCompleted('w1l1')).toBe(true);
    expect(reloaded.levelStats('w1l1').stars).toBe(3);
    expect(reloaded.profile.keyErrors).toEqual({ A: 2, 'Ñ': 1 });
    expect(reloaded.settings.largeText).toBe(true);
    expect(reloaded.settings.volume).toBeCloseTo(0.25);
  });

  it('sobrevive a un guardado corrupto', () => {
    const storage = memoryStorage();
    storage.setItem(APP.saveKey, '{esto no es json');
    const store = new ProgressStore(storage);
    expect(store.lastError).toBeTruthy();
    expect(store.completedCount()).toBe(0);
    expect(store.profile.alias).toBe('Aventurero');
  });

  it('informa cuando no puede guardar', () => {
    const storage = memoryStorage();
    const store = new ProgressStore(storage);
    store.storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('sin espacio');
      },
      removeItem: () => {},
    };
    expect(store.completeLevel('w1l1', { stars: 1 })).toBeTruthy();
    expect(store.lastError).toContain('No se pudo guardar');
  });

  it('registra intentos, errores por tecla y los ordena', () => {
    const store = new ProgressStore(memoryStorage());
    store.recordAttempt('w1l1');
    store.recordAttempt('w1l1');
    expect(store.levelStats('w1l1').attempts).toBe(2);
    expect(store.levelStats('w1l1').completed).toBe(false);
    expect(store.lastPlayedLevel()).toBe('w1l1');
    for (let i = 0; i < 3; i += 1) store.recordWrongKey('E');
    store.recordWrongKey('A');
    store.recordWrongKey('Ñ');
    expect(store.topKeyErrors(2)).toEqual([
      ['E', 3],
      ['A', 1],
    ]);
  });

  it('completa los 48 niveles y acumula 144 estrellas', () => {
    const store = new ProgressStore(memoryStorage());
    completeAll(store);
    expect(store.completedCount()).toBe(48);
    expect(store.totalStars()).toBe(144);
    expect(LEVELS.every((l) => store.isCompleted(l.id))).toBe(true);
    expect(LEVELS.every((l) => store.isLevelUnlocked(l.id))).toBe(true);
    expect(LEVELS.every((l) => store.isWorldUnlocked(l.world))).toBe(true);
    expect(store.nextPlayableLevel()).toBe('w12l4');
  });

  it('exporta e importa el progreso activo como un perfil nuevo', () => {
    const source = new ProgressStore(memoryStorage());
    source.completeLevel('w1l1', {
      stars: 3,
      correct: 8,
      incorrect: 1,
      accuracy: 88.9,
      helps: 0,
      gatesCompleted: 0,
    });
    source.recordWrongKey('A');
    const exported = source.exportActive();
    expect(exported.app).toBe('tecladoaventura');
    expect(exported.version).toBe(1);
    expect(exported.profile.progress.w1l1.completed).toBe(true);
    expect(exported.meta.levelsCompleted).toBe(1);
    expect(exported.meta.stars).toBe(3);
    expect(exported.meta.note).toContain('No contiene datos personales');

    const target = new ProgressStore(memoryStorage());
    const result = target.importFromText(source.exportJson());
    expect(result.ok).toBe(true);
    expect(target.profiles).toHaveLength(2);
    expect(target.profiles[0].id).not.toBe(target.profile.id);
    expect(target.profile.progress.w1l1.completed).toBe(true);
    expect(target.profile.progress.w1l1.stars).toBe(3);
    expect(target.profile.keyErrors).toEqual({ A: 1 });
  });

  it('rechaza importaciones inválidas sin tocar el progreso', () => {
    const store = new ProgressStore(memoryStorage());
    const before = JSON.stringify(store.save);
    expect(store.importFromText('{roto').ok).toBe(false);
    expect(store.importFromText('{"app":"otro","version":1,"profile":{"progress":{}}}').ok).toBe(
      false,
    );
    expect(
      store.importFromText(
        JSON.stringify({
          app: 'tecladoaventura',
          version: 1,
          profile: { progress: { noExiste: { completed: true, stars: 3 } } },
        }),
      ).ok,
    ).toBe(false);
    expect(JSON.stringify(store.save)).toBe(before);
    expect(store.profiles).toHaveLength(1);
  });

  it('limita la cantidad de perfiles a 8', () => {
    const store = new ProgressStore(memoryStorage());
    for (let i = 0; i < 7; i += 1) {
      expect(store.createProfile(`Niño ${i + 1}`)).toBeTruthy();
    }
    expect(store.profiles).toHaveLength(8);
    expect(store.createProfile('Noveno')).toBe(null);
    const result = store.importFromText(store.exportJson());
    expect(result.ok).toBe(false);
    expect(result.error).toContain('8 perfiles');
  });

  it('reinicia el progreso activo conservando la configuración', () => {
    const store = new ProgressStore(memoryStorage());
    store.updateSettings({ largeText: true });
    store.completeLevel('w1l1', { stars: 3 });
    store.recordWrongKey('A');
    store.markTutorialDone();
    store.resetActiveProgress();
    expect(store.completedCount()).toBe(0);
    expect(store.totalStars()).toBe(0);
    expect(store.profile.keyErrors).toEqual({});
    expect(store.profile.tutorialDone).toBe(false);
    expect(store.settings.largeText).toBe(true);
  });

  it('reinicia todo manteniendo el identificador del perfil activo', () => {
    const store = new ProgressStore(memoryStorage());
    const id = store.profile.id;
    store.completeLevel('w1l1', { stars: 3 });
    store.resetAll();
    expect(store.profile.id).toBe(id);
    expect(store.profile.alias).toBe('Aventurero');
    expect(store.completedCount()).toBe(0);
    expect(store.profiles).toHaveLength(1);
  });

  it('crea un guardado vacío válido', () => {
    const save = createEmptySave();
    expect(save.app).toBe('tecladoaventura');
    expect(save.version).toBe(1);
    expect(save.profiles).toHaveLength(1);
    expect(save.activeProfileId).toBe(save.profiles[0].id);
  });
});
