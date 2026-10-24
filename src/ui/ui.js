import { APP } from '../config/appConfig.js';
import { WORLDS, WORLD_BY_ID } from '../worlds/worlds.js';
import { LEVELS, LEVEL_BY_ID, levelsOfWorld, nextLevelId } from '../levels/levels.js';
import { starMessage } from '../education/evaluator.js';
import { makeTarget, matchesTarget, getLayout, targetList } from '../input/layouts.js';
import { renderVirtualKeyboard } from './virtualKeyboard.js';
import { mascotSVG, crownSVG } from './art.js';

const WORLD_ICONS = ['🌾', '🌳', '🏔️', '🌊', '🏜️', '🏰', '💎', '👑', '🏙️', '📚', '🏝️', '🏛️'];
const TOTAL_WORLDS = WORLDS.length;
const TOTAL_LEVELS = LEVELS.length;
const TOTAL_STARS = LEVELS.length * 3;
const worldStarsTotal = (worldId) => levelsOfWorld(worldId).length * 3;
const CONFETTI_COLORS = ['#ffd23f', '#ff8bd1', '#7bffe0', '#b28dff', '#fff4b0', '#8ef29a'];
const PRACTICE_POOL = [
  'A', 'E', 'I', 'O', 'U', 'M', 'P', 'S', 'L', 'N', 'T', 'R', 'C', 'D',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Ñ', 'ESPACIO', 'ENTER', 'RETROCESO',
];
const SPECIAL_CHECK = ['Ñ', 'Á', 'É', 'Í', 'Ó', 'Ú'];

/**
 * Objetivo de teclado para una letra de una frase. Las vocales con tilde se
 * asocian a su tecla base para que el teclado virtual ilumine la posición
 * correcta; la tilde se practica con la tecla ´.
 */
const letterTarget = (ch) => {
  const upper = ch.toLocaleUpperCase('es-CO');
  if (/^[ÁÉÍÓÚÜ]$/.test(upper)) {
    const base = upper.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return { char: base, display: upper, code: `Key${base}`, label: upper };
  }
  return makeTarget(upper);
};

const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const starIcons = (n, large = false) =>
  `<span class="stars ${large ? 'stars--lg' : ''}" aria-label="${n} de 3 estrellas">${[1, 2, 3]
    .map((i) => `<span class="star ${i <= n ? 'star--full' : 'star--empty'}" aria-hidden="true">★</span>`)
    .join('')}</span>`;

const accuracyText = (value) => (value === null || value === undefined ? 'Sin datos' : `${value}%`);

