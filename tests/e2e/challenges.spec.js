import { expect, test } from '@playwright/test';
import {
  keyToPlaywright,
  monitorErrors,
  resetApp,
  startLevelDirect,
  typeParagraph,
} from './helpers.js';

test.describe('retos de teclado', () => {
  test('un error muestra una pista amable y el acierto abre la burbuja', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await startLevelDirect(page, 'w2l1');

    const opened = await page.evaluate(() => window.__TKA__.openGate(0));
    expect(opened).toBe(true);
    await expect(page.locator('.challenge-modal')).toBeVisible();
    await expect(page.locator('.challenge-key')).toHaveText('A');
    await expect(page.locator('.challenge-prompt')).toContainText('Pulsa la tecla iluminada');

    await page.keyboard.press('s');
    await expect(page.locator('.challenge-feedback')).toContainText('¡Casi!');
    await expect(page.locator('.challenge-feedback')).toContainText('A');
    await expect(page.locator('.challenge-modal')).toBeVisible();
    expect(
      await page.evaluate(() => window.__TKA__.store.profile.keyErrors.A),
    ).toBe(1);

    await page.keyboard.press('a');
    await expect(page.locator('.challenge-modal')).toHaveCount(0);
    await expect(page.locator('#hud-keys')).toContainText('1/3');
    expect(await page.evaluate(() => window.__TKA__.game.level.gates[0].completed)).toBe(true);

    expect(errors).toEqual([]);
  });

  test('la ayuda con la tecla funciona y el teclado virtual resuelve el reto', async ({ page }) => {
    await resetApp(page);
    await startLevelDirect(page, 'w2l1');
    await page.evaluate(() => window.__TKA__.openGate(1));

    await page.locator('[data-action="challenge-help"]').click();
    await expect(page.locator('.challenge-feedback')).toContainText('Mira la tecla iluminada');
    expect(await page.evaluate(() => window.__TKA__.game.evaluator.helps)).toBe(1);

    await page.locator('#challenge-keyboard .vkb__key.is-target').click();
    await expect(page.locator('.challenge-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.__TKA__.game.level.gates[1].completed)).toBe(true);
  });

  test('resuelve una secuencia de dos teclas', async ({ page }) => {
    await resetApp(page);
    await startLevelDirect(page, 'w2l3');
    await page.evaluate(() => window.__TKA__.openGate(1));

    await expect(page.locator('.challenge-prompt')).toContainText('Escribe la secuencia');
    await expect(page.locator('.challenge-slot')).toHaveCount(2);
    await page.keyboard.press('i');
    await expect(page.locator('.challenge-slot.is-done')).toHaveCount(1);
    await expect(page.locator('.challenge-slot.is-done')).toHaveText('I');
    await expect(page.locator('.challenge-key')).toHaveText('U');

    await page.keyboard.press('u');
    await expect(page.locator('.challenge-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.__TKA__.game.level.gates[1].completed)).toBe(true);
  });

  test('la Ñ se acepta con la posición física de un teclado US', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await startLevelDirect(page, 'w8l2');
    await page.evaluate(() => window.__TKA__.openGate(0));

    await expect(page.locator('.challenge-key')).toHaveText('Ñ');
    await expect(page.locator('#challenge-keyboard .vkb__key.is-target')).toHaveText('Ñ');
    await page.keyboard.press(keyToPlaywright('Ñ'));
    await expect(page.locator('.challenge-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.__TKA__.game.level.gates[0].completed)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('resuelve una palabra completa letra por letra', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await startLevelDirect(page, 'w4l3');
    await page.evaluate(() => window.__TKA__.openGate(0));

    await expect(page.locator('.challenge-prompt')).toContainText('Escribe la palabra');
    await expect(page.locator('.challenge-word')).toContainText('S');
    await expect(page.locator('.challenge-word')).toContainText('O');
    await expect(page.locator('.challenge-word')).toContainText('L');

    for (const key of ['S', 'O', 'L']) {
      await page.keyboard.press(keyToPlaywright(key));
    }
    await expect(page.locator('.challenge-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.__TKA__.game.level.gates[0].completed)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('Escape sale del reto sin bloquear el nivel', async ({ page }) => {
    await resetApp(page);
    await startLevelDirect(page, 'w2l1');
    await page.evaluate(() => window.__TKA__.openGate(0));
    await expect(page.locator('.challenge-modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.challenge-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.__TKA__.game.state)).toBe('playing');
    expect(await page.evaluate(() => window.__TKA__.game.level.gates[0].completed)).toBe(false);

    await page.waitForTimeout(2600);
    await page.evaluate(() => window.__TKA__.openGate(0));
    await expect(page.locator('.challenge-modal')).toBeVisible();
  });

  test('las burbujas se abren al acercarse caminando, no solo por el hook', async ({ page }) => {
    await resetApp(page);
    await startLevelDirect(page, 'w2l1');
    const gate = await page.evaluate(() => {
      const g = window.__TKA__.game.level.gates[0];
      return { x: g.x, y: g.y };
    });
    await page.evaluate((g) => {
      window.__TKA__.game.player.x = g.x - 15;
      window.__TKA__.game.player.y = g.y - 20;
      window.__TKA__.game.player.vx = 0;
      window.__TKA__.game.player.vy = 0;
    }, gate);
    await expect(page.locator('.challenge-modal')).toBeVisible({ timeout: 4000 });
    const keys = await page.evaluate(() => window.__TKA__.game.level.gates[0].keys);
    for (const key of keys) {
      await page.keyboard.press(keyToPlaywright(key));
    }
    await expect(page.locator('.challenge-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.__TKA__.game.level.gates[0].completed)).toBe(true);
  });
});

test.describe('retos de frases y párrafos', () => {
  test('acepta la frase exacta con mayúscula inicial, tildes y Ñ', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await startLevelDirect(page, 'w10l2');
    expect(await page.evaluate(() => window.__TKA__.openGate(0))).toBe(true);

    await expect(page.locator('.challenge-prompt')).toContainText('Escribe la frase completa');
    await expect(page.locator('.paragraph-text')).toContainText('La niña enciende la lámpara.');
    await expect(page.locator('.paragraph-char.is-current')).toHaveText('L');
    await expect(page.locator('#challenge-keyboard .vkb__key.is-target')).toHaveCount(1);

    await typeParagraph(page, 'La niña enciende la lámpara.');

    await expect(page.locator('.challenge-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.__TKA__.game.level.gates[0].completed)).toBe(true);
    await expect(page.locator('.toast').last()).toContainText('mayúsculas, tildes y punto');
    expect(errors).toEqual([]);
  });

  test('permite una coincidencia amable sin tildes ni Ñ y avisa con cariño', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await startLevelDirect(page, 'w10l2');
    await page.evaluate(() => window.__TKA__.openGate(0));

    await typeParagraph(page, 'la nina enciende la lampara.');

    await expect(page.locator('.challenge-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.__TKA__.game.level.gates[0].completed)).toBe(true);
    await expect(page.locator('.toast').last()).toContainText('Recuerda practicar las tildes');
    expect(errors).toEqual([]);
  });

  test('RETROCESO corrige un error y ENTER comprueba el avance', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await startLevelDirect(page, 'w9l1');
    await page.evaluate(() => window.__TKA__.openGate(0));

    await typeParagraph(page, 'El so');
    await page.keyboard.press('Enter');
    await expect(page.locator('.challenge-feedback')).toContainText('Todavía falta un poquito');

    await typeParagraph(page, 'l brill');
    await page.keyboard.press('x');
    await expect(page.locator('.challenge-feedback')).toContainText('Esperabas');
    await expect(page.locator('.paragraph-typed .is-wrong')).toHaveCount(1);

    await page.keyboard.press('Backspace');
    await expect(page.locator('.paragraph-typed .is-wrong')).toHaveCount(0);
    await typeParagraph(page, 'a.');

    await expect(page.locator('.challenge-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.__TKA__.game.level.gates[0].completed)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('el teclado virtual, la ayuda y el botón Comprobar funcionan en un párrafo', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await startLevelDirect(page, 'w12l1');
    await page.evaluate(() => window.__TKA__.openGate(0));

    await expect(page.locator('.challenge-prompt')).toContainText('Escribe el párrafo completo');
    await page.locator('[data-action="challenge-help"]').click();
    await expect(page.locator('.challenge-feedback')).toContainText('La próxima letra es');
    expect(await page.evaluate(() => window.__TKA__.game.evaluator.helps)).toBe(1);

    await page.locator('[data-action="paragraph-check"]').click();
    await expect(page.locator('.challenge-feedback')).toContainText('Todavía falta un poquito');

    await page.locator('#challenge-keyboard .vkb__key.is-target').click();
    await expect(page.locator('.paragraph-typed')).toContainText('E');
    await page.locator('#challenge-keyboard .vkb__key.is-target').click();
    await expect(page.locator('.paragraph-typed')).toContainText('En');

    await page.locator('[data-action="paragraph-clear"]').click();
    await expect(page.locator('.paragraph-placeholder')).toBeVisible();

    await typeParagraph(page, await page.evaluate(() => window.__TKA__.game.level.gates[0].paragraph));
    await expect(page.locator('.challenge-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.__TKA__.game.level.gates[0].completed)).toBe(true);
    expect(errors).toEqual([]);
  });
});
