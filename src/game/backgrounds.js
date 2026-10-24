function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

function cloud(ctx, x, y, scale, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 44 * scale, 20 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 32 * scale, y + 6 * scale, 28 * scale, 16 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 34 * scale, y + 5 * scale, 30 * scale, 17 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 6 * scale, y - 14 * scale, 26 * scale, 20 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function hills(ctx, baseY, color, amplitude, step, offset) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-100, baseY + 220);
  for (let x = -100; x <= 1160; x += step) {
    const y = baseY - Math.sin((x + offset) / step) * amplitude - Math.cos((x + offset) / (step * 2.8)) * amplitude * 0.4;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(1160, 620);
  ctx.lineTo(-100, 620);
  ctx.closePath();
  ctx.fill();
}

function drawSun(ctx, x, y, r, color, glow, time) {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.4);
  g.addColorStop(0, glow);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBackground(ctx, world, cameraX, time, width, height, reducedMotion = false) {
  const p = world.palette;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, p.skyTop);
  gradient.addColorStop(0.7, p.skyBottom);
  gradient.addColorStop(1, p.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const drift = reducedMotion ? 0 : time * 0.008;
  const sunX = width * 0.78 - cameraX * 0.01;
  drawSun(ctx, sunX, 104, 46, p.sun, 'rgba(255,250,190,0.5)', time);

  // Nubes suaves en todos los mundos.
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 4; i += 1) {
    const x = ((i * 330 + 120 - cameraX * 0.06 + drift * 40) % 1500) - 200;
    cloud(ctx, x, 95 + (i % 2) * 42, 0.8 + (i % 3) * 0.18, 'rgba(255,255,255,0.7)');
  }
  ctx.globalAlpha = 1;

  switch (world.bg) {
    case 'forest':
      drawForest(ctx, p, cameraX, time, reducedMotion);
      break;
    case 'mountain':
      drawMountains(ctx, p, cameraX);
      break;
    case 'river':
      drawRiver(ctx, p, cameraX, time);
      break;
    case 'desert':
      drawDesert(ctx, p, cameraX);
      break;
    case 'castle':
      drawCastle(ctx, p, cameraX, time);
      break;
    case 'cavern':
      drawCavern(ctx, p, cameraX, time, reducedMotion);
      break;
    case 'kingdom':
      drawKingdom(ctx, p, cameraX, time, reducedMotion);
      break;
    case 'city':
      drawCity(ctx, p, cameraX, time, reducedMotion);
      break;
    case 'library':
      drawLibrary(ctx, p, cameraX, time, reducedMotion);
      break;
    case 'island':
      drawIsland(ctx, p, cameraX, time, reducedMotion);
      break;
    case 'palace':
      drawPalace(ctx, p, cameraX, time, reducedMotion);
      break;
    default:
      drawMeadow(ctx, p, cameraX, time);
  }
}

