import { drawBackground, drawForeground, roundRect } from './backgrounds.js';
import { makeTarget } from '../input/layouts.js';

const TILO = {
  fur: '#ff9f43',
  furDark: '#e07b28',
  cream: '#fff1cf',
  dark: '#46281b',
  scarf: '#2fbfa8',
  scarfDark: '#1b9482',
  blush: '#ff8f9e',
};

export function renderGame(ctx, game, time) {
  const { level, camera } = game;
  const world = level.worldData;
  const reduced = game.settings.reducedMotion;
  drawBackground(ctx, world, camera.x, time, 960, 540, reduced);

  ctx.save();
  ctx.translate(-Math.round(camera.x), 0);

  drawCheckpoints(ctx, game, time);
  drawPlatforms(ctx, game, time);
  drawPortal(ctx, game, time);
  drawGates(ctx, game, time);
  drawCoins(ctx, game, time);
  drawObstacles(ctx, game, time);
  drawParticles(ctx, game);
  drawPlayer(ctx, game, time);
  drawFloatingHints(ctx, game, time);

  ctx.restore();
  drawForeground(ctx, world, camera.x, time);

  if (game.assistUntil > performance.now()) {
    drawAssistBanner(ctx, game);
  }
}

function visible(x, w, camera, margin = 100) {
  return x + w > camera.x - margin && x < camera.x + 960 + margin;
}

