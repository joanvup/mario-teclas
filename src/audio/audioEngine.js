/**
 * Sonido 100 % sintetizado con Web Audio API. No usa archivos externos.
 * La música solo empieza después de la primera interacción del usuario.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.settings = { sound: true, music: true, volume: 0.7 };
    this.unlocked = false;
    this.timer = null;
    this.step = 0;
    this.world = 1;
    this.mood = 'menu';
    this.scale = [262, 294, 330, 392, 440, 523];
    this.tempo = 500;
    this.wave = 'triangle';
    this.melodyIndex = 0;
    this.enabled = typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);
  }

  async unlock() {
    if (!this.enabled) return;
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.settings.volume;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.55;
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        /* el navegador puede requerir otra interacción */
      }
    }
    this.unlocked = true;
    if (this.settings.music) this.startMusic();
  }

  applySettings(settings) {
    this.settings = { ...this.settings, ...settings };
    if (this.master) this.master.gain.value = this.settings.volume;
    if (this.musicGain) this.musicGain.gain.value = this.settings.music ? 0.22 : 0;
    if (this.sfxGain) this.sfxGain.gain.value = this.settings.sound ? 0.55 : 0;
    if (!this.settings.music) this.stopMusic();
    else if (this.unlocked) this.startMusic();
  }

  setWorld(world, mood = 'game') {
    this.world = world;
    this.mood = mood;
    this.step = 0;
    if (this.unlocked && this.settings.music) {
      this.stopMusic();
      this.startMusic();
    }
  }

  note(freq, duration = 0.18, type = 'triangle', gain = 0.2, when = 0, slideTo = null) {
    if (!this.ctx || !this.settings.sound) return;
    const t = when || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + duration);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  sfx(name) {
    if (!this.ctx || !this.settings.sound) return;
    switch (name) {
      case 'click':
        this.note(520, 0.07, 'sine', 0.15);
        break;
      case 'jump':
        this.note(330, 0.13, 'triangle', 0.22, 0, 660);
        break;
      case 'land':
        this.note(160, 0.08, 'sine', 0.12, 0, 110);
        break;
      case 'coin':
        this.note(880, 0.08, 'sine', 0.2);
        this.note(1320, 0.12, 'sine', 0.16, this.ctx.currentTime + 0.06);
        break;
      case 'correct':
        [523, 659, 784].forEach((f, i) =>
          this.note(f, 0.16, 'triangle', 0.2, this.ctx.currentTime + i * 0.07),
        );
        break;
      case 'wrong':
        this.note(220, 0.14, 'sine', 0.16, 0, 180);
        this.note(180, 0.16, 'sine', 0.12, this.ctx.currentTime + 0.1, 150);
        break;
      case 'unlock':
        [392, 523, 659, 880].forEach((f, i) =>
          this.note(f, 0.2, 'triangle', 0.2, this.ctx.currentTime + i * 0.08),
        );
        break;
      case 'bump':
        this.note(150, 0.12, 'square', 0.1, 0, 100);
        break;
      case 'fall':
        this.note(300, 0.35, 'sine', 0.14, 0, 120);
        break;
      case 'win':
        [523, 659, 784, 1047, 1319].forEach((f, i) =>
          this.note(f, 0.28, 'triangle', 0.22, this.ctx.currentTime + i * 0.12),
        );
        break;
      case 'checkpoint':
        this.note(660, 0.14, 'sine', 0.16);
        this.note(990, 0.18, 'sine', 0.14, this.ctx.currentTime + 0.1);
        break;
      case 'help':
        this.note(700, 0.1, 'sine', 0.14);
        this.note(900, 0.14, 'sine', 0.12, this.ctx.currentTime + 0.09);
        break;
      default:
        break;
    }
  }

  startMusic() {
    if (!this.ctx || !this.settings.music || this.timer) return;
    const play = () => {
      if (!this.ctx || !this.settings.music) return;
      const scale = this.mood === 'game' ? this.scale : [262, 330, 392, 523, 659];
      const tempo = this.mood === 'game' ? this.tempo : 620;
      const pattern = this.mood === 'game'
        ? [0, 2, 4, 2, 5, 4, 2, 1]
        : [0, 4, 2, 5, 3, 1, 4, 2];
      const note = scale[pattern[this.step % pattern.length] % scale.length];
      const t = this.ctx.currentTime;
      this.backgroundNote(note, tempo / 1000 * 0.85, this.wave, 0.06, t);
      if (this.step % 4 === 0) {
        this.backgroundNote(note / 2, tempo / 1000 * 1.4, 'sine', 0.045, t);
      }
      if (this.step % 8 === 6) {
        this.backgroundNote(note * 1.5, tempo / 1000 * 0.5, 'triangle', 0.035, t);
      }
      this.step += 1;
    };
    play();
    this.timer = setInterval(play, this.mood === 'game' ? this.tempo : 620);
  }

  backgroundNote(freq, duration, type, gain, when) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(gain, when + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(env);
    env.connect(this.musicGain);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