function drawMeadow(ctx, p, cameraX, time) {
  hills(ctx, 330, p.far, 46, 230, -cameraX * 0.1);
  // molinos lejanos
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 3; i += 1) {
    const x = 240 + i * 360 - ((cameraX * 0.16) % 1080);
    const y = 320 - (i % 2) * 26;
    ctx.fillStyle = '#f6e7c8';
    ctx.fillRect(x, y, 16, 44);
    ctx.beginPath();
    ctx.moveTo(x - 13, y);
    ctx.lineTo(x + 8, y - 16);
    ctx.lineTo(x + 29, y);
    ctx.closePath();
    ctx.fillStyle = '#d97757';
    ctx.fill();
    ctx.strokeStyle = '#fff8e1';
    ctx.lineWidth = 3;
    const angle = time * 0.0004;
    for (let b = 0; b < 4; b += 1) {
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 8);
      ctx.lineTo(x + 8 + Math.cos(angle + b * 1.57) * 30, y + 8 + Math.sin(angle + b * 1.57) * 30);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  hills(ctx, 385, p.mid, 32, 180, -cameraX * 0.22);
  // flores
  for (let i = 0; i < 18; i += 1) {
    const x = ((i * 131 - cameraX * 0.3) % 1100) - 40;
    const y = 402 + (i % 4) * 9;
    ctx.fillStyle = i % 2 ? p.accent2 : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  hills(ctx, 440, p.near, 22, 140, -cameraX * 0.34);
}

function drawForest(ctx, p, cameraX, time, reducedMotion) {
  hills(ctx, 350, p.far, 30, 160, -cameraX * 0.1);
  for (let layer = 0; layer < 2; layer += 1) {
    const factor = layer === 0 ? 0.18 : 0.32;
    const treeColor = layer === 0 ? '#1c6a54' : '#155744';
    for (let i = 0; i < 12; i += 1) {
      const x = ((i * 210 + layer * 60 - cameraX * factor) % 1500) - 100;
      const base = 370 + layer * 38;
      const h = layer === 0 ? 140 : 180;
      ctx.fillStyle = '#4c3227';
      ctx.fillRect(x - 7, base - 10, 14, 70);
      ctx.fillStyle = treeColor;
      for (let j = 0; j < 3; j += 1) {
        ctx.beginPath();
        ctx.arc(x + (j - 1) * 22, base - h * 0.5 - j * 8, 42 - j * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // luciérnagas
  if (!reducedMotion) {
    for (let i = 0; i < 16; i += 1) {
      const x = ((i * 173 - cameraX * 0.2 + Math.sin(time * 0.001 + i) * 20) % 1100) - 50;
      const y = 230 + Math.sin(time * 0.0016 + i * 2) * 60 + (i % 5) * 32;
      const alpha = 0.35 + Math.sin(time * 0.004 + i) * 0.3;
      ctx.globalAlpha = Math.max(0.08, alpha);
      ctx.fillStyle = p.particle;
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  hills(ctx, 450, p.near, 18, 120, -cameraX * 0.4);
}

function drawMountains(ctx, p, cameraX) {
  // capas de montañas con nieve
  const layers = [
    { color: p.far, factor: 0.1, base: 350, height: 190 },
    { color: p.mid, factor: 0.2, base: 400, height: 230 },
    { color: p.near, factor: 0.34, base: 460, height: 210 },
  ];
  layers.forEach((layer, li) => {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(-200, 620);
    for (let i = 0; i < 7; i += 1) {
      const x = i * 250 - ((cameraX * layer.factor) % 250) - 160;
      ctx.lineTo(x + 125, layer.base - layer.height - (i % 3) * 25);
      ctx.lineTo(x + 250, layer.base + 30);
    }
    ctx.lineTo(1200, 620);
    ctx.closePath();
    ctx.fill();
    if (li < 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 7; i += 1) {
        const x = i * 250 - ((cameraX * layer.factor) % 250) - 160;
        const peakY = layer.base - layer.height - (i % 3) * 25;
        ctx.beginPath();
        ctx.moveTo(x + 125, peakY);
        ctx.lineTo(x + 148, peakY + 34);
        ctx.lineTo(x + 132, peakY + 28);
        ctx.lineTo(x + 118, peakY + 40);
        ctx.lineTo(x + 101, peakY + 30);
        ctx.closePath();
        ctx.fill();
      }
    }
  });
}

function drawRiver(ctx, p, cameraX, time) {
  hills(ctx, 355, p.far, 28, 190, -cameraX * 0.12);
  hills(ctx, 415, p.mid, 22, 160, -cameraX * 0.25);
  const waterY = 455;
  const grad = ctx.createLinearGradient(0, waterY - 30, 0, 560);
  grad.addColorStop(0, '#8fe9ff');
  grad.addColorStop(1, p.water);
  ctx.fillStyle = grad;
  ctx.fillRect(0, waterY - 10, 960, 120);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i += 1) {
    const y = waterY + 8 + i * 17;
    ctx.beginPath();
    for (let x = -20; x < 1000; x += 12) {
      const wave = Math.sin((x + time * 0.06 + i * 30) / 38) * 3;
      if (x === -20) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
}

function drawDesert(ctx, p, cameraX) {
  hills(ctx, 345, p.far, 38, 280, -cameraX * 0.1);
  // pirámides
  for (let i = 0; i < 3; i += 1) {
    const x = 170 + i * 380 - ((cameraX * 0.18) % 1140);
    const base = 420;
    ctx.fillStyle = i % 2 ? '#d79a58' : '#e4ad69';
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x + 90, base - 150);
    ctx.lineTo(x + 190, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,180,0.35)';
    ctx.beginPath();
    ctx.moveTo(x + 90, base - 150);
    ctx.lineTo(x + 190, base);
    ctx.lineTo(x + 108, base);
    ctx.closePath();
    ctx.fill();
  }
  hills(ctx, 430, p.mid, 26, 210, -cameraX * 0.28);
  hills(ctx, 470, p.near, 18, 170, -cameraX * 0.4);
}

function drawCastle(ctx, p, cameraX, time) {
  hills(ctx, 370, p.far, 20, 200, -cameraX * 0.1);
  const offset = -((cameraX * 0.2) % 860);
  for (let tower = 0; tower < 2; tower += 1) {
    const x = 120 + tower * 560 + offset;
    ctx.fillStyle = p.far;
    ctx.fillRect(x, 210, 150, 270);
    ctx.beginPath();
    ctx.moveTo(x - 14, 212);
    ctx.lineTo(x + 75, 140);
    ctx.lineTo(x + 164, 212);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1c1733';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(x + 30 + i * 45, 300, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    // ventanas iluminadas
    ctx.fillStyle = 'rgba(255,218,120,0.65)';
    for (let i = 0; i < 2; i += 1) {
      ctx.beginPath();
      ctx.arc(x + 45 + i * 60, 300, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // banderas
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 6; i += 1) {
    const x = ((i * 170 - cameraX * 0.3) % 1000) - 40;
    ctx.fillStyle = i % 2 ? p.accent : p.accent2;
    ctx.beginPath();
    ctx.moveTo(x, 330);
    ctx.lineTo(x + 34, 336 + Math.sin(time * 0.002 + i) * 5);
    ctx.lineTo(x, 352);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  hills(ctx, 450, p.near, 14, 150, -cameraX * 0.4);
}

function drawCavern(ctx, p, cameraX, time, reducedMotion) {
  // estalactitas
  ctx.fillStyle = p.far;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 130);
  for (let i = 0; i < 12; i += 1) {
    const x = i * 90 - ((cameraX * 0.1) % 90);
    ctx.lineTo(x + 20, 60 + (i % 3) * 24);
    ctx.lineTo(x + 48, 130);
    ctx.lineTo(x + 88, 130);
  }
  ctx.lineTo(960, 130);
  ctx.lineTo(960, 0);
  ctx.closePath();
  ctx.fill();
  // cristales de fondo
  for (let i = 0; i < 9; i += 1) {
    const x = ((i * 190 + 80 - cameraX * 0.22) % 1200) - 100;
    const base = 470;
    const h = 90 + (i % 4) * 40;
    const glow = !reducedMotion ? 0.35 + Math.sin(time * 0.002 + i) * 0.18 : 0.4;
    ctx.globalAlpha = glow;
    ctx.fillStyle = i % 2 ? p.accent : p.accent2;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x + 24, base - h);
    ctx.lineTo(x + 50, base);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // columnas
  for (let i = 0; i < 5; i += 1) {
    const x = ((i * 260 + 60 - cameraX * 0.32) % 1300) - 100;
    ctx.fillStyle = p.mid;
    ctx.fillRect(x, 250, 46, 280);
    ctx.fillStyle = 'rgba(116,255,226,0.18)';
    ctx.fillRect(x + 8, 250, 8, 280);
  }
}

function drawKingdom(ctx, p, cameraX, time, reducedMotion) {
  // estrellas
  if (!reducedMotion) {
    for (let i = 0; i < 28; i += 1) {
      const x = (i * 97 + 23) % 960;
      const y = 30 + ((i * 53) % 210);
      ctx.globalAlpha = 0.35 + Math.sin(time * 0.002 + i) * 0.35;
      ctx.fillStyle = '#fff7c2';
      ctx.beginPath();
      ctx.arc(x, y, i % 5 === 0 ? 2.2 : 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // palacio lejano
  const offset = -((cameraX * 0.12) % 1000);
  ctx.fillStyle = p.far;
  for (let i = 0; i < 3; i += 1) {
    const x = 160 + i * 340 + offset;
    ctx.fillRect(x, 230, 120, 250);
    ctx.beginPath();
    ctx.moveTo(x - 16, 232);
    ctx.lineTo(x + 60, 120 - i * 18);
    ctx.lineTo(x + 136, 232);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,249,190,0.8)';
    ctx.beginPath();
    ctx.arc(x + 60, 178, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.far;
  }
  // nubes rosadas
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 3; i += 1) {
    cloud(ctx, ((i * 340 - cameraX * 0.18) % 1200) - 100, 270 + i * 30, 1.1, '#ffd6ef');
  }
  ctx.globalAlpha = 1;
  hills(ctx, 420, p.mid, 24, 170, -cameraX * 0.3);
  hills(ctx, 465, p.near, 16, 130, -cameraX * 0.42);
  // guirnaldas de luces
  ctx.strokeStyle = 'rgba(255,240,170,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 40);
  ctx.quadraticCurveTo(480, 100, 960, 40);
  ctx.stroke();
  for (let i = 0; i < 18; i += 1) {
    const t = i / 17;
    const x = t * 960;
    const y = 40 + Math.sin(t * Math.PI) * 48;
    ctx.fillStyle = i % 2 ? '#ffe066' : '#ff8bd1';
    ctx.beginPath();
    ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCity(ctx, p, cameraX, time, reducedMotion) {
  hills(ctx, 360, p.far, 22, 240, -cameraX * 0.08);
  // Edificios lejanos con ventanas encendidas.
  const layers = [
    { factor: 0.14, color: p.far, base: 440, min: 100, max: 190, width: 76 },
    { factor: 0.26, color: p.mid, base: 470, min: 70, max: 150, width: 96 },
    { factor: 0.38, color: p.near, base: 495, min: 50, max: 110, width: 120 },
  ];
  layers.forEach((layer, li) => {
    for (let i = 0; i < 12; i += 1) {
      const x = ((i * 165 + li * 47 - cameraX * layer.factor) % 2200) - 200;
      const h = layer.min + ((i * 53 + li * 31) % (layer.max - layer.min));
      const w = layer.width;
      ctx.fillStyle = layer.color;
      ctx.fillRect(x, layer.base - h, w, h + 60);
      ctx.fillStyle = 'rgba(255, 235, 160, 0.55)';
      for (let wy = layer.base - h + 16; wy < layer.base - 18; wy += 24) {
        for (let wx = x + 12; wx < x + w - 10; wx += 22) {
          if ((wx + wy + i * 7) % 5 < 2) {
            ctx.fillRect(wx, wy, 7, 9);
          }
        }
      }
    }
  });
  // Lunas y estrellas urbanas.
  if (!reducedMotion) {
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 131 + 40) % 960;
      const y = 34 + ((i * 47) % 150);
      ctx.globalAlpha = 0.35 + Math.sin(time * 0.002 + i) * 0.25;
      ctx.fillStyle = p.particle;
      ctx.beginPath();
      ctx.arc(x, y, i % 4 === 0 ? 2 : 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  hills(ctx, 500, p.groundTop, 8, 210, -cameraX * 0.45);
}

function drawLibrary(ctx, p, cameraX, time, reducedMotion) {
  // Ventanal cálido al fondo.
  ctx.fillStyle = 'rgba(255, 225, 160, 0.22)';
  ctx.beginPath();
  ctx.ellipse(760 - cameraX * 0.05, 190, 150, 160, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 232, 180, 0.45)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(760 - cameraX * 0.05, 190, 150, 160, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  // Estanterías.
  for (let shelf = 0; shelf < 3; shelf += 1) {
    const y = 250 + shelf * 76;
    const offset = -((cameraX * (0.12 + shelf * 0.04)) % 360);
    ctx.fillStyle = 'rgba(38, 22, 16, 0.85)';
    ctx.fillRect(-40, y + 62, 1060, 14);
    for (let i = 0; i < 8; i += 1) {
      const x = 40 + i * 130 + offset;
      const colors = [p.accent, p.accent2, '#c46b52', '#8a9bd6', '#d9a45c'];
      ctx.fillStyle = colors[(i + shelf) % colors.length];
      const h = 42 + ((i * 17) % 20);
      ctx.fillRect(x, y + 62 - h, 18, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x + 4, y + 68 - h, 3, h - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(x + 23, y + 62 - h + 6, 13, h - 10);
      ctx.fillRect(x + 39, y + 62 - h + 10, 16, h - 14);
    }
  }
  // Lámparas colgantes.
  for (let i = 0; i < 3; i += 1) {
    const x = 190 + i * 310 - ((cameraX * 0.18) % 250);
    ctx.strokeStyle = 'rgba(30, 18, 12, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 120);
    ctx.stroke();
    const glow = reducedMotion ? 0.35 : 0.4 + Math.sin(time * 0.002 + i) * 0.08;
    ctx.globalAlpha = glow;
    ctx.fillStyle = p.sun;
    ctx.beginPath();
    ctx.moveTo(x - 26, 132);
    ctx.lineTo(x + 26, 132);
    ctx.lineTo(x + 16, 158);
    ctx.lineTo(x - 16, 158);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  hills(ctx, 505, p.near, 10, 180, -cameraX * 0.4);
}

function drawIsland(ctx, p, cameraX, time, reducedMotion) {
  const seaY = 380;
  hills(ctx, 350, p.far, 26, 240, -cameraX * 0.08);
  // Islas lejanas.
  for (let i = 0; i < 3; i += 1) {
    const x = ((i * 420 + 180 - cameraX * 0.12) % 1500) - 150;
    ctx.fillStyle = p.mid;
    ctx.beginPath();
    ctx.ellipse(x, seaY, 120 - i * 18, 34, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.near;
    ctx.fillRect(x - 4, seaY - 70, 8, 70);
    for (let f = 0; f < 5; f += 1) {
      const angle = -0.6 + f * 0.35;
      ctx.strokeStyle = p.accent2;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, seaY - 68);
      ctx.quadraticCurveTo(
        x + Math.cos(angle) * 34,
        seaY - 92,
        x + Math.cos(angle) * 50,
        seaY - 70 - Math.sin(angle) * 16,
      );
      ctx.stroke();
    }
  }
  const grad = ctx.createLinearGradient(0, seaY - 8, 0, 560);
  grad.addColorStop(0, '#9ef4ff');
  grad.addColorStop(1, p.water);
  ctx.fillStyle = grad;
  ctx.fillRect(0, seaY - 8, 960, 180);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i += 1) {
    const y = seaY + 10 + i * 22;
    ctx.beginPath();
    for (let x = -20; x < 1000; x += 14) {
      const wave = Math.sin((x + time * 0.05 + i * 26) / 40) * 3;
      if (x === -20) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  // Gaviotas.
  if (!reducedMotion) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const x = ((i * 210 + time * 0.02 + 120) % 1200) - 100;
      const y = 120 + (i % 3) * 38;
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.quadraticCurveTo(x, y - 7, x + 8, y);
      ctx.stroke();
    }
  }
}

function drawPalace(ctx, p, cameraX, time, reducedMotion) {
  // Ventanal de arco con vidriera.
  const windowX = 480 - cameraX * 0.04;
  ctx.fillStyle = 'rgba(255, 230, 160, 0.22)';
  ctx.beginPath();
  ctx.ellipse(windowX, 190, 150, 190, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(123, 255, 224, 0.18)';
  ctx.beginPath();
  ctx.ellipse(windowX, 190, 110, 150, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 224, 150, 0.65)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(windowX, 190, 150, 190, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  // Columnas.
  for (let i = 0; i < 6; i += 1) {
    const x = ((i * 240 + 40 - cameraX * 0.2) % 1500) - 120;
    ctx.fillStyle = p.mid;
    ctx.fillRect(x, 120, 54, 400);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 10, 120, 10, 400);
    ctx.fillStyle = p.far;
    ctx.fillRect(x - 10, 112, 74, 18);
    ctx.fillRect(x - 10, 500, 74, 26);
  }
  // Cortinas y guirnaldas.
  ctx.fillStyle = 'rgba(178, 141, 255, 0.55)';
  for (let i = 0; i < 4; i += 1) {
    const x = ((i * 320 + 110 - cameraX * 0.1) % 1300) - 100;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + 40, 140, x + 24, 290);
    ctx.lineTo(x + 86, 290);
    ctx.quadraticCurveTo(x + 64, 140, x + 96, 0);
    ctx.closePath();
    ctx.fill();
  }
  if (!reducedMotion) {
    for (let i = 0; i < 20; i += 1) {
      const x = (i * 97 + 31) % 960;
      const y = 40 + ((i * 61) % 280);
      ctx.globalAlpha = 0.25 + Math.sin(time * 0.002 + i) * 0.25;
      ctx.fillStyle = p.accent;
      ctx.beginPath();
      ctx.arc(x, y, i % 6 === 0 ? 2.4 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  hills(ctx, 508, p.near, 6, 220, -cameraX * 0.42);
}

/** Detalles del primer plano que dan profundidad. */
export function drawForeground(ctx, world, cameraX, time) {
  if (world.bg === 'forest') {
    for (let i = 0; i < 4; i += 1) {
      const x = ((i * 390 + 80 - cameraX * 0.65) % 1400) - 100;
      ctx.fillStyle = 'rgba(10, 44, 37, 0.72)';
      ctx.beginPath();
      ctx.ellipse(x, 545, 110, 45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (world.bg === 'cavern') {
    ctx.fillStyle = 'rgba(10, 8, 28, 0.55)';
    for (let i = 0; i < 8; i += 1) {
      const x = ((i * 160 - cameraX * 0.55) % 1200) - 60;
      ctx.beginPath();
      ctx.moveTo(x, 540);
      ctx.lineTo(x + 30, 480 + (i % 3) * 12);
      ctx.lineTo(x + 70, 540);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (world.bg === 'kingdom') {
    ctx.fillStyle = 'rgba(255, 240, 170, 0.22)';
    for (let i = 0; i < 12; i += 1) {
      const x = (i * 117 + time * 0.012) % 1000;
      const y = 380 + Math.sin(time * 0.001 + i) * 30;
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (world.bg === 'city') {
    // Farolas del paseo.
    for (let i = 0; i < 6; i += 1) {
      const x = ((i * 260 + 70 - cameraX * 0.62) % 1500) - 80;
      ctx.strokeStyle = 'rgba(20, 20, 40, 0.7)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, 540);
      ctx.lineTo(x, 440);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 235, 150, 0.75)';
      ctx.beginPath();
      ctx.arc(x, 432, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (world.bg === 'island') {
    // Palmeras cercanas.
    for (let i = 0; i < 3; i += 1) {
      const x = ((i * 430 + 90 - cameraX * 0.58) % 1400) - 100;
      ctx.strokeStyle = 'rgba(30, 80, 65, 0.8)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x, 545);
      ctx.quadraticCurveTo(x + 18, 470, x + 6, 410);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(26, 120, 90, 0.75)';
      ctx.lineWidth = 7;
      for (let f = 0; f < 4; f += 1) {
        ctx.beginPath();
        ctx.moveTo(x + 6, 410);
        ctx.quadraticCurveTo(x + 42 + f * 10, 390 + f * 8, x + 66 + f * 8, 418 + f * 6);
        ctx.stroke();
      }
    }
  }
  if (world.bg === 'palace') {
    // Alfombra y destellos cercanos.
    ctx.fillStyle = 'rgba(255, 209, 102, 0.12)';
    ctx.beginPath();
    ctx.moveTo(250, 540);
    ctx.lineTo(710, 540);
    ctx.lineTo(800, 440);
    ctx.lineTo(160, 440);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 230, 140, 0.35)';
    for (let i = 0; i < 10; i += 1) {
      const x = (i * 143 + time * 0.015) % 1000;
      const y = 420 + Math.sin(time * 0.001 + i) * 26;
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export { roundRect };
