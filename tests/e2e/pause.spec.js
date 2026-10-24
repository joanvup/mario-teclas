import { expect, test } from '@playwright/test';
import { monitorErrors, resetApp, startLevelDirect } from './helpers.js';

test.describe('pausa, reinicio y salida', () => {
  test('Escape pausa de verdad y Continuar reanuda el movimiento', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await startLevelDirect(page, 'w1l2');

    await page.keyboard.press('Escape');
    await expect(page.locator('.pause-panel')).toBeVisible();
    await expect(page.locator('.pause-panel')).toContainText('Pausa');
    expect(await page.evaluate(() => window.__TKA__.game.state)).toBe('paused');

    const pausedX = await page.evaluate(() => window.__TKA__.game.player.x);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowRight');
    expect(await page.evaluate(() => window.__TKA__.game.player.x)).toBe(pausedX);

    await page.locator('[data-action="resume"]').click();
    await expect(page.locator('.pause-panel')).toHaveCount(0);
    expect(await page.evaluate(() => window.__TKA__.game.state)).toBe('playing');

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowRight');
    expect(await page.evaluate(() => window.__TKA__.game.player.x)).toBeGreaterThan(pausedX + 40);

    expect(errors).toEqual([]);
  });

  test('la tecla P y el botón del HUD también pausan', async ({ page }) => {
    await resetApp(page);
    await startLevelDirect(page, 'w1l2');
    await page.keyboard.press('p');
    await expect(page.locator('.pause-panel')).toBeVisible();
    await page.locator('[data-action="resume"]').click();
    await page.locator('[data-action="pause"]').click();
    await expect(page.locator('.pause-panel')).toBeVisible();
  });

  test('Reiniciar nivel devuelve al inicio sin salir de la partida', async ({ page }) => {
    await resetApp(page);
    await startLevelDirect(page, 'w1l2');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(700);
    await page.keyboard.up('ArrowRight');
    const movedX = await page.evaluate(() => window.__TKA__.game.player.x);
    expect(movedX).toBeGreaterThan(120);

    await page.locator('[data-action="pause"]').click();
    await page.locator('[data-action="restart-level"]').click();
    await expect(page.locator('.pause-panel')).toHaveCount(0);
    await page.waitForFunction(() => window.__TKA__.game.state === 'playing');
    const restart = await page.evaluate(() => ({
      x: window.__TKA__.game.player.x,
      coins: window.__TKA__.game.coins,
      time: window.__TKA__.game.time,
    }));
    expect(restart.x).toBeLessThan(120);
    expect(restart.coins).toBe(0);
    expect(restart.time).toBeLessThan(1.5);
    await expect(page.locator('#hud-coins')).toContainText('0/');
  });

  test('se puede abrir Configuración desde la pausa y volver a ella', async ({ page }) => {
    await resetApp(page);
    await startLevelDirect(page, 'w1l2');
    await page.locator('[data-action="pause"]').click();
    await page.locator('[data-action="settings-from-pause"]').click();
    await expect(page.locator('.settings-layout')).toBeVisible();
    await page.locator('[data-action="back-settings"]').click();
    await expect(page.locator('.pause-panel')).toBeVisible();
    expect(await page.evaluate(() => window.__TKA__.game.state)).toBe('paused');
    await page.locator('[data-action="resume"]').click();
    expect(await page.evaluate(() => window.__TKA__.game.state)).toBe('playing');
  });

  test('Salir al mapa conserva el progreso y detiene la partida', async ({ page }) => {
    await resetApp(page);
    await startLevelDirect(page, 'w1l2');
    await page.locator('[data-action="pause"]').click();
    await page.locator('[data-action="exit-level"]').click();
    await expect(page.locator('.level-card')).toHaveCount(4);
    expect(await page.evaluate(() => window.__TKA__.game.state)).toBe('idle');
    await expect(page.locator('#game-canvas')).toBeHidden();
    await expect(page.locator('#hud')).toBeHidden();
    const state = await page.evaluate(() => ({
      attempts: window.__TKA__.store.levelStats('w1l2')?.attempts || 0,
      completed: window.__TKA__.store.completedCount(),
    }));
    expect(state.attempts).toBe(1);
    expect(state.completed).toBe(0);
  });

  test('cambiar de pestaña pausa automáticamente la partida', async ({ page }) => {
    await resetApp(page);
    await startLevelDirect(page, 'w1l2');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('.pause-panel')).toBeVisible();
  });
});
