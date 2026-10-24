import { APP, UI_TEXT, MOVEMENT } from '../config/appConfig.js';
import { buildLevel } from './levelBuilder.js';
import { LevelEvaluator } from '../education/evaluator.js';
import { renderGame } from './renderer.js';
import { makeTarget, matchesTarget, eventChar } from '../input/layouts.js';
import { paragraphStatus } from '../input/paragraph.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export class Game {
  constructor(canvas, { store, audio, keyboard, callbacks = {} }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = store;
    this.audio = audio;
    this.keyboard = keyboard;
    this.callbacks = callbacks;
    this.state = 'idle';
    this.level = null;
    this.def = null;
    this.player = null;
    this.camera = { x: 0, y: 0 };
    this.particles = [];
    this.coins = 0;
    this.hearts = APP.maxHearts;
    this.time = 0;
    this.lastTime = 0;
    this.accumulator = 0;
    this.running = false;
    this.raf = null;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.virtual = { left: false, right: false, jump: false };
    this.assistUntil = 0;
    this.activeGate = null;
    this.challengeFeedback = null;
    this.paragraphInput = '';
    this.paragraphFriendly = false;
    this.hudTimer = 0;
    this.portalCooldown = 0;
    this.confettiDone = false;
    this.victory = false;
    this.reducedMotion = false;
    this._loop = this._loop.bind(this);
    this._resize = this._resize.bind(this);
    this.keyboard.gameHandler = (action, event) => this._handleAction(action, event);
    this._resize();
    window.addEventListener('resize', this._resize);
  }

  get settings() {
    return this.store.settings;
  }

  _resize() {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(APP.logicalWidth * dpr);
    this.canvas.height = Math.round(APP.logicalHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  }

  start(def) {
    this.def = def;
    this.level = buildLevel(def);
    this.resetRuntime();
    this.audio.setWorld(def.world, 'game');
    this.state = 'playing';
    this.running = true;
    this.victory = false;
    this.keyboard.setEnabled(true);
    this.keyboard.challengeHandler = null;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.pushHud();
    if (!this.raf) this.raf = requestAnimationFrame(this._loop);
  }

  resetRuntime() {
    this.player = {
      x: this.level.spawn.x,
      y: this.level.spawn.y,
      w: 30,
      h: 48,
      vx: 0,
      vy: 0,
      onGround: false,
      coyote: 0,
      facing: 1,
      state: 'idle',
      walkPhase: 0,
      standingPlatform: null,
      invulnerableUntil: 0,
    };
    this.coins = 0;
    this.hearts = APP.maxHearts;
    this.time = 0;
    this.particles = [];
    this.camera = { x: 0, y: 0 };
    this.respawnPoint = { x: this.level.spawn.x, y: this.level.spawn.y };
    this.evaluator = new LevelEvaluator(this.level);
    this.assistUntil = 0;
    this.activeGate = null;
    this.challengeFeedback = null;
    this.paragraphInput = '';
    this.paragraphFriendly = false;
    this.portalCooldown = 0;
    this.confettiDone = false;
    this.victory = false;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.hudTimer = 0;
    this.virtual = { left: false, right: false, jump: false };
    this.level.gates.forEach((gate) => {
      gate.progress = 0;
      gate.completed = false;
      gate.cooldown = 0;
    });
    this.level.coins.forEach((coin) => {
      coin.collected = false;
    });
    this.level.checkpoints.forEach((cp) => {
      cp.active = false;
    });
    this.level.platforms.forEach((p) => {
      if (p.moving) {
        p.x = p.moving.baseX;
        p.y = p.moving.baseY;
      }
    });
  }

  restart() {
    if (!this.def) return;
    const def = this.def;
    this.start(def);
  }

  stop() {
    this.running = false;
    this.state = 'idle';
    this.keyboard.challengeHandler = null;
    this.keyboard.setEnabled(false);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.keyboard.clear();
    this.callbacks.onPauseChange?.(true);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.keyboard.clear();
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.callbacks.onPauseChange?.(false);
  }

  togglePause() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  _handleAction(action, event) {
    if (action === null || action === undefined) return;
    if (this.state === 'paused') {
      if (action === 'pause') this.resume();
      return;
    }
    if (this.state !== 'playing') return;
    if (action === 'pause') {
      this.pause();
      return;
    }
    if (action === 'hint') {
      this.useHint();
      return;
    }
    if (action === 'jump') {
      this.jumpBuffer = APP.physics.jumpBuffer;
    }
  }

  setVirtual(action, down) {
    if (!(action in this.virtual)) return;
    this.virtual[action] = down;
    if (down && action === 'jump') this.jumpBuffer = APP.physics.jumpBuffer;
    if (down && this.state === 'paused') return;
  }

  submitVirtualKey({ key, code }) {
    if (this.state !== 'challenge') return;
    if (key === '´') {
      this.callbacks.onToast?.('Ahora elige la vocal que quieres acentuar. 🙂', 'info');
      return;
    }
    let effectiveKey = key;
    const gate = this.activeGate;
    // En frases y párrafos el teclado virtual debe respetar la mayúscula,
    // la minúscula y la tilde que pide el texto, aunque la tecla se dibuje
    // en mayúsculas y sin tilde.
    if (gate?.paragraph && typeof key === 'string' && key.length === 1) {
      const status = paragraphStatus(this.paragraphInput, gate.paragraph);
      const plain = (value) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('es-CO');
      if (status.expected && plain(status.expected) === plain(key)) {
        effectiveKey = status.expected;
      }
    }
    this.handleChallengeKey({ key: effectiveKey, code, repeat: false, preventDefault() {} });
  }

  _loop(timestamp) {
    if (!this.running) {
      this.raf = null;
      return;
    }
    const delta = Math.min(0.1, Math.max(0, (timestamp - this.lastTime) / 1000));
    this.lastTime = timestamp;
    if (this.state === 'playing') {
      this.accumulator += delta;
      let steps = 0;
      while (this.accumulator >= APP.timestep && steps < 6) {
        this.step(APP.timestep);
        this.accumulator -= APP.timestep;
        steps += 1;
      }
    }
    this.render(timestamp);
    this.raf = requestAnimationFrame(this._loop);
  }

  step(dt) {
    if (this.state !== 'playing') return;
    this.time += dt;
    this._updateMovingPlatforms();
    this._updatePlayer(dt);
    this._checkCollectibles();
    this._checkGates();
    this._checkCheckpoints();
    this._checkObstacles();
    this._checkPortal();
    this._updateParticles(dt);
    this._updateCamera(dt);
    this.hudTimer += dt;
    if (this.hudTimer > 0.12) {
      this.hudTimer = 0;
      this.pushHud();
    }
    this.keyboard.consumeFrame();
  }

  _updateMovingPlatforms() {
    const player = this.player;
    for (const platform of this.level.platforms) {
      if (!platform.moving) continue;
      const { axis, baseX, baseY, range, speed, phase } = platform.moving;
      const offset = Math.sin(this.time * speed * 2 + phase) * range;
      const oldX = platform.x;
      const oldY = platform.y;
      platform.x = baseX + (axis === 'x' ? offset : 0);
      platform.y = baseY + (axis === 'y' ? offset : 0);
      if (player.onGround && player.standingPlatform === platform) {
        player.x += platform.x - oldX;
        player.y += platform.y - oldY;
      }
    }
  }

  _updatePlayer(dt) {
    const p = this.player;
    const input = this.keyboard;
    const left = input.isDown('left') || this.virtual.left;
    const right = input.isDown('right') || this.virtual.right;
    const jumpHeld = input.isDown('jump') || this.virtual.jump;
    const phys = APP.physics;

    if (left && !right) {
      p.vx -= phys.accel * (p.onGround ? 1 : phys.airControl) * dt;
      p.facing = -1;
    } else if (right && !left) {
      p.vx += phys.accel * (p.onGround ? 1 : phys.airControl) * dt;
      p.facing = 1;
    } else {
      const friction = phys.friction * (p.onGround ? 1 : 0.25) * dt;
      if (Math.abs(p.vx) <= friction) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * friction;
    }
    p.vx = clamp(p.vx, -phys.moveSpeed, phys.moveSpeed);

    // Salto con coyote time y buffer.
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      p.vy = -phys.jumpSpeed;
      p.onGround = false;
      p.standingPlatform = null;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.audio.sfx('jump');
      this._dust(p.x + p.w / 2, p.y + p.h, 6);
    }
    if (!jumpHeld && p.vy < -phys.jumpCut) {
      p.vy = -phys.jumpCut;
    }

    p.vy = Math.min(phys.maxFall, p.vy + phys.gravity * dt);
    const wasOnGround = p.onGround;
    p.onGround = false;
    p.standingPlatform = null;

    // Eje X
    p.x += p.vx * dt;
    for (const solid of this.level.platforms) {
      if (!this._overlaps(p, solid)) continue;
      if (p.vx > 0) p.x = solid.x - p.w;
      else if (p.vx < 0) p.x = solid.x + solid.w;
      p.vx = 0;
    }
    p.x = clamp(p.x, 0, this.level.width - p.w);

    // Eje Y
    p.y += p.vy * dt;
    for (const solid of this.level.platforms) {
      if (!this._overlaps(p, solid)) continue;
      if (p.vy > 0) {
        p.y = solid.y - p.h;
        p.vy = 0;
        p.onGround = true;
        p.standingPlatform = solid;
      } else if (p.vy < 0) {
        p.y = solid.y + solid.h;
        p.vy = 0;
      }
    }

    if (p.onGround) {
      this.coyote = phys.coyoteTime;
      if (!wasOnGround) {
        this.audio.sfx('land');
        this._dust(p.x + p.w / 2, p.y + p.h, 5);
      }
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
    }

    // Animación
    if (p.onGround) {
      if (Math.abs(p.vx) > 12) {
        p.state = 'walk';
        p.walkPhase += dt * (Math.abs(p.vx) / 110);
      } else {
        p.state = 'idle';
      }
    } else {
      p.state = p.vy < 0 ? 'jump' : 'fall';
    }
    if (p.invulnerableUntil > performance.now()) {
      if (Math.abs(p.vx) > 120) p.state = 'hurt';
    }

    if (p.y > 700) {
      this._respawn('fall');
    }
  }

  _overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  _circleRect(cx, cy, radius, rect) {
    const nx = clamp(cx, rect.x, rect.x + rect.w);
    const ny = clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy <= radius * radius;
  }

  _respawn(reason = 'fall', loseHeart = true) {
    const p = this.player;
    this.evaluator.recordFall();
    if (loseHeart) this.hearts = Math.max(0, this.hearts - 1);
    if (this.hearts <= 0) this.hearts = APP.maxHearts;
    p.x = this.respawnPoint.x;
    p.y = this.respawnPoint.y;
    p.vx = 0;
    p.vy = 0;
    p.onGround = false;
    p.standingPlatform = null;
    p.invulnerableUntil = performance.now() + 1200;
    this.camera.x = clamp(p.x - 340, 0, Math.max(0, this.level.width - 960));
    this.audio.sfx('fall');
    this.callbacks.onToast?.(reason === 'fall' ? UI_TEXT.fall : '¡Sigue adelante! Regresaste al banderín.', 'info');
    this.pushHud();
  }

  _checkCollectibles() {
    const p = this.player;
    for (const coin of this.level.coins) {
      if (coin.collected) continue;
      if (this._circleRect(coin.x, coin.y, 22, p)) {
        coin.collected = true;
        this.coins += 1;
        this.audio.sfx('coin');
        this._burst(coin.x, coin.y, '#ffd23f', 10);
        this.pushHud();
      }
    }
  }

  nextPendingGate() {
    if (!this.level) return null;
    return this.level.gates.find((g) => !g.completed) || null;
  }

  _checkGates() {
    if (this.state !== 'playing') return;
    const p = this.player;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    for (const gate of this.level.gates) {
      if (gate.completed) continue;
      if (gate.cooldown && this.time < gate.cooldown) continue;
      const dist = Math.hypot(cx - gate.x, cy - gate.y);
      if (dist < 48) {
        this.openChallenge(gate);
        return;
      }
    }
  }

  _checkCheckpoints() {
    const p = this.player;
    for (const cp of this.level.checkpoints) {
      if (cp.active) continue;
      if (this._circleRect(cp.x, cp.y + 40, 36, p)) {
        cp.active = true;
        this.hearts = APP.maxHearts;
        const platform = this.level.platforms[cp.index];
        this.respawnPoint = {
          x: cp.x,
          y: platform ? platform.y - p.h - 2 : cp.y,
        };
        this.audio.sfx('checkpoint');
        this.callbacks.onToast?.('¡Banderín activado! Corazones recuperados.', 'success');
        this._burst(cp.x, cp.y + 20, '#ffd23f', 12);
        this.pushHud();
      }
    }
  }

  _checkObstacles() {
    const p = this.player;
    if (p.invulnerableUntil > performance.now()) return;
    for (const obs of this.level.obstacles) {
      if (this._overlaps(p, obs)) {
        this.evaluator.recordBump();
        this.hearts = Math.max(0, this.hearts - 1);
        p.invulnerableUntil = performance.now() + 1500;
        p.vx = p.x + p.w / 2 < obs.x + obs.w / 2 ? -280 : 280;
        p.vy = -330;
        p.onGround = false;
        this.audio.sfx('bump');
        this._burst(p.x + p.w / 2, p.y + p.h / 2, '#ff7b7b', 8);
        this.callbacks.onToast?.(UI_TEXT.bump, 'warn');
        if (this.hearts <= 0) {
          this._respawn('bump', false);
        }
        this.pushHud();
        return;
      }
    }
  }

  _checkPortal() {
    const portal = this.level.portal;
    if (!this._overlaps(this.player, portal)) return;
    if (this.time < this.portalCooldown) return;
    if (this.objectivesComplete()) {
      this._win();
    } else {
      this.portalCooldown = this.time + 2.4;
      const remainingGates = this.level.gates.filter((g) => !g.completed).length;
      const remainingCoins = Math.max(0, this.level.requiredCoins - this.coins);
      let message = UI_TEXT.lockedPortal;
      if (remainingGates > 0) message = `Faltan ${remainingGates} tecla${remainingGates === 1 ? '' : 's'} mágica${remainingGates === 1 ? '' : 's'}.`;
      else if (remainingCoins > 0) message = `Faltan ${remainingCoins} moneda${remainingCoins === 1 ? '' : 's'}.`;
      this.callbacks.onToast?.(message, 'info');
      this.audio.sfx('wrong');
    }
  }

  objectivesComplete() {
    if (!this.level) return false;
    const gates = this.level.gates.every((g) => g.completed);
    return gates && this.coins >= this.level.requiredCoins;
  }

  openChallenge(gate) {
    if (this.state !== 'playing') return;
    this.activeGate = gate;
    this.state = 'challenge';
    this.challengeFeedback = null;
    this.challengeWrongStreak = 0;
    this.paragraphInput = '';
    this.paragraphFriendly = false;
    this.keyboard.challengeHandler = (event) => this.handleChallengeKey(event);
    this.keyboard.clear();
    this.audio.sfx('help');
    this.callbacks.onChallengeOpen?.(this.getChallengeState());
  }

  getChallengeState() {
    const gate = this.activeGate;
    if (!gate) return null;
    const paragraph = gate.paragraph
      ? paragraphStatus(this.paragraphInput, gate.paragraph)
      : null;
    const target = paragraph ? null : makeTarget(gate.keys[gate.progress]);
    return {
      gate,
      target,
      paragraph,
      mode: paragraph ? 'paragraph' : 'keys',
      progress: paragraph ? paragraph.prefix : gate.progress,
      total: paragraph ? paragraph.total : gate.keys.length,
      word: gate.word,
      label: gate.label,
      keys: paragraph ? [] : gate.keys.map((k) => makeTarget(k)),
      feedback: this.challengeFeedback,
      inputMode: this.settings.inputMode,
      layout: this.settings.layout,
      helps: this.evaluator.helps,
      levelName: this.level.name,
      world: this.level.world,
      distractor: Boolean(gate.distractors),
      gateIndex: this.level.gates.indexOf(gate) + 1,
      gateTotal: this.level.gates.length,
    };
  }

  handleChallengeKey(event) {
    if (this.state !== 'challenge' || !this.activeGate) return;
    if (event.code === 'Escape') {
      this.cancelChallenge();
      return;
    }
    const gate = this.activeGate;
    if (gate.paragraph) {
      this.handleParagraphKey(event);
      return;
    }
    if (event.code === 'KeyH') {
      this.useHint();
      return;
    }
    if (['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'Tab', 'CapsLock'].includes(event.code)) {
      return;
    }
    const target = makeTarget(gate.keys[gate.progress]);
    const ok = matchesTarget(event, target, this.settings.inputMode);
    if (ok) {
      gate.progress += 1;
      this.evaluator.recordCorrect(target);
      this.challengeFeedback = { type: 'correct', expected: target.display, pressed: eventChar(event) };
      this.audio.sfx('click');
      if (gate.progress >= gate.keys.length) {
        this.completeActiveGate();
      } else {
        this.callbacks.onChallengeUpdate?.(this.getChallengeState());
      }
    } else {
      const pressed = eventChar(event);
      this.evaluator.recordWrong(target, pressed);
      this.store.recordWrongKey(target.display);
      this.challengeWrongStreak = (this.challengeWrongStreak || 0) + 1;
      this.challengeFeedback = {
        type: 'wrong',
        expected: target.display,
        pressed,
        showHint: this.challengeWrongStreak >= 2,
      };
      this.audio.sfx('wrong');
      if (this.challengeWrongStreak >= 2) {
        this.assistUntil = performance.now() + 12000;
        this.evaluator.recordHelp();
      }
      this.callbacks.onChallengeUpdate?.(this.getChallengeState());
    }
  }

  /** Entrada del reto de frases y párrafos. */
  handleParagraphKey(event) {
    const gate = this.activeGate;
    if (!gate?.paragraph) return;
    if (event.code === 'F1') {
      this.useHint();
      return;
    }
    if (event.code === 'Backspace') {
      const chars = Array.from(this.paragraphInput);
      chars.pop();
      this.paragraphInput = chars.join('');
      this.challengeFeedback = null;
      this.callbacks.onChallengeUpdate?.(this.getChallengeState());
      return;
    }
    if (event.code === 'Enter') {
      this.checkParagraph();
      return;
    }
    if (
      !event.key ||
      event.key === 'Dead' ||
      event.key === 'Unidentified' ||
      event.key.length !== 1 ||
      event.code === 'Tab' ||
      event.code === 'CapsLock' ||
      event.code === 'Insert' ||
      event.code === 'Delete' ||
      event.code === 'Home' ||
      event.code === 'End' ||
      event.code === 'PageUp' ||
      event.code === 'PageDown' ||
      (event.code || '').startsWith('Arrow') ||
      (event.code || '').startsWith('Shift') ||
      (event.code || '').startsWith('Control') ||
      (event.code || '').startsWith('Alt') ||
      (event.code || '').startsWith('Meta') ||
      /^F\d{1,2}$/.test(event.code || '')
    ) {
      return;
    }
    const statusBefore = paragraphStatus(this.paragraphInput, gate.paragraph);
    const maxLength = statusBefore.total + 8;
    const nextInput = Array.from(`${this.paragraphInput}${event.key}`).slice(0, maxLength).join('');
    this.paragraphInput = nextInput;
    const status = paragraphStatus(this.paragraphInput, gate.paragraph);
    if (status.completed) {
      this.paragraphFriendly = !status.exact;
      this.challengeFeedback = {
        type: 'correct',
        expected: '✓',
        friendly: !status.exact,
      };
      this.audio.sfx('click');
      this.completeActiveGate();
      return;
    }
    if (status.mismatch) {
      const expectedKey = status.expected === ' ' ? 'ESPACIO' : status.expected ?? '?';
      this.evaluator.recordWrong({ display: expectedKey }, status.mismatch);
      this.store.recordWrongKey(expectedKey);
      this.challengeFeedback = {
        type: 'paragraph-typo',
        expected: status.expected,
        pressed: status.mismatch,
      };
      this.audio.sfx('wrong');
    } else if (event.key === ' ') {
      this.audio.sfx('click');
      this.challengeFeedback = null;
    } else {
      this.audio.sfx('click');
      this.challengeFeedback = null;
    }
    this.callbacks.onChallengeUpdate?.(this.getChallengeState());
  }

  clearParagraphInput() {
    if (this.state !== 'challenge' || !this.activeGate?.paragraph) return;
    this.paragraphInput = '';
    this.challengeFeedback = null;
    this.callbacks.onChallengeUpdate?.(this.getChallengeState());
  }

  checkParagraph() {
    const gate = this.activeGate;
    if (this.state !== 'challenge' || !gate?.paragraph) return;
    const status = paragraphStatus(this.paragraphInput, gate.paragraph);
    if (status.completed) {
      this.paragraphFriendly = !status.exact;
      this.completeActiveGate();
      return;
    }
    this.challengeFeedback = {
      type: 'paragraph-pending',
      expected: status.expected,
      pressed: status.mismatch,
    };
    this.audio.sfx('wrong');
    this.callbacks.onChallengeUpdate?.(this.getChallengeState());
  }

  completeActiveGate() {
    const gate = this.activeGate;
    if (!gate) return;
    const isParagraph = Boolean(gate.paragraph);
    const friendly = this.paragraphFriendly;
    gate.completed = true;
    gate.progress = gate.keys.length;
    if (isParagraph) {
      this.evaluator.recordCorrect({ display: 'FRASE' });
    }
    this.evaluator.completeGate();
    this._burst(gate.x, gate.y, '#b5ff8a', 18);
    this.audio.sfx('unlock');
    this.state = 'playing';
    this.keyboard.challengeHandler = null;
    this.activeGate = null;
    this.challengeFeedback = null;
    this.paragraphInput = '';
    this.paragraphFriendly = false;
    this.keyboard.clear();
    this.callbacks.onChallengeClose?.({ completed: true, gate });
    if (isParagraph) {
      this.callbacks.onToast?.(
        friendly
          ? '¡Frase completada! Recuerda practicar las tildes y la Ñ cuando puedas. ✍️'
          : '¡Frase completada con mayúsculas, tildes y punto! ✍️',
        'success',
      );
    } else {
      this.callbacks.onToast?.('¡Tecla mágica recuperada! ⭐', 'success');
    }
    this.pushHud();
    if (this.level.gates.every((g) => g.completed)) {
      this.callbacks.onToast?.('¡Todas las teclas listas! Busca el portal.', 'success');
    }
  }

  cancelChallenge() {
    if (this.state !== 'challenge') return;
    const gate = this.activeGate;
    if (gate) gate.cooldown = this.time + 2.5;
    this.state = 'playing';
    this.keyboard.challengeHandler = null;
    this.activeGate = null;
    this.challengeFeedback = null;
    this.paragraphInput = '';
    this.paragraphFriendly = false;
    this.keyboard.clear();
    this.callbacks.onChallengeClose?.({ completed: false });
  }

  useHint() {
    if (this.state !== 'playing' && this.state !== 'challenge') return;
    this.evaluator.recordHelp();
    this.assistUntil = performance.now() + 12000;
    this.audio.sfx('help');
    if (this.state === 'challenge' && this.activeGate) {
      const gate = this.activeGate;
      if (gate.paragraph) {
        const status = paragraphStatus(this.paragraphInput, gate.paragraph);
        const expected = status.expected;
        this.challengeFeedback = {
          type: 'hint',
          expected,
          paragraphHint: true,
          showHint: true,
        };
        this.callbacks.onChallengeUpdate?.(this.getChallengeState());
        const hint = expected === ' '
          ? 'La próxima tecla es ESPACIO.'
          : expected
            ? `La próxima letra es “${expected}”.`
            : 'Vas muy bien. Revisa el final de la frase.';
        this.callbacks.onToast?.(hint, 'info');
      } else {
        const target = makeTarget(gate.keys[gate.progress]);
        this.challengeFeedback = {
          type: 'hint',
          expected: target.display,
          showHint: true,
        };
        this.callbacks.onChallengeUpdate?.(this.getChallengeState());
        this.callbacks.onToast?.(`Mira la tecla ${target.display} en el teclado iluminado.`, 'info');
      }
    } else {
      const gate = this.nextPendingGate();
      if (gate?.paragraph) {
        this.callbacks.onToast?.('La próxima burbuja pide escribir una frase completa.', 'info');
      } else if (gate) {
        const target = makeTarget(gate.keys[gate.progress]);
        this.callbacks.onToast?.(`La próxima tecla es ${target.display}. ¡Busca la burbuja!`, 'info');
      } else {
        this.callbacks.onToast?.('¡Ya tienes todas las teclas! Corre al portal brillante.', 'success');
      }
    }
    this.pushHud();
  }

  _win() {
    if (this.victory) return;
    this.victory = true;
    this.state = 'victory';
    this.keyboard.challengeHandler = null;
    const summary = this.evaluator.finish({
      coins: this.coins,
      requiredCoins: this.level.requiredCoins,
    });
    summary.levelName = this.level.name;
    summary.world = this.level.world;
    summary.totalCoins = this.level.totalCoins;
    summary.coinsCollected = this.coins;
    this.audio.sfx('win');
    this._celebrate();
    this.callbacks.onVictory?.(summary);
  }

  _celebrate() {
    for (let i = 0; i < 70; i += 1) {
      const colors = ['#ffd23f', '#ff6b9d', '#7bffe0', '#b28dff', '#fff4b0'];
      this.particles.push({
        x: this.player.x + 15 + (Math.random() - 0.5) * 200,
        y: this.player.y - Math.random() * 120,
        vx: (Math.random() - 0.5) * 320,
        vy: -Math.random() * 340 - 80,
        life: 1.8 + Math.random() * 1.4,
        maxLife: 3.2,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: 'rect',
        rotation: Math.random() * Math.PI,
        gravity: 420,
      });
    }
  }

  _burst(x, y, color, count = 10) {
    if (this.settings.reducedMotion) count = Math.ceil(count / 2);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.5 + Math.random() * 0.6,
        maxLife: 1.1,
        size: 2 + Math.random() * 3,
        color,
        shape: Math.random() > 0.6 ? 'rect' : 'circle',
        rotation: Math.random() * Math.PI,
        gravity: 260,
      });
    }
  }

  _dust(x, y, count = 5) {
    if (this.settings.reducedMotion) return;
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y - 2,
        vx: (Math.random() - 0.5) * 80,
        vy: -Math.random() * 70,
        life: 0.35,
        maxLife: 0.35,
        size: 2 + Math.random() * 3,
        color: 'rgba(255,255,255,0.7)',
        shape: 'circle',
        rotation: 0,
        gravity: 160,
      });
    }
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += (p.gravity || 300) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += dt * 4;
    }
  }

  _updateCamera(dt) {
    const target = clamp(this.player.x + this.player.w / 2 - 340, 0, Math.max(0, this.level.width - 960));
    const factor = 1 - Math.pow(0.0015, dt);
    this.camera.x += (target - this.camera.x) * factor;
  }

  pushHud() {
    if (!this.level) return;
    const gate = this.nextPendingGate();
    const target = gate && !gate.paragraph ? makeTarget(gate.keys[gate.progress]) : null;
    const phase = this.level.phases > 1
      ? clamp(Math.floor((this.player.x / Math.max(1, this.level.width - 200)) * this.level.phases) + 1, 1, this.level.phases)
      : 1;
    this.callbacks.onHud?.({
      levelId: this.level.id,
      world: this.level.world,
      worldName: this.level.worldData.short,
      name: this.level.name,
      skill: this.level.skill,
      hearts: this.hearts,
      maxHearts: APP.maxHearts,
      coins: this.coins,
      requiredCoins: this.level.requiredCoins,
      totalCoins: this.level.totalCoins,
      gatesCompleted: this.level.gates.filter((g) => g.completed).length,
      totalGates: this.level.gates.length,
      nextKey: gate?.paragraph ? '✍️' : target?.display || null,
      nextLabel: gate ? gate.label : 'Portal',
      accuracy: this.evaluator?.accuracy ?? null,
      phase,
      totalPhases: this.level.phases,
      paused: this.state === 'paused',
      assist: this.assistUntil > performance.now(),
      timeMs: Math.round((this.evaluator?.elapsedMs) || 0),
    });
  }

  render(timestamp) {
    if (!this.level) return;
    const time = timestamp || performance.now();
    renderGame(this.ctx, this, time);
  }

  /** Utilidades exclusivas de pruebas automatizadas. */
  _testCompleteGate() {
    if (this.state === 'challenge' && this.activeGate) {
      this.completeActiveGate();
    }
  }

  _testFinish() {
    if (!this.level) return;
    this.level.gates.forEach((g) => {
      if (!g.completed) {
        g.completed = true;
        this.evaluator.completeGate();
      }
    });
    this.coins = Math.max(this.level.requiredCoins, this.coins);
    this._win();
  }
}

export { MOVEMENT };
