import { MOVEMENT, APP } from '../config/appConfig.js';

/**
 * Entrada central. Separa posición física (event.code) de carácter (event.key),
 * ignora repeticiones en objetivos y no interferiere con campos de texto.
 */
export class KeyboardManager {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    this.released = new Set();
    this.active = false;
    this.typing = false;
    this.challengeHandler = null;
    this.gameHandler = null;
    this.anyHandler = null;
    this.lastEvent = null;
    this.deadKeySeen = false;
    this.onDeadKey = null;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  setEnabled(value) {
    this.active = value;
    if (!value) this.clear();
  }

  isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
  }

  isGameKey(code) {
    return (
      MOVEMENT.left.codes.includes(code) ||
      MOVEMENT.right.codes.includes(code) ||
      MOVEMENT.jump.codes.includes(code) ||
      code === 'ArrowDown' ||
      code === 'Escape' ||
      code === 'KeyP' ||
      code === 'KeyH'
    );
  }

  actionFor(code) {
    if (MOVEMENT.left.codes.includes(code)) return 'left';
    if (MOVEMENT.right.codes.includes(code)) return 'right';
    if (MOVEMENT.jump.codes.includes(code)) return 'jump';
    return null;
  }

  _onKeyDown(event) {
    const typing = this.isTypingTarget(event.target);
    this.typing = typing;
    if (event.key === 'Dead') {
      this.deadKeySeen = true;
      if (this.onDeadKey) this.onDeadKey(event);
      return;
    }
    if (typing) {
      if (this.anyHandler) this.anyHandler(event);
      return;
    }
    if (!this.active) return;
    if (this.isGameKey(event.code) || event.key === ' ') {
      if (event.code !== 'F5' && event.code !== 'F12') event.preventDefault();
    }
    if (this.challengeHandler && (event.code === 'Enter' || event.code === 'Backspace')) {
      event.preventDefault();
    }
    if (event.repeat) return;
    this.keys.add(event.code);
    this.justPressed.add(event.code);
    this.lastEvent = event;
    if (this.challengeHandler) {
      this.challengeHandler(event);
      return;
    }
    const action = this.actionFor(event.code);
    if (action) {
      // Evita que flechas y espacio desplacen la página.
      event.preventDefault();
    }
    if (this.gameHandler) this.gameHandler(action, event);
    if (event.code === 'Escape' || event.code === 'KeyP') {
      if (this.gameHandler) this.gameHandler('pause', event);
    }
    if (event.code === 'KeyH') {
      if (this.gameHandler) this.gameHandler('hint', event);
    }
  }

  _onKeyUp(event) {
    this.keys.delete(event.code);
    this.released.add(event.code);
    if (this.typing) return;
  }

  _onBlur() {
    this.clear();
  }

  clear() {
    this.keys.clear();
    this.justPressed.clear();
    this.released.clear();
  }

  isDown(action) {
    const codes = MOVEMENT[action]?.codes || [];
    return codes.some((c) => this.keys.has(c));
  }

  pressed(action) {
    const codes = MOVEMENT[action]?.codes || [];
    return codes.some((c) => this.justPressed.has(c));
  }

  consumeFrame() {
    this.justPressed.clear();
    this.released.clear();
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }
}

export const movementInfo = MOVEMENT;
export const jumpKeyLabel = APP.jumpLabel || 'ESPACIO';