function drawPlatforms(ctx, game, time) {
  const world = game.level.worldData;
  const p = world.palette;
  for (const platform of game.level.platforms) {
    if (!visible(platform.x, platform.w, game.camera)) continue;
    const { x, y, w, h } = platform;
    // sombra
    ctx.fillStyle = 'rgba(20, 16, 38, 0.18)';
    roundRect(ctx, x + 5, y + 7, w, h, 12);
    ctx.fill();
    // cuerpo
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, p.platform);
    grad.addColorStop(1, shade(p.platform, -24));
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    // borde superior
    ctx.fillStyle = p.platformTop;
    roundRect(ctx, x, y, w, 9, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    roundRect(ctx, x + 6, y + 2, Math.max(10, w - 12), 3, 2);
    ctx.fill();
    // detalles según mundo
    if (world.bg === 'meadow' || world.bg === 'forest') {
      for (let gx = x + 12; gx < x + w - 8; gx += 28) {
        ctx.fillStyle = p.platformTop;
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx + 4, y - 7);
        ctx.lineTo(gx + 8, y);
        ctx.closePath();
        ctx.fill();
      }
    } else if (world.bg === 'mountain') {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      roundRect(ctx, x + 2, y - 4, w - 4, 8, 4);
      ctx.fill();
    } else if (world.bg === 'desert') {
      ctx.fillStyle = 'rgba(255,240,180,0.35)';
      for (let gx = x + 18; gx < x + w - 10; gx += 44) {
        ctx.beginPath();
        ctx.arc(gx, y + 14, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (world.bg === 'cavern') {
      ctx.strokeStyle = 'rgba(116,255,226,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 18);
      ctx.lineTo(x + w - 12, y + 18);
      ctx.stroke();
    } else if (world.bg === 'castle' || world.bg === 'kingdom') {
      ctx.fillStyle = 'rgba(255,220,120,0.35)';
      for (let gx = x + 24; gx < x + w - 10; gx += 56) {
        ctx.beginPath();
        ctx.arc(gx, y + 22, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (world.bg === 'city') {
      ctx.fillStyle = 'rgba(255,235,160,0.5)';
      for (let gx = x + 20; gx < x + w - 12; gx += 40) {
        ctx.fillRect(gx, y + 16, 6, 7);
      }
    } else if (world.bg === 'library') {
      ctx.fillStyle = 'rgba(255,220,150,0.4)';
      for (let gx = x + 18; gx < x + w - 12; gx += 30) {
        ctx.fillRect(gx, y + 14, 8, 10);
      }
    } else if (world.bg === 'island') {
      ctx.fillStyle = 'rgba(255,240,180,0.55)';
      for (let gx = x + 22; gx < x + w - 10; gx += 46) {
        ctx.beginPath();
        ctx.arc(gx, y + 18, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (world.bg === 'palace') {
      ctx.fillStyle = 'rgba(255,224,120,0.45)';
      for (let gx = x + 26; gx < x + w - 10; gx += 52) {
        ctx.beginPath();
        ctx.moveTo(gx, y + 14);
        ctx.lineTo(gx + 6, y + 20);
        ctx.lineTo(gx, y + 27);
        ctx.lineTo(gx - 6, y + 20);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (platform.moving) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const cx = x + w / 2;
      ctx.beginPath();
      ctx.moveTo(cx - 9, y - 13);
      ctx.lineTo(cx + 9, y - 13);
      ctx.lineTo(cx, y - 6);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawCoins(ctx, game, time) {
  for (const coin of game.level.coins) {
    if (coin.collected || !visible(coin.x - 20, 40, game.camera)) continue;
    const bob = Math.sin(time * 0.004 + coin.spin) * 4;
    const scaleX = Math.abs(Math.cos(time * 0.004 + coin.spin)) * 0.7 + 0.3;
    ctx.save();
    ctx.translate(coin.x, coin.y + bob);
    ctx.scale(scaleX, 1);
    ctx.fillStyle = 'rgba(255,210,63,0.24)';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b87b12';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#a86b08';
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', 0, 1);
    ctx.restore();
  }
}

function drawGates(ctx, game, time) {
  for (const gate of game.level.gates) {
    if (!visible(gate.x - 50, 100, game.camera)) continue;
    const bob = Math.sin(time * 0.003 + gate.pulse) * 5;
    const x = gate.x;
    const y = gate.y + bob;
    const completed = gate.completed;
    const isParagraph = Boolean(gate.paragraph);
    const target = !completed && !isParagraph ? makeTarget(gate.keys[gate.progress]) : null;
    ctx.save();
    ctx.translate(x, y);
    if (!completed) {
      const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 46);
      glow.addColorStop(0, 'rgba(255,247,177,0.5)');
      glow.addColorStop(1, 'rgba(255,247,177,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 29 + Math.sin(time * 0.005 + gate.pulse) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = completed ? 'rgba(58, 196, 125, 0.92)' : 'rgba(42, 30, 92, 0.88)';
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = completed ? '#c9ffdf' : '#fff1a8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (completed) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
      ctx.fillText('✓', 0, 2);
    } else if (isParagraph) {
      ctx.fillStyle = '#fff8dc';
      ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
      ctx.fillText('✍', 0, 2);
      ctx.fillStyle = 'rgba(12, 8, 32, 0.78)';
      const text = gate.paragraph.length > 60 ? 'PÁRRAFO' : 'FRASE';
      ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
      const width = ctx.measureText(text).width + 18;
      roundRect(ctx, -width / 2, -48, width, 21, 10);
      ctx.fill();
      ctx.fillStyle = '#fff8dc';
      ctx.fillText(text, 0, -37);
    } else {
      ctx.fillStyle = '#fff8dc';
      const label = target?.display || '?';
      let size = 26;
      ctx.font = `bold ${size}px "Trebuchet MS", sans-serif`;
      const measured = ctx.measureText(label).width;
      // Las teclas con nombre largo (ESPACIO, RETROCESO) se reducen para no
      // salirse de la burbuja; el aviso flotante y el reto muestran el nombre completo.
      if (measured > 42) {
        size = Math.max(8, Math.floor((size * 42) / measured));
        ctx.font = `bold ${size}px "Trebuchet MS", sans-serif`;
      }
      ctx.fillText(label, 0, 2);
      if (gate.keys.length > 1) {
        ctx.fillStyle = 'rgba(12, 8, 32, 0.78)';
        const text = gate.word || gate.keys.map((k) => makeTarget(k).display).join('+');
        ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
        const width = ctx.measureText(text).width + 16;
        roundRect(ctx, -width / 2, -48, width, 21, 10);
        ctx.fill();
        ctx.fillStyle = '#fff8dc';
        ctx.fillText(text, 0, -37);
      }
    }
    ctx.restore();
  }
}

function drawPortal(ctx, game, time) {
  const portal = game.level.portal;
  if (!visible(portal.x - 50, portal.w + 100, game.camera)) return;
  const cx = portal.x + portal.w / 2;
  const base = portal.y + portal.h;
  const unlocked = game.objectivesComplete();
  const t = time * 0.002;
  ctx.save();
  ctx.translate(cx, base);
  // resplandor
  const glow = ctx.createRadialGradient(0, -60, 10, 0, -60, 110);
  glow.addColorStop(0, unlocked ? 'rgba(255,236,140,0.6)' : 'rgba(150,140,210,0.28)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-120, -190, 240, 220);
  // arco
  ctx.strokeStyle = unlocked ? '#ffe066' : '#8a80b5';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(0, -64, 34, 62, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = unlocked ? 'rgba(255,255,255,0.9)' : 'rgba(210,205,245,0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, -64, 26, 53, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  // interior
  const fill = ctx.createLinearGradient(0, -120, 0, -6);
  fill.addColorStop(0, unlocked ? '#7bffe0' : '#4c4670');
  fill.addColorStop(1, unlocked ? '#ffe066' : '#2c2848');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(0, -64, 26, 60, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(26, -6);
  ctx.lineTo(-26, -6);
  ctx.closePath();
  ctx.fill();
  if (unlocked) {
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 5; i += 1) {
      const angle = t + i * 1.3;
      ctx.fillStyle = '#fff8c2';
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 20, -64 + Math.sin(angle) * 44, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,240,160,0.9)';
    ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', 0, -64);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', 0, -60);
  }
  ctx.restore();
}

function drawCheckpoints(ctx, game, time) {
  for (const cp of game.level.checkpoints) {
    if (!visible(cp.x - 40, 80, game.camera)) continue;
    const active = cp.active;
    const wave = Math.sin(time * 0.004) * 4;
    ctx.strokeStyle = '#fff3d0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cp.x, cp.y + 86);
    ctx.lineTo(cp.x, cp.y);
    ctx.stroke();
    ctx.fillStyle = active ? '#ffd23f' : 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(cp.x + 2, cp.y + 2);
    ctx.quadraticCurveTo(cp.x + 42, cp.y + 10 + wave, cp.x + 2, cp.y + 34);
    ctx.closePath();
    ctx.fill();
    if (active) {
      ctx.fillStyle = 'rgba(255,240,160,0.5)';
      ctx.beginPath();
      ctx.arc(cp.x, cp.y + 12, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawObstacles(ctx, game, time) {
  for (const obs of game.level.obstacles) {
    if (!visible(obs.x - 20, 70, game.camera)) continue;
    const bob = Math.sin(time * 0.003 + obs.phase) * 2;
    ctx.save();
    ctx.translate(obs.x + obs.w / 2, obs.y + obs.h / 2 + bob);
    if (obs.kind === 'murcielago') {
      const flap = Math.sin(time * 0.015 + obs.phase) * 0.5;
      ctx.fillStyle = '#4a3a72';
      ctx.beginPath();
      ctx.ellipse(-16, 0, 16, 9, flap, 0, Math.PI * 2);
      ctx.ellipse(16, 0, 16, 9, -flap, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8f7ac4';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-4, -2, 2.6, 0, Math.PI * 2);
      ctx.arc(4, -2, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a2440';
      ctx.beginPath();
      ctx.arc(-4, -2, 1.2, 0, Math.PI * 2);
      ctx.arc(4, -2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (obs.kind === 'cristal') {
      ctx.fillStyle = 'rgba(178,141,255,0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b28dff';
      ctx.beginPath();
      ctx.moveTo(-12, 14);
      ctx.lineTo(-6, -16);
      ctx.lineTo(4, -6);
      ctx.lineTo(12, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-3, 2, 2, 0, Math.PI * 2);
      ctx.arc(4, 2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // babosa amistosa
      const squash = 1 + Math.sin(time * 0.006 + obs.phase) * 0.05;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 16, 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = obs.kind === 'babosa' ? '#9be36d' : '#ffb347';
      ctx.beginPath();
      ctx.ellipse(0, 0, 19, 15 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-6, -4, 4, 0, Math.PI * 2);
      ctx.arc(6, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#24351d';
      ctx.beginPath();
      ctx.arc(-6 + Math.sin(time * 0.002) * 1.2, -3, 1.8, 0, Math.PI * 2);
      ctx.arc(6 + Math.sin(time * 0.002) * 1.2, -3, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#24351d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 1, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawParticles(ctx, game) {
  for (const particle of game.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    if (particle.shape === 'rect') {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawFloatingHints(ctx, game, time) {
  const gate = game.nextPendingGate();
  if (!gate || !game.settings.showKeyboardHints) return;
  const distance = gate.x - (game.player.x + 15);
  if (distance < 0) return;
  if (!visible(gate.x - 60, 120, game.camera)) return;
  const bob = Math.sin(time * 0.004) * 5;
  const label = gate.paragraph
    ? (gate.paragraph.length > 60 ? 'PÁRRAFO ✍' : 'FRASE ✍')
    : makeTarget(gate.keys[gate.progress]).display;
  ctx.save();
  ctx.translate(gate.x, gate.y - 62 + bob);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(25, 18, 56, 0.8)';
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  const width = Math.max(68, ctx.measureText(label).width + 24);
  roundRect(ctx, -width / 2, -15, width, 28, 14);
  ctx.fill();
  ctx.fillStyle = '#fff3b0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function drawPlayer(ctx, game, time) {
  const p = game.player;
  if (p.invulnerableUntil > performance.now() && Math.floor(time / 90) % 2 === 0) return;
  const state = p.state || 'idle';
  const walkPhase = p.walkPhase || 0;
  const facing = p.facing || 1;
  const floatY = state === 'walk' ? Math.abs(Math.sin(walkPhase * 6)) * -2 : 0;

  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h);
  // sombra
  ctx.fillStyle = 'rgba(20, 16, 30, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(facing, 1);
  ctx.translate(0, floatY);

  const jump = state === 'jump' || state === 'fall';
  const celebrate = state === 'celebrate';
  const hurt = state === 'hurt';

  // cola
  ctx.save();
  ctx.rotate(-0.2 + Math.sin(time * 0.003) * 0.12);
  ctx.fillStyle = TILO.fur;
  ctx.beginPath();
  ctx.moveTo(-12, -30);
  ctx.quadraticCurveTo(-38, -40, -34, -62);
  ctx.quadraticCurveTo(-30, -74, -20, -70);
  ctx.quadraticCurveTo(-6, -50, -5, -28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = TILO.cream;
  ctx.beginPath();
  ctx.ellipse(-28, -64, 8, 10, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // piernas
  const legSwing = state === 'walk' ? Math.sin(walkPhase * 6) * 5 : 0;
  ctx.strokeStyle = TILO.furDark;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-7, -15);
  if (jump) {
    ctx.lineTo(-9, -8);
    ctx.moveTo(7, -15);
    ctx.lineTo(10, -8);
  } else {
    ctx.lineTo(-8 + legSwing, -2);
    ctx.moveTo(7, -15);
    ctx.lineTo(8 - legSwing, -2);
  }
  ctx.stroke();
  // zapatitos
  ctx.fillStyle = TILO.dark;
  ctx.beginPath();
  ctx.ellipse(-9 + legSwing, -2, 6, 3.5, 0, 0, Math.PI * 2);
  ctx.ellipse(9 - legSwing, -2, 6, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // cuerpo
  ctx.fillStyle = TILO.fur;
  ctx.beginPath();
  ctx.ellipse(0, -28, 16, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = TILO.cream;
  ctx.beginPath();
  ctx.ellipse(0, -25, 10, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // brazos
  ctx.strokeStyle = TILO.fur;
  ctx.lineWidth = 6;
  ctx.beginPath();
  if (celebrate) {
    ctx.moveTo(-12, -34);
    ctx.lineTo(-22, -48 + Math.sin(time * 0.01) * 4);
    ctx.moveTo(12, -34);
    ctx.lineTo(22, -48 + Math.cos(time * 0.01) * 4);
  } else if (jump) {
    ctx.moveTo(-12, -34);
    ctx.lineTo(-22, -42);
    ctx.moveTo(12, -34);
    ctx.lineTo(22, -42);
  } else {
    ctx.moveTo(-12, -34);
    ctx.lineTo(-18, -25 + legSwing * 0.5);
    ctx.moveTo(12, -34);
    ctx.lineTo(18, -25 - legSwing * 0.5);
  }
  ctx.stroke();

  // bufanda
  ctx.fillStyle = TILO.scarf;
  roundRect(ctx, -13, -42, 26, 7, 4);
  ctx.fill();
  ctx.fillStyle = TILO.scarfDark;
  ctx.beginPath();
  ctx.moveTo(8, -39);
  ctx.lineTo(17, -35 + Math.sin(time * 0.004) * 2);
  ctx.lineTo(8, -32);
  ctx.closePath();
  ctx.fill();

  // orejas
  ctx.fillStyle = TILO.fur;
  ctx.beginPath();
  ctx.moveTo(-15, -57);
  ctx.lineTo(-20, -78);
  ctx.lineTo(-2, -64);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(15, -57);
  ctx.lineTo(20, -78);
  ctx.lineTo(2, -64);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd9b0';
  ctx.beginPath();
  ctx.moveTo(-14, -60);
  ctx.lineTo(-17, -72);
  ctx.lineTo(-6, -63);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, -60);
  ctx.lineTo(17, -72);
  ctx.lineTo(6, -63);
  ctx.closePath();
  ctx.fill();

  // cabeza
  ctx.fillStyle = TILO.fur;
  ctx.beginPath();
  ctx.arc(0, -52, 17, 0, Math.PI * 2);
  ctx.fill();
  // mejillas
  ctx.fillStyle = 'rgba(255, 143, 158, 0.5)';
  ctx.beginPath();
  ctx.arc(-10, -46, 4, 0, Math.PI * 2);
  ctx.arc(10, -46, 4, 0, Math.PI * 2);
  ctx.fill();
  // hocico
  ctx.fillStyle = TILO.cream;
  ctx.beginPath();
  ctx.ellipse(0, -45, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // ojos
  ctx.fillStyle = TILO.dark;
  if (celebrate || state === 'happy') {
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = TILO.dark;
    ctx.beginPath();
    ctx.arc(-6, -55, 3.2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.arc(6, -55, 3.2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(-6, -55, 3.1, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(6, -55, 3.1, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-5, -56, 1.1, 0, Math.PI * 2);
    ctx.arc(7, -56, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // nariz y boca
  ctx.fillStyle = TILO.dark;
  ctx.beginPath();
  ctx.ellipse(0, -47, 2.6, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = TILO.dark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (hurt) {
    ctx.arc(0, -40, 3.5, Math.PI * 1.15, Math.PI * 1.85);
  } else {
    ctx.arc(0, -43, 4, 0.2, Math.PI - 0.2);
  }
  ctx.stroke();

  // llave mágica al cuello
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.arc(0, -35, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-1, -33, 2, 5);

  ctx.restore();
}

function drawAssistBanner(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(25, 18, 56, 0.75)';
  roundRect(ctx, 300, 92, 360, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#fff3b0';
  ctx.font = 'bold 17px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Modo ayuda: los obstáculos van más despacio', 480, 112);
  ctx.restore();
}

function shade(hex, amount) {
  const value = hex.replace('#', '');
  const num = parseInt(value, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}