const formatTime = (ms) => {
  const total = Math.max(0, Math.round((ms || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const worldStyle = (world) => `--c1:${world.mask[0]};--c2:${world.mask[1]}`;

const levelAccuracy = (stats) => {
  if (!stats || stats.accuracy === null || stats.accuracy === undefined) return 'Sin datos';
  return `${Math.round(stats.accuracy)}%`;
};

function uniqueTargets(list) {
  const seen = new Set();
  return list.filter((target) => {
    const key = target.display || target.char;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class UI {
  constructor({ store, audio, game }) {
    this.store = store;
    this.audio = audio;
    this.game = game;
    this.screens = document.getElementById('screens');
    this.hud = document.getElementById('hud');
    this.modalRoot = document.getElementById('modal-root');
    this.toastRoot = document.getElementById('toast-root');
    this.srLive = document.getElementById('sr-live');
    this.canvas = document.getElementById('game-canvas');
    this.currentScreen = null;
    this.currentLevelId = null;
    this.currentWorld = 1;
    this.challengeState = null;
    this.practice = null;
    this._practiceKeyHandler = null;
    this._tutorialCleanup = null;
    this.settingsFromPause = false;
    this.lastHudState = null;
    this.finalCelebration = false;
    this._bindGlobal();
    this.applyPreferences(store.settings);
  }

  _bindGlobal() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      if (button.disabled) return;
      const action = button.dataset.action;
      if (action.startsWith('setting-') || action === 'set-layout' || action === 'set-mode') {
        // El guardado se hace en el manejador específico.
      } else {
        this.audio.sfx('click');
      }
      this.handleAction(action, button);
    });

    this.screens.addEventListener('change', (event) => {
      if (event.target.matches('#setting-layout')) {
        this.store.updateSettings({ layout: event.target.value });
        this.applyPreferences(this.store.settings);
        this.showSettings(this.settingsFromPause);
        this.toast('Distribución guardada. El teclado virtual cambió.', 'success');
      }
    });

    this.screens.addEventListener('input', (event) => {
      if (event.target.matches('#setting-volume')) {
        this.store.updateSettings({ volume: Number(event.target.value) / 100 });
        this.audio.applySettings(this.store.settings);
      }
      if (event.target.matches('#workshop-input')) {
        this.updateWorkshopStatus(event.target.value);
      }
    });

    this.screens.addEventListener('submit', (event) => {
      if (event.target.matches('#profile-form')) {
        event.preventDefault();
        const input = event.target.querySelector('#profile-name');
        const profile = this.store.createProfile(input?.value || 'Aventurero');
        if (!profile) {
          this.toast('Ya hay 8 perfiles. Usa uno existente.', 'warn');
          return;
        }
        this.toast(`Perfil “${profile.alias}” creado.`, 'success');
        this.showSettings(this.settingsFromPause);
      }
    });

    document.addEventListener('pointerup', () => {
      if (!this.game) return;
      this.game.setVirtual('left', false);
      this.game.setVirtual('right', false);
      this.game.setVirtual('jump', false);
      this.screens.querySelectorAll('.touch-btn.is-down').forEach((b) => b.classList.remove('is-down'));
    });
  }

  applyPreferences(settings) {
    document.body.classList.toggle('reduced-motion', Boolean(settings.reducedMotion));
    document.body.classList.toggle('high-contrast', Boolean(settings.highContrast));
    document.body.classList.toggle('large-text', Boolean(settings.largeText));
    this.audio.applySettings(settings);
  }

  toast(message, type = 'info') {
    if (!message) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    this.toastRoot.appendChild(el);
    this.srLive.textContent = message;
    while (this.toastRoot.children.length > 3) this.toastRoot.firstElementChild.remove();
    setTimeout(() => el.remove(), 3100);
  }

  closeModal() {
    this.modalRoot.innerHTML = '';
    this.challengeState = null;
  }

  _setScreen(name, html, { keepModal = false } = {}) {
    this._cleanupPractice();
    this._cleanupTutorial();
    if (!keepModal) this.closeModal();
    this.currentScreen = name;
    this.canvas.hidden = true;
    this.hud.hidden = true;
    this.hud.innerHTML = '';
    this.screens.innerHTML = html;
    const heading = this.screens.querySelector('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ───────────────────────── Portada y menú ───────────────────────── */

  showTitle() {
    this._setScreen('title', `
      <section class="screen title-screen">
        <div class="title-stars" aria-hidden="true"></div>
        <div class="title-brand">
          <span class="title-kicker">🎹 Aprende jugando · 6 a 7 años</span>
          <h1 class="title-logo">Teclado<br/>aventura</h1>
          <p class="title-sub">El Reino de las Teclas</p>
        </div>
        <div class="title-mascot">${mascotSVG()}</div>
        <div class="title-play">
          <button class="btn btn--primary" data-action="title-start">▶ Empezar la aventura</button>
          <span class="title-hint">También puedes pulsar la tecla <strong>Enter</strong></span>
        </div>
        <p class="title-footer">Juego original de plataformas y teclado · ${TOTAL_WORLDS} mundos · ${TOTAL_LEVELS} niveles · Progreso guardado en este navegador</p>
      </section>
    `);
    this._titleEnterHandler = (event) => {
      if (event.key === 'Enter' && this.currentScreen === 'title') {
        event.preventDefault();
        this.audio.unlock();
        this.showMenu();
      }
    };
    window.addEventListener('keydown', this._titleEnterHandler);
    const old = this.screens.querySelector('[data-action="title-start"]');
    if (old) {
      old.addEventListener('click', () => {
        if (this._titleEnterHandler) {
          window.removeEventListener('keydown', this._titleEnterHandler);
          this._titleEnterHandler = null;
        }
      });
    }
  }

  showMenu() {
    if (this._titleEnterHandler) {
      window.removeEventListener('keydown', this._titleEnterHandler);
      this._titleEnterHandler = null;
    }
    const profile = this.store.profile;
    const completed = this.store.completedCount();
    const stars = this.store.totalStars();
    const nextId = this.store.nextPlayableLevel();
    const next = LEVEL_BY_ID[nextId];
    const percent = Math.round((completed / LEVELS.length) * 100);
    const continueLabel = completed > 0 ? 'Continuar aventura' : 'Comenzar aventura';
    this._setScreen('menu', `
      <section class="screen menu-screen">
        <div class="screen__top">
          <div>
            <span class="eyebrow">🏰 Reino de las Teclas</span>
            <h1 class="menu-title">¡Hola de nuevo, <br/>${esc(profile.alias)}!</h1>
            <p class="menu-sub">Recupera las teclas mágicas y aprende a usar tu teclado.</p>
          </div>
          <button class="icon-btn" data-action="about" aria-label="Acerca del juego" title="Acerca del juego">ℹ️</button>
        </div>
        <div class="menu-layout">
          <div class="panel menu-main">
            <div class="profile-strip">
              <div class="profile-avatar" aria-hidden="true">${esc(profile.alias.slice(0, 1).toUpperCase())}</div>
              <div>
                <div class="profile-strip__name">${esc(profile.alias)}</div>
                <div class="profile-strip__meta">${stars} estrellas · ${completed} de ${TOTAL_LEVELS} niveles</div>
              </div>
              <button class="btn btn--ghost btn--small" data-action="settings" style="margin-left:auto">Perfiles</button>
            </div>
            <div class="menu-actions">
              <button class="btn btn--primary" data-action="play-next">▶ Jugar</button>
              <button class="btn btn--secondary" data-action="continue">⏯ ${continueLabel}</button>
              <button class="btn btn--ghost" data-action="worlds">🗺️ Elegir mundo</button>
              <button class="btn btn--ghost" data-action="progress">⭐ Mi progreso</button>
              <button class="btn btn--ghost" data-action="practice">⌨️ Practicar teclado</button>
              <button class="btn btn--ghost" data-action="settings">⚙️ Configuración</button>
              <button class="btn btn--ghost menu-wide" data-action="about">ℹ️ Acerca del juego</button>
            </div>
            <div class="mascot-card panel" style="padding:14px">
            <div class="mascot-card__bubble">¿Jugamos? La próxima parada es <strong>${esc(next?.name || 'la aventura')}</strong>.</div>
              ${mascotSVG()}
            </div>
          </div>
          <div class="menu-side">
            <div class="progress-ring-card">
              <div class="progress-ring" style="--value:${percent}%"><span>${percent}%<br/><small>del reino</small></span></div>
              <div>
                <div class="profile-strip__name">Tu aventura</div>
                <div class="profile-strip__meta">${completed}/${TOTAL_LEVELS} niveles completados</div>
                <div class="profile-strip__meta">${stars}/${TOTAL_STARS} estrellas reunidas</div>
              </div>
            </div>
            <div class="panel">
              <h2 class="screen__title" style="font-size:1.15rem">Siguiente misión</h2>
              <p class="small muted" style="margin:6px 0 10px">Mundo ${next?.world} · ${esc(WORLD_BY_ID[next?.world]?.short || '')}</p>
              <div class="row">
                <span class="kbd-chip" aria-hidden="true">${next?.index || 1}</span>
                <div>
                  <div style="font-weight:900">${esc(next?.name || '')}</div>
                  <div class="small muted">${esc(next?.skill || '')}</div>
                </div>
              </div>
              <button class="btn btn--pink btn--wide" style="margin-top:14px" data-action="open-level" data-level="${esc(next?.id || 'w1l1')}">Empezar este nivel</button>
            </div>
            <div class="menu-tip"><span aria-hidden="true">💡</span><span>Consejo: usa las flechas para caminar y <strong>ESPACIO</strong> para saltar. Si te equivocas, no pasa nada: puedes intentarlo otra vez.</span></div>
          </div>
        </div>
      </section>
    `);
  }

  playNext() {
    const levelId = this.store.nextPlayableLevel();
    const go = () => this.showIntro(levelId);
    if (!this.store.profile.tutorialDone) {
      this.showTutorial(go);
    } else {
      go();
    }
  }

  continueAdventure() {
    const last = this.store.lastPlayedLevel();
    const levelId = last && !this.store.isCompleted(last) ? last : this.store.nextPlayableLevel();
    this.showIntro(levelId);
  }

  /* ───────────────────────── Selección ───────────────────────── */

  showWorldSelect() {
    const cards = WORLDS.map((world) => {
      const unlocked = this.store.isWorldUnlocked(world.id);
      const stars = this.store.worldStars(world.id);
      const done = this.store.worldCompleted(world.id);
      const completedCount = levelsOfWorld(world.id).filter((l) => this.store.isCompleted(l.id)).length;
      const perWorld = worldStarsTotal(world.id);
      return `
        <button class="world-card" style="${worldStyle(world)}" data-action="open-world" data-world="${world.id}"
          ${unlocked ? '' : 'disabled'}
          aria-label="Mundo ${world.id}: ${esc(world.name)}. ${unlocked ? `${stars} de ${perWorld} estrellas` : 'Bloqueado'}">
          <span class="world-card__num">Mundo ${world.id} ${done ? '· ✅' : ''}</span>
          <span class="world-card__name">${esc(world.name)}</span>
          <span class="world-card__skill">${WORLD_ICONS[world.id - 1]} ${esc(world.skill)}</span>
          <span class="world-card__meta">
            <span>${starIcons(Math.min(3, Math.round(stars / perWorld * 3)))}</span>
            <span>${stars}/${perWorld} ★</span>
          </span>
          ${unlocked ? '' : `<span class="world-card__lock">🔒<span>Completa el mundo anterior<br/>(${completedCount}/${levelsOfWorld(world.id).length})</span></span>`}
        </button>`;
    }).join('');

    this._setScreen('worlds', `
      <section class="screen">
        <div class="screen__top">
          <div>
            <span class="eyebrow">🗺️ Mapa del reino</span>
            <h1 class="screen__title">Elige tu mundo</h1>
            <p class="screen__subtitle">Cada mundo enseña una nueva habilidad de teclado. Avanza a tu ritmo.</p>
          </div>
          <button class="btn btn--ghost" data-action="menu">← Menú</button>
        </div>
        <div class="card-grid card-grid--worlds">${cards}</div>
        <div class="panel panel--light small muted">🔒 Los mundos se desbloquean al completar el nivel 4 del mundo anterior. Puedes repetir cualquier nivel desbloqueado.</div>
      </section>
    `);
  }

  showLevelSelect(worldId) {
    const world = WORLD_BY_ID[worldId] || WORLD_BY_ID[1];
    this.currentWorld = world.id;
    const levels = levelsOfWorld(world.id);
    const cards = levels.map((level) => {
      const unlocked = this.store.isLevelUnlocked(level.id);
      const stats = this.store.levelStats(level.id);
      const completed = Boolean(stats?.completed);
      return `
        <button class="level-card ${unlocked ? '' : 'level-card--locked'}" data-action="open-level" data-level="${level.id}"
          ${unlocked ? '' : 'disabled'}
          aria-label="Nivel ${level.index}: ${esc(level.name)}${unlocked ? '' : ', bloqueado'}">
          <span class="level-card__head">
            <span class="level-card__badge">${completed ? '✓' : level.index}</span>
            <span>
              <span class="level-card__name">${esc(level.name)}</span><br/>
              <span class="level-card__skill">${esc(level.skill)}</span>
            </span>
          </span>
          <span class="level-card__foot">
            ${unlocked ? starIcons(stats?.stars || 0) : '<span class="tag">🔒 Bloqueado</span>'}
            <span class="small muted">${completed ? `Precisión: ${levelAccuracy(stats)}` : unlocked ? 'Por jugar' : 'Completa el anterior'}</span>
          </span>
        </button>`;
    }).join('');
    const totalStars = this.store.worldStars(world.id);

    this._setScreen('levels', `
      <section class="screen">
        <div class="screen__top">
          <button class="btn btn--ghost" data-action="worlds">← Mundos</button>
          <div style="text-align:right"><span class="tag tag--gold">${totalStars}/${worldStarsTotal(world.id)} ★</span></div>
        </div>
        <div class="world-banner" style="${worldStyle(world)}">
          <div>
            <span class="eyebrow" style="background:rgba(0,0,0,.14);border-color:rgba(0,0,0,.18)">Mundo ${world.id}</span>
            <h1 class="world-banner__title">${esc(world.name)}</h1>
            <p class="world-banner__sub">${esc(world.objective)}</p>
          </div>
          <span class="world-banner__icon" aria-hidden="true">${WORLD_ICONS[world.id - 1]}</span>
        </div>
        <div class="card-grid card-grid--levels">${cards}</div>
        <div class="panel panel--light spread">
          <span class="small muted">Habilidad de este mundo: <strong>${esc(world.skill)}</strong></span>
          <button class="btn btn--ghost btn--small" data-action="menu">← Menú principal</button>
        </div>
      </section>
    `);
  }

  /* ───────────────────────── Introducción ───────────────────────── */

  introTargets(level) {
    const targets = [
      { char: '←', display: '←', code: 'ArrowLeft', label: 'Izquierda' },
      { char: '→', display: '→', code: 'ArrowRight', label: 'Derecha' },
    ];
    if (level.index >= 2 || level.gates.length > 0) {
      targets.push(makeTarget('ESPACIO'));
    }
    for (const gate of level.gates) {
      if (gate.paragraph) {
        const letters = Array.from(gate.paragraph)
          .filter((ch) => /[a-záéíóúüñ]/i.test(ch))
          .map((ch) => ch.toLocaleUpperCase('es-CO'));
        for (const letter of letters) targets.push(letterTarget(letter));
        continue;
      }
      for (const key of gate.keys) targets.push(makeTarget(key));
    }
    return uniqueTargets(targets).slice(0, 7);
  }

  showIntro(levelId) {
    const level = LEVEL_BY_ID[levelId];
    if (!level) return this.showWorldSelect();
    if (!this.store.isLevelUnlocked(levelId)) {
      this.toast('Ese nivel todavía está bloqueado. Completa el anterior.', 'warn');
      return this.showLevelSelect(level.world);
    }
    this.currentWorld = level.world;
    const world = WORLD_BY_ID[level.world];
    const targets = this.introTargets(level);
    const stats = this.store.levelStats(levelId);
    const isReturning = stats?.completed;
    const layout = getLayout(this.store.settings.layout);
    const needsEnye = level.gates.some((g) => (g.paragraph ? /ñ/i.test(g.paragraph) : g.keys.some((k) => String(k).toUpperCase() === 'Ñ')));
    const needsAccents = level.gates.some((g) => g.paragraph && /[áéíóúü]/i.test(g.paragraph));
    const specialNote = needsEnye
      ? this.store.settings.layout === 'us'
        ? 'En tu distribución actual la Ñ no tiene tecla propia. Puedes usar el botón Ñ del taller de práctica o cambiar a Latinoamérica en Configuración.'
        : layout.enyeHint
      : needsAccents
        ? layout.accentHint
        : '';

    this._setScreen('intro', `
      <section class="screen intro-screen">
        <div class="screen__top">
          <button class="btn btn--ghost" data-action="back-levels" data-world="${world.id}">← Niveles</button>
          <span class="tag tag--gold">${starIcons(stats?.stars || 0)} ${isReturning ? 'Nivel completado' : 'Nivel nuevo'}</span>
        </div>
        <div class="intro-layout">
          <div class="intro-main">
            <div class="world-banner" style="${worldStyle(world)}">
              <div>
                <span class="eyebrow" style="background:rgba(0,0,0,.14);border-color:rgba(0,0,0,.18)">Mundo ${world.id} · Nivel ${level.index}</span>
                <h1 class="world-banner__title">${esc(level.name)}</h1>
                <p class="world-banner__sub">${esc(level.skill)}</p>
              </div>
              <span class="world-banner__icon" aria-hidden="true">${WORLD_ICONS[world.id - 1]}</span>
            </div>
            <div class="panel stack">
              <p class="screen__subtitle" style="margin:0">${esc(level.intro)}</p>
              <div class="intro-objective">
                <span class="intro-objective__icon" aria-hidden="true">🎯</span>
                <div>
                  <h3>Misión del nivel</h3>
                  <p>${esc(level.objective)}</p>
                </div>
              </div>
              <div class="intro-note"><span aria-hidden="true">🕹️</span><span><strong>Controles:</strong> ← → para moverte · <strong>ESPACIO</strong> para saltar · cuando aparezca una burbuja, pulsa la tecla iluminada o escribe la frase completa. <strong>Esc</strong> pausa.</span></div>
              ${specialNote ? `<div class="intro-note" style="border:1px dashed rgba(255,210,63,.5)"><span aria-hidden="true">💡</span><span>${esc(specialNote)}</span></div>` : ''}
              <div class="intro-actions">
                <button class="btn btn--primary" data-action="start-level" data-level="${level.id}">🚀 ¡Vamos a jugar!</button>
                <button class="btn btn--ghost" data-action="worlds">🗺️ Elegir otro mundo</button>
              </div>
            </div>
          </div>
          <div class="panel demo-panel">
            <div class="demo-panel__head">
              <span class="demo-panel__title">👀 Demostración de teclas</span>
              <span class="tag">${esc(layout.name)}</span>
            </div>
            <p class="small muted" style="margin:0">Estas son las teclas que necesitas. Las iluminadas se van a usar en este nivel.</p>
            <div class="demo-keys" aria-label="Teclas del nivel">
              ${targets.map((t) => `<span class="kbd-chip" title="${esc(t.label || t.display)}">${esc(t.display)}</span>`).join('')}
            </div>
            <div id="intro-keyboard"></div>
            <div class="small muted">En modo <strong>${this.store.settings.inputMode === 'position' ? 'posición física' : 'carácter'}</strong> cuenta ${this.store.settings.inputMode === 'position' ? 'la ubicación de la tecla' : 'la letra que produce el teclado'}.</div>
          </div>
        </div>
      </section>
    `);
    renderVirtualKeyboard(document.getElementById('intro-keyboard'), {
      layout: this.store.settings.layout,
      targets,
      inputMode: this.store.settings.inputMode,
      compact: true,
      animate: true,
      showArrows: true,
    });
  }

  /* ───────────────────────── Juego ───────────────────────── */

  showHudShell() {
    const onScreen = this.store.settings.onScreenControls;
    this.hud.innerHTML = `
      <div>
        <div class="hud__bar">
          <div class="hud__level">
            <span class="hud__world" id="hud-world">Mundo 1</span>
            <span class="hud__name" id="hud-name">Nivel</span>
          </div>
          <div class="hud__stats">
            <span class="hud-chip hud-chip--hearts" id="hud-hearts" aria-label="Corazones">❤❤❤</span>
            <span class="hud-chip hud-chip--coins" id="hud-coins">🪙 0/0</span>
            <span class="hud-chip hud-chip--keys" id="hud-keys">🗝️ 0/0</span>
            <span class="hud-chip" id="hud-phase" hidden>Fase 1/1</span>
            <span class="hud__assist" id="hud-assist" hidden>Ayuda activa</span>
          </div>
          <div class="hud__actions">
            <button class="hud-action" data-action="hint" aria-label="Pedir una pista">💡<span> Ayuda</span></button>
            <button class="hud-action" data-action="pause" aria-label="Pausar el juego">⏸<span> Pausa</span></button>
          </div>
        </div>
        <div class="hud__subbar">
          <div class="hud__next" id="hud-next">Ahora: <span class="hud-key">—</span></div>
          <div class="hud-progress" aria-label="Progreso del nivel">
            <div class="hud-progress__track"><div class="hud-progress__fill" id="hud-fill"></div></div>
            <span class="hud-progress__label" id="hud-progress-label">0%</span>
          </div>
          <div class="hud__next small" id="hud-stats">Precisión: Sin datos</div>
        </div>
      </div>
      <div class="onscreen-controls" id="onscreen" ${onScreen ? '' : 'hidden'}>
        <div class="onscreen-group">
          <button class="touch-btn" data-control="left" aria-label="Mover a la izquierda">←</button>
          <button class="touch-btn" data-control="right" aria-label="Mover a la derecha">→</button>
        </div>
        <div class="onscreen-group">
          <button class="touch-btn touch-btn--jump" data-control="jump" aria-label="Saltar">SALTAR</button>
        </div>
      </div>
    `;
    this.hud.querySelectorAll('[data-control]').forEach((button) => {
      const control = button.dataset.control;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.classList.add('is-down');
        button.setPointerCapture?.(event.pointerId);
        this.game.setVirtual(control, true);
      });
      const release = () => {
        button.classList.remove('is-down');
        this.game.setVirtual(control, false);
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', release);
    });
  }

  startGame(levelId, { force = false } = {}) {
    if (!force && !this.store.isLevelUnlocked(levelId)) {
      this.toast('Nivel bloqueado. Termina el nivel anterior.', 'warn');
      return;
    }
    const level = LEVEL_BY_ID[levelId];
    this.audio.unlock();
    this._cleanupPractice();
    this.closeModal();
    this.screens.innerHTML = '';
    this.currentScreen = 'game';
    this.currentLevelId = levelId;
    this.currentWorld = level.world;
    this.canvas.hidden = false;
    this.hud.hidden = false;
    this.showHudShell();
    this.store.recordAttempt(levelId);
    this.lastHudState = null;
    this.toastRoot.innerHTML = '';
    this.game.start(level);
    this.toast(level.intro, 'info');
  }

  onHud(state) {
    this.lastHudState = state;
    if (this.hud.hidden) return;
    const hearts = '❤'.repeat(state.hearts) + '♡'.repeat(Math.max(0, state.maxHearts - state.hearts));
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set('hud-world', `Mundo ${state.world} · ${state.worldName}${state.totalPhases > 1 ? ` · Fase ${state.phase}/${state.totalPhases}` : ''}`);
    set('hud-name', state.name);
    const heartsEl = document.getElementById('hud-hearts');
    if (heartsEl) {
      heartsEl.textContent = hearts;
      heartsEl.setAttribute('aria-label', `${state.hearts} de ${state.maxHearts} corazones`);
    }
    set('hud-coins', `🪙 ${state.coins}/${state.requiredCoins}`);
    const keysEl = document.getElementById('hud-keys');
    if (keysEl) {
      keysEl.hidden = state.totalGates === 0;
      keysEl.textContent = `🗝️ ${state.gatesCompleted}/${state.totalGates}`;
    }
    const phaseEl = document.getElementById('hud-phase');
    if (phaseEl) {
      phaseEl.hidden = state.totalPhases <= 1;
      phaseEl.textContent = `Fase ${state.phase}/${state.totalPhases}`;
    }
    const assist = document.getElementById('hud-assist');
    if (assist) assist.hidden = !state.assist;
    const next = document.getElementById('hud-next');
    if (next) {
      next.innerHTML = state.nextKey
        ? `Ahora: <span class="hud-key">${esc(state.nextKey)}</span> <span>${esc(state.nextLabel)}</span>`
        : `Meta: <strong>portal brillante</strong>`;
    }
    const total = Math.max(1, state.totalGates + state.requiredCoins);
    const done = state.gatesCompleted + Math.min(state.coins, state.requiredCoins);
    const pct = Math.min(100, Math.round((done / total) * 100));
    const fill = document.getElementById('hud-fill');
    if (fill) fill.style.width = `${pct}%`;
    set('hud-progress-label', `${pct}%`);
    const stats = document.getElementById('hud-stats');
    if (stats) {
      const acc = state.accuracy === null ? 'Sin datos' : `${state.accuracy}%`;
      stats.textContent = `Precisión: ${acc}`;
    }
  }

  onPauseChange(paused) {
    if (paused) this.showPause();
    else {
      const modal = this.modalRoot.querySelector('.pause-panel');
      if (modal) this.closeModal();
    }
  }

  showPause() {
    if (this.game.state !== 'paused') return;
    const level = LEVEL_BY_ID[this.currentLevelId];
    this.modalRoot.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <div class="modal__panel pause-panel">
          <div class="pause-icon" aria-hidden="true">⏸️</div>
          <h2 class="modal__title" id="pause-title">Pausa</h2>
          <p class="modal__text">${esc(level?.name || '')}<br/>Respira, estira los dedos y continúa cuando quieras.</p>
          <div class="pause-actions">
            <button class="btn btn--primary btn--wide" data-action="resume">▶ Continuar</button>
            <button class="btn btn--ghost btn--wide" data-action="restart-level">↻ Reiniciar nivel</button>
            <button class="btn btn--ghost btn--wide" data-action="settings-from-pause">⚙️ Configuración</button>
            <button class="btn btn--ghost btn--wide" data-action="exit-level">🚪 Salir al mapa de niveles</button>
          </div>
          <p class="small muted" style="margin-top:12px">El progreso de este intento no se pierde al pausar.</p>
        </div>
      </div>`;
    this.modalRoot.querySelector('[data-action="resume"]')?.focus();
  }

  restartLevel() {
    if (!this.currentLevelId) return;
    this.store.recordAttempt(this.currentLevelId);
    this.closeModal();
    this.game.restart();
    this.toast('Nivel reiniciado. ¡Tú puedes!', 'info');
    this.game.pushHud();
  }

  exitLevel() {
    const world = this.currentWorld;
    this.game.stop();
    this.closeModal();
    this.canvas.hidden = true;
    this.hud.hidden = true;
    this.hud.innerHTML = '';
    this.currentLevelId = null;
    this.showLevelSelect(world);
  }

  /* ───────────────────────── Retos educativos ───────────────────────── */

  showChallenge(state, { focus = true } = {}) {
    this.challengeState = state;
    if (!state) return;
    if (state.paragraph) {
      this.showParagraphChallenge(state, { focus });
      return;
    }
    const { gate, target, total, progress, word } = state;
    const sequence = gate.keys.map((k, i) => {
      const t = makeTarget(k);
      const cls = i < progress ? 'is-done' : i === progress ? 'is-current' : '';
      return `<span class="challenge-slot ${cls}" aria-label="${esc(t.display)}${i < progress ? ', completada' : ''}">${esc(t.display)}</span>`;
    }).join('');
    const isWord = Boolean(word);
    const feedback = state.feedback;
    let feedbackHtml = '<div class="challenge-feedback" aria-live="polite">Escribe con calma. No hay prisa.</div>';
    if (feedback?.type === 'correct') {
      feedbackHtml = `<div class="challenge-feedback is-ok" aria-live="polite">¡Muy bien! ${progress < total ? 'Sigue con la siguiente tecla.' : '¡Completaste la secuencia!'}</div>`;
    } else if (feedback?.type === 'wrong') {
      feedbackHtml = `<div class="challenge-feedback is-bad" aria-live="polite">¡Casi! Busca la tecla <strong>${esc(feedback.expected)}</strong> iluminada. ${feedback.showHint ? 'Te la mostramos brillando.' : ''}</div>`;
    } else if (feedback?.type === 'hint') {
      feedbackHtml = `<div class="challenge-feedback is-ok" aria-live="polite">Mira la tecla iluminada: <strong>${esc(feedback.expected)}</strong></div>`;
    }

    this.modalRoot.innerHTML = `
      <div class="modal challenge-modal" role="dialog" aria-modal="true" aria-labelledby="challenge-title">
        <div class="modal__panel">
          <div class="challenge-head">
            <span class="challenge-head__world">Mundo ${state.world} · Tecla mágica</span>
            <div class="challenge-head__progress" aria-label="Progreso de la secuencia">
              ${Array.from({ length: total }).map((_, i) => `<span class="challenge-dot ${i < progress ? 'on' : ''}"></span>`).join('')}
            </div>
          </div>
          <h2 class="challenge-prompt" id="challenge-title">
            ${isWord ? 'Escribe la palabra' : total > 1 ? 'Escribe la secuencia' : 'Pulsa la tecla iluminada'}
          </h2>
          ${isWord || total > 1 ? `<div class="challenge-word">${sequence}</div>` : ''}
          <div class="challenge-target">
            <span class="challenge-key ${target.display.length > 2 ? 'challenge-key--word' : ''}" aria-label="Tecla ${esc(target.display)}">${esc(target.display)}</span>
            ${isWord ? `<span class="tag tag--gold">${esc(word)}</span>` : ''}
          </div>
          <p class="challenge-instruction">
            ${state.distractor ? 'Encuentra la tecla iluminada entre todas las demás. ' : ''}
            Usa tu teclado físico o toca la tecla iluminada. ${state.inputMode === 'position' ? 'En este modo cuenta la posición física de la tecla.' : ''}
          </p>
          ${feedbackHtml}
          <div class="challenge-hint" id="challenge-hint" ${feedback?.showHint || feedback?.type === 'hint' ? '' : 'hidden'}>
            <span aria-hidden="true">💡</span> La tecla correcta está brillando en el teclado. Búscala con calma.
          </div>
          <div id="challenge-keyboard"></div>
          <div class="challenge-actions">
            <button class="btn btn--secondary btn--small" data-action="challenge-help">💡 Ayuda con la tecla</button>
            <button class="btn btn--ghost btn--small" data-action="challenge-cancel">Salir del reto</button>
          </div>
          <div class="challenge-mode">${esc(getLayout(state.layout).name)} · ${state.inputMode === 'position' ? 'aprendizaje por posición física' : 'aprendizaje por carácter'}</div>
        </div>
      </div>
    `;
    renderVirtualKeyboard(document.getElementById('challenge-keyboard'), {
      layout: state.layout,
      targets: [target],
      inputMode: state.inputMode,
      interactive: true,
      compact: true,
      showArrows: false,
      onKey: (key) => this.game.submitVirtualKey(key),
    });
    this.modalRoot.querySelector('[data-action="challenge-help"]')?.focus({ preventScroll: true });
    this.srLive.textContent = `Reto: ${isWord ? 'escribe la palabra ' + word : total > 1 ? 'escribe la secuencia' : 'pulsa la tecla ' + target.display}`;
  }

  showParagraphChallenge(state, { focus = true } = {}) {
    const p = state.paragraph;
    const expectedDisplay = p.expected === ' '
      ? 'ESPACIO'
      : p.expected
        ? `“${p.expected}”`
        : 'el final de la frase';
    const chars = Array.from(p.target);
    const targetHtml = chars
      .map((ch, i) => {
        const cls = i < p.prefix ? 'is-done' : i === p.prefix ? 'is-current' : '';
        const display = ch === ' ' ? '&nbsp;' : esc(ch);
        return `<span class="paragraph-char ${cls}">${display}</span>`;
      })
      .join('');
    const rawChars = Array.from(p.rawInput ?? p.input ?? '');
    const typedHtml = rawChars.length
      ? rawChars
          .map((ch, i) => {
            const cls = i < p.prefix
              ? 'is-done'
              : i === p.prefix && p.mismatch
                ? 'is-wrong'
                : 'is-typed';
            const display = ch === ' ' ? '&nbsp;' : esc(ch);
            return `<span class="${cls}">${display}</span>`;
          })
          .join('') + '<span class="paragraph-caret" aria-hidden="true"></span>'
      : '<span class="paragraph-placeholder">Escribe aquí con tu teclado…</span>';
    const feedback = state.feedback;
    let feedbackHtml = '<div class="challenge-feedback" aria-live="polite">Escribe con calma. Puedes corregir con RETROCESO.</div>';
    if (feedback?.type === 'hint') {
      feedbackHtml = `<div class="challenge-feedback is-ok" aria-live="polite">La próxima ${p.expected === ' ' ? 'tecla es <strong>ESPACIO</strong>' : `letra es <strong>${esc(expectedDisplay)}</strong>`}.</div>`;
    } else if (feedback?.type === 'paragraph-typo') {
      feedbackHtml = `<div class="challenge-feedback is-bad" aria-live="polite">¡Casi! Esperabas <strong>${esc(feedback.expected === ' ' ? 'ESPACIO' : feedback.expected ?? '?')}</strong> y escribiste <strong>${esc(feedback.pressed ?? '?')}</strong>. Borra con RETROCESO y prueba otra vez.</div>`;
    } else if (feedback?.type === 'paragraph-pending') {
      feedbackHtml = `<div class="challenge-feedback is-ok" aria-live="polite">Todavía falta un poquito. La próxima ${p.expected === ' ' ? 'tecla es ESPACIO' : `letra es “${esc(p.expected ?? '')}”`}.</div>`;
    } else if (feedback?.type === 'correct') {
      feedbackHtml = '<div class="challenge-feedback is-ok" aria-live="polite">¡Muy bien! Frase completada.</div>';
    }
    const percent = Math.round((p.progress || 0) * 100);

    this.modalRoot.innerHTML = `
      <div class="modal challenge-modal challenge-modal--paragraph" role="dialog" aria-modal="true" aria-labelledby="challenge-title">
        <div class="modal__panel">
          <div class="challenge-head">
            <span class="challenge-head__world">Mundo ${state.world} · ${p.total > 60 ? 'Párrafo' : 'Frase'} ${state.gateIndex} de ${state.gateTotal}</span>
            <span class="tag">${p.prefix}/${p.total} caracteres</span>
          </div>
          <h2 class="challenge-prompt" id="challenge-title">${p.total > 60 ? 'Escribe el párrafo completo' : 'Escribe la frase completa'}</h2>
          <div class="paragraph-card">
            <div class="paragraph-label">Texto que vas a escribir</div>
            <div class="paragraph-text">${targetHtml}</div>
          </div>
          <div class="paragraph-typed" aria-label="Lo que has escrito">${typedHtml}</div>
          <div class="paragraph-meter" aria-hidden="true">
            <div class="paragraph-meter__track"><div class="paragraph-meter__fill" style="width:${percent}%"></div></div>
            <span>${percent}%</span>
          </div>
          <p class="challenge-instruction">
            Usa mayúscula al inicio y punto al final. Si olvidas una tilde o la Ñ, el juego te deja continuar y te recuerda practicarla.
          </p>
          ${feedbackHtml}
          <div class="challenge-hint" id="challenge-hint" ${feedback?.type === 'hint' ? '' : 'hidden'}>
            <span aria-hidden="true">💡</span> La próxima letra está brillando en el teclado.
          </div>
          <div id="challenge-keyboard"></div>
          <div class="challenge-actions">
            <button class="btn btn--secondary btn--small" data-action="challenge-help">💡 Ver la próxima letra</button>
            <button class="btn btn--ghost btn--small" data-action="paragraph-clear">🧹 Borrar todo</button>
            <button class="btn btn--ghost btn--small" data-action="paragraph-check">✅ Comprobar</button>
            <button class="btn btn--ghost btn--small" data-action="challenge-cancel">Salir del reto</button>
          </div>
          <div class="challenge-mode">${esc(getLayout(state.layout).name)} · escritura por carácter · Enter comprueba</div>
        </div>
      </div>
    `;
    const nextTargets = [];
    if (p.expected) {
      if (/^[áéíóúü]$/i.test(p.expected)) {
        const base = p.expected
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleUpperCase('es-CO');
        nextTargets.push(makeTarget(base));
        nextTargets.push({ char: '´', display: '´', code: 'BracketLeft', label: '´' });
      } else {
        nextTargets.push(p.expected === ' ' ? makeTarget('ESPACIO') : makeTarget(p.expected));
      }
    }
    renderVirtualKeyboard(document.getElementById('challenge-keyboard'), {
      layout: state.layout,
      targets: nextTargets,
      inputMode: 'char',
      interactive: true,
      compact: true,
      showArrows: false,
      onKey: (key) => this.game.submitVirtualKey(key),
    });
    if (focus) {
      this.modalRoot.querySelector('[data-action="challenge-help"]')?.focus({ preventScroll: true });
    }
    this.srLive.textContent = `Reto de escritura. ${p.prefix} de ${p.total} caracteres. Próxima ${p.expected === ' ' ? 'tecla: espacio' : p.expected ? `letra: ${p.expected}` : 'palabra: revisa el final'}.`;
  }

  onChallengeUpdate(state) {
    this.showChallenge(state, { focus: false });
  }

  onChallengeClose() {
    this.closeModal();
  }

  /* ───────────────────────── Tutorial inicial ───────────────────────── */

  showTutorial(onDone) {
    const steps = [
      { code: 'ArrowRight', target: { char: '→', display: '→', code: 'ArrowRight' }, text: 'Para caminar a la derecha, pulsa la flecha derecha.', tip: 'Mira la tecla iluminada.' },
      { code: 'ArrowLeft', target: { char: '←', display: '←', code: 'ArrowLeft' }, text: 'Para caminar a la izquierda, pulsa la flecha izquierda.', tip: 'Las flechas están juntas, abajo a la derecha.' },
      { code: 'Space', target: makeTarget('ESPACIO'), text: 'Para saltar, pulsa la barra espaciadora.', tip: 'Es la tecla larga de abajo. Pon el pulgar sobre ella.' },
      { code: 'KeyA', target: makeTarget('A'), text: 'Ahora pulsa una letra: la A.', tip: 'La A está a la izquierda de la fila del medio.' },
    ];
    let index = 0;
    const settings = this.store.settings;
    const render = () => {
      const step = steps[index];
      this.modalRoot.innerHTML = `
        <div class="modal tutorial-modal" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
          <div class="modal__panel">
            <div class="tutorial-steps" aria-label="Paso ${index + 1} de ${steps.length}">
              ${steps.map((_, i) => `<i class="${i <= index ? 'on' : ''}"></i>`).join('')}
            </div>
            <span class="eyebrow">Tutorial · Paso ${index + 1} de ${steps.length}</span>
            <h2 class="modal__title" id="tutorial-title">${index === 3 ? '¡Ahora una tecla mágica!' : 'Aprende a moverte'}</h2>
            <p class="modal__text">${esc(step.text)}</p>
            <div class="tutorial-demo" aria-hidden="true"><span class="kbd-chip">${esc(step.target.display)}</span></div>
            <p class="small muted">${esc(step.tip)}</p>
            <div class="tutorial-keyboard" id="tutorial-keyboard"></div>
            <div class="row" style="justify-content:center;margin-top:14px">
              <button class="btn btn--ghost btn--small" data-action="tutorial-skip">Saltar tutorial</button>
            </div>
            <p class="small muted" style="margin-top:10px">Puedes usar el teclado o tocar la tecla iluminada en la pantalla.</p>
          </div>
        </div>`;
      renderVirtualKeyboard(document.getElementById('tutorial-keyboard'), {
        layout: settings.layout,
        targets: [step.target],
        inputMode: 'char',
        interactive: true,
        compact: true,
        showArrows: true,
        onKey: (key) => this._tutorialKey(key),
      });
      this.modalRoot
        .querySelector('[data-action="tutorial-skip"]')
        ?.addEventListener('click', finish);
      this.modalRoot.querySelector('.modal__panel')?.focus?.();
    };
    const finish = () => {
      this._cleanupTutorial();
      this.store.markTutorialDone();
      this.closeModal();
      this.toast('¡Tutorial completado! Ahora sí, a recuperar las teclas.', 'success');
      onDone?.();
    };
    const advance = () => {
      this.audio.sfx('correct');
      index += 1;
      if (index >= steps.length) finish();
      else render();
    };
    this._tutorialKey = (event) => {
      const step = steps[index];
      if (!step) return;
      let ok;
      if (step.target.code === 'ArrowRight' || step.target.code === 'ArrowLeft' || step.target.code === 'Space') {
        ok = event.code === step.target.code;
      } else {
        ok = matchesTarget(event, step.target, 'char') || event.code === step.target.code;
      }
      if (ok) advance();
      else {
        this.audio.sfx('wrong');
        const text = document.querySelector('.tutorial-modal .modal__text');
        if (text) text.textContent = '¡Casi! Busca la tecla iluminada y vuelve a intentarlo.';
        this.modalRoot.querySelector('.modal__panel')?.classList.add('is-shake');
        setTimeout(() => this.modalRoot.querySelector('.modal__panel')?.classList.remove('is-shake'), 350);
      }
    };
    const keyHandler = (event) => {
      if (event.repeat) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'Backspace'].includes(event.code)) {
        event.preventDefault();
      }
      if (event.target?.matches?.('input, textarea')) return;
      this._tutorialKey(event);
    };
    window.addEventListener('keydown', keyHandler);
    this._tutorialCleanup = () => {
      window.removeEventListener('keydown', keyHandler);
      this._tutorialCleanup = null;
      this._tutorialKey = null;
    };
    render();
  }

  _cleanupTutorial() {
    if (this._tutorialCleanup) this._tutorialCleanup();
  }

  /* ───────────────────────── Victoria ───────────────────────── */

  showVictory(summary) {
    this._cleanupPractice();
    const level = LEVEL_BY_ID[summary.levelId];
    const nextId = nextLevelId(summary.levelId);
    const isFinal = summary.levelId === LEVELS[LEVELS.length - 1].id && this.store.completedCount() >= TOTAL_LEVELS;
    const totalStars = this.store.totalStars();
    const nextUnlocked = nextId ? this.store.isLevelUnlocked(nextId) : false;
    const message = isFinal
      ? '¡Recuperaste todas las teclas del reino! Tilo está muy orgulloso de ti.'
      : starMessage(summary.stars, summary.accuracy);

    this._setScreen('victory', `
      <section class="screen victory-screen">
        <div class="victory-card">
          <div class="victory-crown" aria-hidden="true">${isFinal ? crownSVG('') : '🏆'}</div>
          ${isFinal ? `<span class="final-banner">Final del juego · ${TOTAL_WORLDS} mundos · ${TOTAL_LEVELS} niveles</span>` : ''}
          <h1 class="victory-title">${isFinal ? '¡Reino recuperado!' : '¡Nivel completado!'}</h1>
          <p class="victory-message">${esc(message)}</p>
          <div class="victory-stars" aria-label="${summary.stars} de 3 estrellas">
            ${[1, 2, 3].map((i) => `<span data-star="${i}" class="${i <= summary.stars ? 'on' : ''}">★</span>`).join('')}
          </div>
          <div class="victory-stats">
            <div class="stat"><div class="stat__value">${summary.accuracy === null ? 'Sin datos' : `${summary.accuracy}%`}</div><div class="stat__label">Precisión</div></div>
            <div class="stat"><div class="stat__value">${summary.correct}<span style="font-size:.7em;color:#fff"> / </span>${summary.incorrect}</div><div class="stat__label">Aciertos / errores</div></div>
            <div class="stat"><div class="stat__value">${summary.coins}/${summary.requiredCoins}</div><div class="stat__label">Monedas</div></div>
            <div class="stat"><div class="stat__value">${formatTime(summary.timeMs)}</div><div class="stat__label">Tiempo (opcional)</div></div>
          </div>
          <p class="small muted">${esc(level?.name || '')} · Mundo ${summary.world} · ${summary.helps} ayuda${summary.helps === 1 ? '' : 's'} · ${summary.gatesCompleted}/${summary.totalGates} teclas mágicas</p>
          ${isFinal ? `<p class="tag tag--gold" style="font-size:.95rem">👑 ${totalStars}/${TOTAL_STARS} estrellas reunidas · ¡Maestro del teclado!</p>` : ''}
          <div class="victory-actions">
            <button class="btn btn--ghost" data-action="victory-repeat" data-level="${summary.levelId}">↻ Repetir nivel</button>
            ${nextId && !isFinal ? `<button class="btn btn--primary" data-action="victory-next" data-level="${nextId}" ${nextUnlocked ? '' : 'disabled'}>▶ Siguiente nivel</button>` : ''}
            ${isFinal ? `<button class="btn btn--primary" data-action="victory-progress">⭐ Ver mi progreso</button>` : ''}
            <button class="btn btn--secondary" data-action="victory-worlds">🗺️ Mundo</button>
            <button class="btn btn--ghost" data-action="menu">🏠 Menú</button>
          </div>
          ${summary.stars < 3 ? '<p class="small muted">Puedes repetir el nivel para practicar y ganar más estrellas. No hay prisa.</p>' : ''}
        </div>
      </section>
    `);
    // Animación progresiva de estrellas.
    this.screens.querySelectorAll('.victory-stars span').forEach((el, i) => {
      if (el.classList.contains('on')) {
        setTimeout(() => {
          el.style.transform = 'scale(1.12)';
          setTimeout(() => {
            el.style.transform = '';
          }, 220);
        }, 140 + i * 220);
      }
    });
    if (!this.store.settings.reducedMotion) this.launchConfetti(isFinal ? 110 : 60);
    this.srLive.textContent = `Nivel completado. ${summary.stars} de 3 estrellas. Precisión ${summary.accuracy === null ? 'sin datos' : summary.accuracy + ' por ciento'}.`;
  }

  launchConfetti(count = 60) {
    const layer = document.createElement('div');
    layer.className = 'confetti-layer';
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement('span');
      piece.className = 'confetti';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.animationDuration = `${2.4 + Math.random() * 2.2}s`;
      piece.style.animationDelay = `${Math.random() * 0.8}s`;
      piece.style.width = `${6 + Math.random() * 7}px`;
      piece.style.height = `${10 + Math.random() * 10}px`;
      piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 300}px`);
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 5200);
  }

  /* ───────────────────────── Progreso ───────────────────────── */

  showProgress() {
    const profile = this.store.profile;
    const completed = this.store.completedCount();
    const stars = this.store.totalStars();
    const completedWithData = Object.values(profile.progress).filter(
      (p) => p.completed && p.accuracy !== null && p.accuracy !== undefined,
    );
    const avg =
      completedWithData.length > 0
        ? Math.round(completedWithData.reduce((sum, p) => sum + p.accuracy, 0) / completedWithData.length)
        : null;
    const worlds = WORLDS.map((world) => {
      const levels = levelsOfWorld(world.id).map((level) => {
        const stats = profile.progress[level.id];
        return `
          <div class="level-row">
            <span class="level-row__name">${level.index}. ${esc(level.name)}</span>
            <span class="level-row__acc">${stats?.completed ? `${starIcons(stats.stars || 0)} ${levelAccuracy(stats)}` : 'Pendiente'}</span>
          </div>`;
      }).join('');
      return `
        <div class="progress-world" style="--wc:${world.mask[0]}">
          <div class="progress-world__head">
            <h3>${WORLD_ICONS[world.id - 1]} Mundo ${world.id} · ${esc(world.short)}</h3>
            <span class="tag">${this.store.worldStars(world.id)}/${worldStarsTotal(world.id)} ★</span>
          </div>
          <div class="level-rows">${levels}</div>
        </div>`;
    }).join('');
    const keyErrors = this.store.topKeyErrors(6);
    const keyHtml = keyErrors.length
      ? keyErrors.map(([key, count]) => `<span class="key-error"><span class="kbd-chip">${esc(key)}</span> ${count} fallo${count === 1 ? '' : 's'}</span>`).join('')
      : '<span class="small muted">¡Todavía no hay fallos registrados! Sigue practicando.</span>';

    this._setScreen('progress', `
      <section class="screen">
        <div class="screen__top">
          <div>
            <span class="eyebrow">📊 Resumen para docente o acudiente</span>
            <h1 class="screen__title">Mi progreso</h1>
            <p class="screen__subtitle">Perfil local <strong>${esc(profile.alias)}</strong>. No se recopilan nombres completos, correos ni datos personales.</p>
          </div>
          <button class="btn btn--ghost" data-action="menu">← Menú</button>
        </div>
        <div class="progress-summary">
          <div class="summary-card"><strong>${completed}/${TOTAL_LEVELS}</strong><span>Niveles completados</span></div>
          <div class="summary-card"><strong>${stars}/${TOTAL_STARS}</strong><span>Estrellas</span></div>
          <div class="summary-card"><strong>${avg === null ? 'Sin datos' : `${avg}%`}</strong><span>Precisión promedio</span></div>
          <div class="summary-card"><strong>${this.store.profile.keyErrors ? Object.keys(this.store.profile.keyErrors).length : 0}</strong><span>Teclas por practicar</span></div>
        </div>
        <div class="panel">
          <div class="spread" style="margin-bottom:10px">
            <h2 class="screen__title" style="font-size:1.2rem">Teclas que necesitan práctica</h2>
            <span class="tag">Se actualiza al jugar</span>
          </div>
          <div class="key-errors">${keyHtml}</div>
        </div>
        <div class="card-grid progress-worlds">${worlds}</div>
        <div class="panel stack">
          <div class="spread">
            <h2 class="screen__title" style="font-size:1.2rem">Guardar y compartir el progreso</h2>
            <div class="row">
              <button class="btn btn--secondary btn--small" data-action="export-progress">⬇ Exportar JSON</button>
              <button class="btn btn--ghost btn--small" data-action="import-progress">⬆ Importar JSON</button>
              <button class="btn btn--danger btn--small" data-action="reset-progress">🗑 Reiniciar progreso</button>
            </div>
          </div>
          <input type="file" id="import-file" accept="application/json,.json" class="sr-only" />
          <p class="small muted" style="margin:0">El progreso se guarda en este navegador y no se sincroniza automáticamente con otros computadores. Exporta el archivo JSON si quieres llevarlo a otro equipo. El archivo no contiene datos personales.</p>
          <p class="small muted" style="margin:0">El docente puede revisar aquí estrellas, precisión y teclas con más fallos. Las estrellas valoran el aprendizaje y la precisión, nunca la velocidad.</p>
        </div>
      </section>
    `);
    const fileInput = document.getElementById('import-file');
    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const result = this.store.importFromText(text);
          if (result.ok) {
            this.applyPreferences(this.store.settings);
            this.toast(`Progreso importado: ${result.stats.levels} niveles y ${result.stats.stars} estrellas.`, 'success');
            this.showProgress();
          } else {
            this.toast(`No se pudo importar: ${result.error}`, 'error');
          }
        } catch {
          this.toast('No se pudo leer el archivo. Debe ser un JSON válido.', 'error');
        } finally {
          fileInput.value = '';
        }
      });
    }
  }

  exportProgress() {
    try {
      const data = this.store.exportJson();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tecladoaventura-progreso-${this.store.profile.alias.replace(/[^a-zA-Z0-9_-]/g, '') || 'local'}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      this.toast('Archivo de progreso descargado.', 'success');
    } catch {
      this.toast('No se pudo exportar el progreso.', 'error');
    }
  }

  confirmReset() {
    this.modalRoot.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
        <div class="modal__panel">
          <h2 class="modal__title" id="reset-title">¿Reiniciar todo el progreso?</h2>
          <p class="modal__text">Se borrarán los niveles completados, las estrellas y el historial de teclas del perfil <strong>${esc(this.store.profile.alias)}</strong>. Esta acción no se puede deshacer. Tu configuración se conserva.</p>
          <div class="modal__actions">
            <button class="btn btn--ghost" data-action="reset-cancel">Cancelar</button>
            <button class="btn btn--danger" data-action="reset-confirm">Sí, reiniciar</button>
          </div>
        </div>
      </div>`;
    this.modalRoot.querySelector('[data-action="reset-confirm"]')?.focus();
  }

  /* ───────────────────────── Práctica de teclado ───────────────────────── */

  showPractice() {
    this._cleanupPractice();
    const settings = this.store.settings;
    const layout = getLayout(settings.layout);
    // `_setScreen` vuelve a limpiar el estado de práctica; por eso el reto se
    // crea después de renderizar la pantalla y usamos un objetivo local.
    const target = makeTarget(this.randomPracticeKey());
    this._setScreen('practice', `
      <section class="screen">
        <div class="screen__top">
          <div>
            <span class="eyebrow">⌨️ Gimnasio de teclado</span>
            <h1 class="screen__title">Practica sin prisa</h1>
            <p class="screen__subtitle">Aquí no hay portal ni vidas. Elige una tecla, mírala en el teclado virtual y pulsa con calma.</p>
          </div>
          <button class="btn btn--ghost" data-action="menu">← Menú</button>
        </div>
        <div class="practice-layout">
          <div class="panel practice-card">
            <div class="spread">
              <span class="demo-panel__title">Reto de práctica</span>
              <span class="tag" id="practice-score">Aciertos 0 · Errores 0</span>
            </div>
            <div class="practice-target">
              <span class="challenge-key practice-target__key" id="practice-target">${esc(target.display)}</span>
              <div>
                <div style="font-weight:900;font-size:1.05rem">Pulsa esta tecla</div>
                <div class="small muted" id="practice-hint">Mira el teclado y búscala. No hay tiempo límite.</div>
              </div>
            </div>
            <div class="practice-feedback" id="practice-feedback" aria-live="polite">Cuando estés listo, pulsa la tecla.</div>
            <div id="practice-keyboard"></div>
            <div class="row">
              <button class="btn btn--secondary btn--small" data-action="practice-next">↻ Otra tecla</button>
              <button class="btn btn--ghost btn--small" data-action="settings">⚙️ Cambiar distribución o modo</button>
            </div>
          </div>
          <div class="panel practice-card">
            <span class="demo-panel__title">✨ Taller de Ñ y tildes</span>
            <p class="small muted" style="margin:0">${esc(layout.accentHint)}</p>
            <p class="small muted" style="margin:0">${esc(layout.enyeHint)}</p>
            <div class="workshop-chars" aria-label="Caracteres especiales">
              ${SPECIAL_CHECK.map((char) => `<button class="special-char" data-action="workshop-insert" data-char="${char}" aria-label="Insertar ${char}">${char}</button>`).join('')}
            </div>
            <div class="workshop-status" id="workshop-status">
              ${SPECIAL_CHECK.map((char) => `<span data-char-status="${char}">${char} pendiente</span>`).join('')}
            </div>
            <label class="field">
              <span>Escribe aquí para probar tu teclado</span>
              <textarea class="input practice-input" id="workshop-input" rows="3" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Prueba: Ñ  Á  É  Í  Ó  Ú"></textarea>
            </label>
            <p class="small muted" style="margin:0">Si tu teclado no logra escribir una tilde con la tecla muerta, usa los botones de arriba. Aprender la posición de una tecla también vale, y nunca bloqueamos tu avance por la distribución del equipo.</p>
            <div class="panel panel--light small">
              <strong>Distribución actual:</strong> ${esc(layout.name)}<br/>
              <strong>Modo de aprendizaje:</strong> ${settings.inputMode === 'position' ? 'posición física (event.code)' : 'carácter producido (event.key)'}
            </div>
          </div>
        </div>
      </section>
    `);
    this.practice = {
      target,
      correct: 0,
      incorrect: 0,
      locked: false,
      layout: settings.layout,
      inputMode: settings.inputMode,
    };
    renderVirtualKeyboard(document.getElementById('practice-keyboard'), {
      layout: this.practice.layout,
      targets: [this.practice.target],
      inputMode: this.practice.inputMode,
      interactive: true,
      compact: false,
      showArrows: true,
      onKey: (key) => this.handlePracticeKey(key),
    });
    this._practiceKeyHandler = (event) => {
      if (event.target?.matches?.('input, textarea')) return;
      if (event.repeat) return;
      if (['ArrowUp', 'ArrowDown', 'Space', 'Enter', 'Backspace'].includes(event.code)) event.preventDefault();
      this.handlePracticeKey(event);
    };
    window.addEventListener('keydown', this._practiceKeyHandler);
    const textarea = document.getElementById('workshop-input');
    if (textarea) {
      textarea.addEventListener('input', () => this.updateWorkshopStatus(textarea.value));
    }
  }

  randomPracticeKey() {
    let key = PRACTICE_POOL[Math.floor(Math.random() * PRACTICE_POOL.length)];
    if (this.practice && makeTarget(key).display === this.practice.target.display) {
      key = PRACTICE_POOL[(PRACTICE_POOL.indexOf(key) + 3) % PRACTICE_POOL.length];
    }
    return key;
  }

  handlePracticeKey(event) {
    if (!this.practice || this.practice.locked) return;
    if (event.code === 'Escape') return;
    const ok = matchesTarget(event, this.practice.target, this.practice.inputMode);
    const feedback = document.getElementById('practice-feedback');
    if (ok) {
      this.practice.correct += 1;
      this.practice.locked = true;
      this.audio.sfx('correct');
      if (feedback) {
        feedback.textContent = '¡Muy bien! Encontraste la tecla.';
        feedback.classList.remove('is-error');
      }
      const score = document.getElementById('practice-score');
      if (score) score.textContent = `Aciertos ${this.practice.correct} · Errores ${this.practice.incorrect}`;
      setTimeout(() => {
        if (!this.practice || this.currentScreen !== 'practice') return;
        this.nextPracticeTarget();
      }, 700);
    } else {
      this.practice.incorrect += 1;
      this.audio.sfx('wrong');
      if (feedback) {
        feedback.textContent = `¡Casi! La tecla correcta es ${this.practice.target.display}. Mira cómo brilla.`;
        feedback.classList.add('is-error');
      }
      const score = document.getElementById('practice-score');
      if (score) score.textContent = `Aciertos ${this.practice.correct} · Errores ${this.practice.incorrect}`;
      this.srLive.textContent = `La tecla correcta es ${this.practice.target.display}`;
    }
  }

  nextPracticeTarget() {
    if (!this.practice) return;
    this.practice.target = makeTarget(this.randomPracticeKey());
    this.practice.locked = false;
    const targetEl = document.getElementById('practice-target');
    if (targetEl) targetEl.textContent = this.practice.target.display;
    const feedback = document.getElementById('practice-feedback');
    if (feedback) {
      feedback.textContent = 'Pulsa la nueva tecla iluminada.';
      feedback.classList.remove('is-error');
    }
    renderVirtualKeyboard(document.getElementById('practice-keyboard'), {
      layout: this.practice.layout,
      targets: [this.practice.target],
      inputMode: this.practice.inputMode,
      interactive: true,
      compact: false,
      showArrows: true,
      onKey: (key) => this.handlePracticeKey(key),
    });
  }

  updateWorkshopStatus(value) {
    const chars = new Set(Array.from(String(value || '').toLocaleUpperCase('es-CO')));
    const container = document.getElementById('workshop-status');
    if (!container) return;
    SPECIAL_CHECK.forEach((char) => {
      const el = container.querySelector(`[data-char-status="${char}"]`);
      if (!el) return;
      const ok = chars.has(char);
      el.classList.toggle('ok', ok);
      el.textContent = ok ? `${char} ✓` : `${char} pendiente`;
    });
  }

  insertWorkshopChar(char) {
    const textarea = document.getElementById('workshop-input');
    if (!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    textarea.value = `${textarea.value.slice(0, start)}${char}${textarea.value.slice(end)}`;
    textarea.selectionStart = textarea.selectionEnd = start + char.length;
    textarea.focus();
    this.updateWorkshopStatus(textarea.value);
  }

  _cleanupPractice() {
    if (this._practiceKeyHandler) {
      window.removeEventListener('keydown', this._practiceKeyHandler);
      this._practiceKeyHandler = null;
    }
    this.practice = null;
  }

  /* ───────────────────────── Configuración ───────────────────────── */

  showSettings(fromPause = false) {
    this.settingsFromPause = Boolean(fromPause);
    const settings = this.store.settings;
    const layout = getLayout(settings.layout);
    const profiles = this.store.profiles;
    const toggle = (key, label, hint) => `
      <div class="toggle-row">
        <div><div style="font-weight:800">${label}</div><div class="small muted">${hint}</div></div>
        <button class="switch" data-action="setting-toggle" data-setting="${key}" aria-checked="${settings[key]}" role="switch" aria-label="${label}"></button>
      </div>`;
    const profileOptions = profiles.map((p) => `
      <button class="profile-option ${p.id === this.store.profile.id ? 'is-active' : ''}" data-action="switch-profile" data-profile="${p.id}">
        <span class="profile-avatar" style="width:34px;height:34px;font-size:1rem">${esc(p.alias.slice(0, 1).toUpperCase())}</span>
        <span>${esc(p.alias)}</span>
        <small>${Object.values(p.progress).filter((l) => l.completed).length}/${TOTAL_LEVELS}</small>
      </button>`).join('');

    this._setScreen('settings', `
      <section class="screen">
        <div class="screen__top">
          <div>
            <span class="eyebrow">⚙️ A tu manera</span>
            <h1 class="screen__title">Configuración</h1>
            <p class="screen__subtitle">Elige cómo aprendes, cómo se ve el juego y quién está jugando. Los cambios se guardan solos.</p>
          </div>
          <button class="btn btn--ghost" data-action="back-settings">← Volver</button>
        </div>
        <div class="settings-layout">
          <div class="stack">
            <div class="panel settings-section">
              <h3>Teclado</h3>
              <label class="field">
                <span>Distribución física del teclado</span>
                <select class="select" id="setting-layout">
                  <option value="latam" ${settings.layout === 'latam' ? 'selected' : ''}>Latinoamérica (ISO) — recomendada en Colombia</option>
                  <option value="es" ${settings.layout === 'es' ? 'selected' : ''}>España (ISO)</option>
                  <option value="us" ${settings.layout === 'us' ? 'selected' : ''}>Estados Unidos (QWERTY)</option>
                </select>
              </label>
              <p class="small muted">${esc(layout.note)}</p>
              <div class="row" style="margin:6px 0 10px">
                <button class="btn ${settings.inputMode === 'char' ? 'btn--primary' : 'btn--ghost'} btn--small" data-action="set-mode" data-mode="char" aria-pressed="${settings.inputMode === 'char'}">Aprender por carácter</button>
                <button class="btn ${settings.inputMode === 'position' ? 'btn--primary' : 'btn--ghost'} btn--small" data-action="set-mode" data-mode="position" aria-pressed="${settings.inputMode === 'position'}">Aprender por posición física</button>
              </div>
              <p class="small muted">Carácter: cuenta la letra producida con la distribución activa. Posición: cuenta la ubicación física de la tecla (event.code).</p>
              <div id="settings-keyboard"></div>
            </div>
            <div class="panel settings-section">
              <h3>Audio</h3>
              ${toggle('sound', 'Efectos de sonido', 'Saltos, monedas y respuestas.')}
              ${toggle('music', 'Música de fondo', 'Una melodía suave distinta en cada mundo.')}
              <label class="field" style="margin-top:10px">
                <span>Volumen general: <strong id="volume-label">${Math.round(settings.volume * 100)}%</strong></span>
                <input type="range" id="setting-volume" min="0" max="100" step="5" value="${Math.round(settings.volume * 100)}" aria-label="Volumen general" />
              </label>
            </div>
            <div class="panel settings-section">
              <h3>Accesibilidad y ayudas</h3>
              ${toggle('reducedMotion', 'Reducir animaciones', 'Menos movimiento y efectos.')}
              ${toggle('highContrast', 'Alto contraste', 'Letras y bordes más marcados.')}
              ${toggle('largeText', 'Texto más grande', 'Aumenta el tamaño de la interfaz.')}
              ${toggle('onScreenControls', 'Controles en pantalla', 'Botones para moverte y saltar sin teclado físico.')}
              ${toggle('showKeyboardHints', 'Pistas del teclado', 'Muestra la próxima tecla sobre el recorrido.')}
            </div>
          </div>
          <div class="stack">
            <div class="panel settings-section">
              <h3>Perfiles locales</h3>
              <p class="small muted">Hasta 8 perfiles. Solo un apodo; no pedimos nombres completos ni correos.</p>
              <div class="profile-list">${profileOptions}</div>
              <form id="profile-form" class="row" style="margin-top:10px">
                <input class="input" id="profile-name" maxlength="16" placeholder="Nuevo apodo (máx. 16)" aria-label="Apodo del nuevo perfil" style="flex:1" />
                <button class="btn btn--secondary btn--small" type="submit">＋ Crear</button>
              </form>
            </div>
            <div class="panel settings-section">
              <h3>Privacidad</h3>
              <p class="small muted" style="line-height:1.55">El progreso se guarda únicamente en este navegador con LocalStorage. No hay cuentas, servidores ni datos personales. Puedes exportar o borrar el progreso desde “Mi progreso”.</p>
              <div class="row">
                <button class="btn btn--ghost btn--small" data-action="progress">⭐ Ver mi progreso</button>
                <button class="btn btn--ghost btn--small" data-action="practice">⌨️ Practicar teclado</button>
              </div>
            </div>
            <div class="panel settings-section">
              <h3>Distribución y teclas especiales</h3>
              <p class="small muted" style="line-height:1.55">${esc(layout.enyeHint)}</p>
              <p class="small muted" style="line-height:1.55">${esc(layout.accentHint)}</p>
            </div>
          </div>
        </div>
      </section>
    `);

    renderVirtualKeyboard(document.getElementById('settings-keyboard'), {
      layout: settings.layout,
      targets: [makeTarget('A'), makeTarget('Ñ'), makeTarget('1'), makeTarget('ESPACIO')],
      inputMode: settings.inputMode,
      compact: true,
      showArrows: true,
      animate: true,
    });
    const volume = document.getElementById('setting-volume');
    if (volume) {
      volume.addEventListener('input', () => {
        const label = document.getElementById('volume-label');
        if (label) label.textContent = `${volume.value}%`;
      });
    }
  }

  /* ───────────────────────── Acerca de ───────────────────────── */

  showAbout() {
    this._setScreen('about', `
      <section class="screen">
        <div class="screen__top">
          <button class="btn btn--ghost" data-action="menu">← Menú</button>
          <span class="tag">Versión ${APP.version}</span>
        </div>
        <div class="about-hero panel">
          ${mascotSVG()}
          <div>
            <span class="eyebrow">Juego original</span>
            <h1 class="screen__title">Tecladoaventura</h1>
            <p class="screen__subtitle">El Reino de las Teclas es un juego de plataformas creado para que niñas y niños de 6 a 7 años aprendan a usar el teclado con misiones cortas, demostraciones visuales y mucha práctica. Los últimos mundos añaden escritura de frases y párrafos completos en español.</p>
          </div>
        </div>
        <div class="about-grid">
          <div class="panel">
            <h3>🎮 Cómo se juega</h3>
            <p>Usa <strong>← →</strong> para caminar, <strong>ESPACIO</strong> para saltar y pulsa las teclas iluminadas para abrir las burbujas mágicas. En los mundos altos, escribe frases y párrafos completos. Llega al portal con todas las teclas y las monedas necesarias.</p>
          </div>
          <div class="panel">
            <h3>🎓 Lo que aprenderás</h3>
            <ul>
              <li>Movimiento y saltos con el teclado.</li>
              <li>Vocales, consonantes y la letra Ñ.</li>
              <li>Palabras cortas y secuencias.</li>
              <li>Números y teclas especiales.</li>
              <li>Frases y párrafos completos con tildes y Ñ.</li>
              <li>Precisión y autonomía, sin castigos.</li>
            </ul>
          </div>
          <div class="panel">
            <h3>👨‍👩‍👧 Para familias y docentes</h3>
            <p>El progreso vive en este navegador. La pantalla “Mi progreso” muestra niveles, estrellas, precisión y teclas por practicar. Se puede exportar e importar un JSON. No se piden datos personales.</p>
          </div>
          <div class="panel">
            <h3>🌎 Teclados de Latinoamérica</h3>
            <p>El juego detecta posición física y carácter. Puedes elegir la distribución latinoamericana, española o estadounidense. La Ñ y las tildes tienen un taller independiente porque su método cambia según el equipo.</p>
          </div>
          <div class="panel">
            <h3>🎨 Recursos originales</h3>
            <p>Todos los personajes, escenarios, animaciones y sonidos son originales y se generan localmente. No se usan sprites, nombres, música ni recursos de Nintendo ni de otros juegos comerciales.</p>
          </div>
          <div class="panel">
            <h3>♿ Accesibilidad</h3>
            <p>Texto grande, alto contraste, reducción de movimiento, controles en pantalla, teclado virtual clicable y opción de silenciar audio. El juego no usa límites de tiempo obligatorios.</p>
          </div>
        </div>
        <div class="panel panel--light spread">
          <span class="small muted">Hecho con cariño para aprender sin miedo a equivocarse.</span>
          <button class="btn btn--primary btn--small" data-action="play-next">▶ Jugar ahora</button>
        </div>
      </section>
    `);
  }

  /* ───────────────────────── Acciones ───────────────────────── */

  handleAction(action, element) {
    const levelId = element?.dataset?.level;
    const world = Number(element?.dataset?.world);
    switch (action) {
      case 'title-start':
        this.audio.unlock();
        this.showMenu();
        break;
      case 'menu':
        this.audio.setWorld(1, 'menu');
        this.showMenu();
        break;
      case 'play-next':
        this.playNext();
        break;
      case 'continue':
        this.continueAdventure();
        break;
      case 'worlds':
        this.showWorldSelect();
        break;
      case 'open-world':
        this.showLevelSelect(world);
        break;
      case 'open-level':
        if (levelId) this.showIntro(levelId);
        break;
      case 'back-levels':
        this.showLevelSelect(world || this.currentWorld);
        break;
      case 'start-level':
        if (levelId) this.startGame(levelId);
        break;
      case 'pause':
        if (this.game.state === 'playing') this.game.pause();
        break;
      case 'resume':
        this.game.resume();
        break;
      case 'hint':
        this.game.useHint();
        break;
      case 'challenge-help':
        this.game.useHint();
        break;
      case 'paragraph-clear':
        this.game.clearParagraphInput();
        break;
      case 'paragraph-check':
        this.game.checkParagraph();
        break;
      case 'challenge-cancel':
        this.game.cancelChallenge();
        break;
      case 'restart-level':
        this.restartLevel();
        break;
      case 'exit-level':
        this.exitLevel();
        break;
      case 'settings-from-pause':
        this.showSettings(true);
        break;
      case 'back-settings':
        if (this.settingsFromPause) {
          this.settingsFromPause = false;
          this.closeModal();
          this.currentScreen = 'game';
          this.canvas.hidden = false;
          this.hud.hidden = false;
          this.showPause();
        } else {
          this.showMenu();
        }
        break;
      case 'setting-toggle': {
        const key = element.dataset.setting;
        if (!key) break;
        const next = !this.store.settings[key];
        this.store.updateSettings({ [key]: next });
        this.applyPreferences(this.store.settings);
        this.showSettings(this.settingsFromPause);
        if (key === 'sound') this.audio.sfx('click');
        break;
      }
      case 'set-mode': {
        const mode = element.dataset.mode;
        if (mode !== 'char' && mode !== 'position') break;
        this.store.updateSettings({ inputMode: mode });
        this.showSettings(this.settingsFromPause);
        this.toast(mode === 'position' ? 'Modo posición física activado.' : 'Modo carácter activado.', 'success');
        break;
      }
      case 'switch-profile': {
        const id = element.dataset.profile;
        if (id && this.store.setActiveProfile(id)) {
          this.applyPreferences(this.store.settings);
          this.toast(`Perfil cambiado a ${this.store.profile.alias}.`, 'success');
          this.showSettings(this.settingsFromPause);
        }
        break;
      }
      case 'progress':
        this.showProgress();
        break;
      case 'export-progress':
        this.exportProgress();
        break;
      case 'import-progress':
        document.getElementById('import-file')?.click();
        break;
      case 'reset-progress':
        this.confirmReset();
        break;
      case 'reset-cancel':
        this.closeModal();
        break;
      case 'reset-confirm':
        this.store.resetActiveProgress();
        this.closeModal();
        this.toast('Progreso reiniciado. ¡Empecemos otra vez!', 'success');
        this.showProgress();
        break;
      case 'practice':
        this.showPractice();
        break;
      case 'practice-next':
        if (this.practice) {
          this.practice.locked = false;
          this.nextPracticeTarget();
        }
        break;
      case 'workshop-insert':
        this.insertWorkshopChar(element.dataset.char || '');
        break;
      case 'settings':
        this.showSettings(false);
        break;
      case 'about':
        this.showAbout();
        break;
      case 'victory-repeat':
        if (levelId) this.startGame(levelId);
        break;
      case 'victory-next':
        if (levelId) this.showIntro(levelId);
        break;
      case 'victory-worlds':
        this.showWorldSelect();
        break;
      case 'victory-progress':
        this.showProgress();
        break;
      case 'tutorial-skip':
        // El listener específico del tutorial maneja esta acción.
        break;
      default:
        break;
    }
  }
}
