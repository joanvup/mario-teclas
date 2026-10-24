import { expect, test } from '@playwright/test';
import {
  finishLevel,
  keyToPlaywright,
  monitorErrors,
  openMenu,
  resetApp,
  snapshot,
  startFirstLevelFromMenu,
  startLevelDirect,
  storeState,
} from '../e2e/helpers.js';

test.describe('build de producción', () => {
  test('sirve el sitio estático, carga sin errores y permite jugar un nivel completo', async ({ page }) => {
    const errors = monitorErrors(page);
    const failedRequests = [];
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`);
    });

    await resetApp(page);
    await openMenu(page);
    await startFirstLevelFromMenu(page);

    // El nivel construido procede del bundle compilado, no de los módulos de desarrollo.
    const built = await page.evaluate(() => ({
      id: window.__TKA__.game.level.id,
      platforms: window.__TKA__.game.level.platforms.length,
      hasPortal: Boolean(window.__TKA__.game.level.portal),
    }));
    expect(built.id).toBe('w1l1');
    expect(built.platforms).toBeGreaterThan(0);
    expect(built.hasPortal).toBe(true);

    // Entra a un nivel con retos de teclado y resuélvelos dentro del build.
    await startLevelDirect(page, 'w2l1');
    const gateCount = await page.evaluate(() => window.__TKA__.game.level.gates.length);
    expect(gateCount).toBeGreaterThan(0);

    const total = gateCount;
    for (let index = 0; index < total; index += 1) {
      const opened = await page.evaluate((i) => window.__TKA__.openGate(i), index);
      expect(opened).toBe(true);
      await expect(page.locator('.challenge-modal')).toBeVisible();
      const keys = await page.evaluate(
        (i) => window.__TKA__.game.level.gates[i].keys,
        index,
      );
      for (const key of keys) {
        await page.keyboard.press(keyToPlaywright(key));
      }
      await expect(page.locator('.challenge-modal')).toHaveCount(0, { timeout: 5000 });
    }

    await finishLevel(page);
    const state = await storeState(page);
    expect(state.completed).toBe(1);
    expect(state.stars).toBeGreaterThanOrEqual(1);

    // La persistencia funciona también con el sitio compilado.
    await page.reload();
    await expect(page.locator('[data-action="title-start"]')).toBeVisible();
    await openMenu(page);
    const persisted = await page.evaluate(() => ({
      completed: window.__TKA__.store.completedCount(),
      stars: window.__TKA__.store.totalStars(),
    }));
    expect(persisted.completed).toBe(1);
    expect(persisted.stars).toBe(state.stars);

    const finalSnapshot = await snapshot(page);
    expect(finalSnapshot).toBeTruthy();
    expect(failedRequests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('los recursos compilados (JS y CSS) responden 200', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('[data-action="title-start"]')).toBeVisible();

    const assets = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((url) => /\.(js|css)(\?|$)/.test(url)),
    );
    expect(assets.length).toBeGreaterThan(0);

    for (const url of assets) {
      const response = await request.get(url);
      expect(response.status(), `recurso ${url}`).toBeLessThan(400);
    }
  });
});
