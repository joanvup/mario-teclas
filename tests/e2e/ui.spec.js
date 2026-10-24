import { expect, test } from '@playwright/test';
import { monitorErrors, openMenu, resetApp, storeState } from './helpers.js';

test.describe('configuración, accesibilidad y diseño responsive', () => {
  test('las preferencias se aplican y persisten tras recargar', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await openMenu(page);
    await page.locator('[data-action="settings"]').first().click();

    await page.locator('[data-setting="highContrast"]').click();
    await expect(page.locator('body')).toHaveClass(/high-contrast/);
    await expect(page.locator('[data-setting="highContrast"]')).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await page.locator('[data-setting="largeText"]').click();
    await expect(page.locator('body')).toHaveClass(/large-text/);

    await page.locator('[data-setting="reducedMotion"]').click();
    await expect(page.locator('body')).toHaveClass(/reduced-motion/);

    let state = await storeState(page);
    expect(state.settings).toMatchObject({
      highContrast: true,
      largeText: true,
      reducedMotion: true,
    });

    await page.reload();
    await expect(page.locator('[data-action="title-start"]')).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/high-contrast/);
    await expect(page.locator('body')).toHaveClass(/large-text/);
    await expect(page.locator('body')).toHaveClass(/reduced-motion/);
    await openMenu(page);
    await page.locator('[data-action="settings"]').first().click();
    await expect(page.locator('[data-setting="highContrast"]')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    state = await storeState(page);
    expect(state.settings.highContrast).toBe(true);
    expect(errors).toEqual([]);
  });

  test('cambia distribución, modo de aprendizaje y volumen', async ({ page }) => {
    await resetApp(page);
    await openMenu(page);
    await page.locator('[data-action="settings"]').first().click();

    await page.locator('#setting-layout').selectOption('us');
    let state = await storeState(page);
    expect(state.settings.layout).toBe('us');
    await expect(page.locator('#settings-keyboard .vkb__key[data-label=";"]')).toBeVisible();

    await page.locator('[data-action="set-mode"][data-mode="position"]').click();
    state = await storeState(page);
    expect(state.settings.inputMode).toBe('position');
    await expect(page.locator('[data-action="set-mode"][data-mode="position"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.evaluate(() => {
      const slider = document.getElementById('setting-volume');
      slider.value = '30';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    state = await storeState(page);
    expect(state.settings.volume).toBeCloseTo(0.3);
    await expect(page.locator('#volume-label')).toHaveText('30%');

    await page.locator('#setting-layout').selectOption('latam');
    await expect(page.locator('#settings-keyboard .vkb__key[data-label="Ñ"]')).toBeVisible();
  });

  test('los controles táctiles aparecen cuando se activan', async ({ page }) => {
    await resetApp(page);
    await openMenu(page);
    await page.locator('[data-action="settings"]').first().click();
    await page.locator('[data-setting="onScreenControls"]').click();
    await page.locator('[data-action="back-settings"]').click();
    await page.locator('[data-action="continue"]').click();
    await page.locator('[data-action="start-level"]').click();
    await page.waitForFunction(() => window.__TKA__.game.state === 'playing');
    await expect(page.locator('#onscreen')).toBeVisible();
    await expect(page.locator('#onscreen [data-control="left"]')).toBeVisible();
    await expect(page.locator('#onscreen [data-control="right"]')).toBeVisible();
    await expect(page.locator('#onscreen [data-control="jump"]')).toBeVisible();
  });

  test('la portada y el menú caben en una pantalla pequeña sin desbordarse', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await resetApp(page);
    const overflowTitle = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflowTitle).toBeLessThanOrEqual(1);
    await expect(page.locator('[data-action="title-start"]')).toBeVisible();
    const box = await page.locator('[data-action="title-start"]').boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);

    await openMenu(page);
    const overflowMenu = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflowMenu).toBeLessThanOrEqual(1);
    await expect(page.locator('.menu-actions')).toBeVisible();

    await page.locator('[data-action="worlds"]').click();
    const overflowWorlds = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflowWorlds).toBeLessThanOrEqual(1);
    await expect(page.locator('.world-card')).toHaveCount(12);

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.locator('[data-action="menu"]').click();
    await expect(page.locator('.menu-title')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);
  });

  test('el juego se adapta a una ventana pequeña durante la partida', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await resetApp(page);
    await page.evaluate(() => window.__TKA__.startAnyLevel('w1l1'));
    await page.waitForFunction(() => window.__TKA__.game.state === 'playing');
    await expect(page.locator('#game-canvas')).toBeVisible();
    await expect(page.locator('#hud-name')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    const canvasBox = await page.locator('#game-canvas').boundingBox();
    expect(canvasBox.width).toBeLessThanOrEqual(360);
  });
});
