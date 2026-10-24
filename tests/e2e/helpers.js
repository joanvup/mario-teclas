import { expect } from '@playwright/test';

/** Recolecta errores de consola y errores no capturados de la página. */
export function monitorErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

/** Deja el almacenamiento limpio y vuelve a la portada. */
export async function resetApp(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('[data-action="title-start"]')).toBeVisible();
}

export async function openMenu(page) {
  await page.locator('[data-action="title-start"]').click();
  await expect(page.locator('.menu-title')).toBeVisible();
}

/** Salta el tutorial si es la primera partida y entra al primer nivel. */
export async function startFirstLevelFromMenu(page) {
  await page.locator('[data-action="play-next"]').click();
  const skip = page.locator('[data-action="tutorial-skip"]');
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await expect(page.locator('.intro-screen')).toBeVisible();
  await page.locator('[data-action="start-level"]').click();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#hud')).toBeVisible();
  await page.waitForFunction(() => window.__TKA__.game.state === 'playing');
}

export async function startLevelDirect(page, levelId) {
  await page.evaluate((id) => window.__TKA__.startAnyLevel(id), levelId);
  await expect(page.locator('#game-canvas')).toBeVisible();
  await page.waitForFunction(
    (id) => window.__TKA__.game.state === 'playing' && window.__TKA__.game.level?.id === id,
    levelId,
  );
}

export async function snapshot(page) {
  return page.evaluate(() => window.__TKA__.snapshot());
}

export async function storeState(page) {
  return page.evaluate(() => ({
    completed: window.__TKA__.store.completedCount(),
    stars: window.__TKA__.store.totalStars(),
    tutorialDone: window.__TKA__.store.profile.tutorialDone,
    profiles: window.__TKA__.store.profiles.length,
    alias: window.__TKA__.store.profile.alias,
    settings: { ...window.__TKA__.store.settings },
    keyErrors: { ...window.__TKA__.store.profile.keyErrors },
    progress: JSON.parse(JSON.stringify(window.__TKA__.store.profile.progress)),
  }));
}

/** Abre una burbuja y la resuelve con el teclado físico. */
export async function completeGateWithKeyboard(page, index) {
  const opened = await page.evaluate((i) => window.__TKA__.openGate(i), index);
  if (!opened) throw new Error(`No se pudo abrir la burbuja ${index}`);
  await expect(page.locator('.challenge-modal')).toBeVisible();
  const gate = await page.evaluate((i) => {
    const current = window.__TKA__.game.level.gates[i];
    return { keys: current.keys, paragraph: current.paragraph ?? null };
  }, index);
  if (gate.paragraph) {
    await typeParagraph(page, gate.paragraph);
  } else {
    for (const key of gate.keys) {
      await page.keyboard.press(keyToPlaywright(key));
    }
  }
  await expect(page.locator('.challenge-modal')).toHaveCount(0);
  return gate.keys;
}

/**
 * Escribe una frase o párrafo carácter por carácter. Las letras, los números y
 * la puntuación usan el teclado real de Playwright; las tildes y la Ñ se envían
 * como eventos de teclado porque la distribución US de las pruebas no las
 * produce directamente. La Ñ se resuelve con la posición física de la Ñ.
 */
export async function typeParagraph(page, text) {
  for (const ch of Array.from(text)) {
    if (ch === ' ') {
      await page.keyboard.press('Space');
    } else if (/^[A-Za-z0-9.,;:!?]$/.test(ch)) {
      await page.keyboard.press(ch);
    } else {
      await page.evaluate((key) => {
        const base = key
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase();
        const code = key === 'ñ' || key === 'Ñ' ? 'Semicolon' : `Key${base}`;
        window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { key, code, bubbles: true }));
      }, ch);
    }
  }
}

/** Completa todas las burbujas pendientes del nivel activo. */
export async function completeAllGates(page) {
  const total = await page.evaluate(() => window.__TKA__.game.level.gates.length);
  for (let i = 0; i < total; i += 1) {
    await completeGateWithKeyboard(page, i);
  }
  return total;
}

export async function finishLevel(page) {
  await page.evaluate(() => window.__TKA__.finishActiveLevel());
  await expect(page.locator('.victory-card')).toBeVisible();
}

/** Traduce una tecla de los datos del nivel a una tecla de Playwright. */
export function keyToPlaywright(key) {
  if (key === 'ESPACIO') return 'Space';
  if (key === 'ENTER') return 'Enter';
  if (key === 'RETROCESO') return 'Backspace';
  // En una distribución US la Ñ se acepta en la posición física de la L+1.
  if (key === 'Ñ') return 'Semicolon';
  if (key === '→') return 'ArrowRight';
  if (key === '←') return 'ArrowLeft';
  if (key === '↑') return 'ArrowUp';
  if (key === '↓') return 'ArrowDown';
  return String(key).toLowerCase();
}
