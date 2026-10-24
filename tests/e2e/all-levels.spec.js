import { expect, test } from '@playwright/test';
import {
  keyToPlaywright,
  monitorErrors,
  resetApp,
  storeState,
  typeParagraph,
} from './helpers.js';

test.describe('los 48 niveles', () => {
  test('se inician y completan con teclado real, y otorgan 144 estrellas', async ({ page }) => {
    test.setTimeout(420_000);
    const errors = monitorErrors(page);
    await resetApp(page);

    const levelIds = await page.evaluate(() => window.__TKA__.levels.map((l) => l.id));
    expect(levelIds).toHaveLength(48);

    for (let index = 0; index < levelIds.length; index += 1) {
      const levelId = levelIds[index];
      await page.evaluate((id) => window.__TKA__.startAnyLevel(id), levelId);
      await page.waitForFunction(
        (id) => window.__TKA__.game.state === 'playing' && window.__TKA__.game.level?.id === id,
        levelId,
      );

      const built = await page.evaluate(() => {
        const level = window.__TKA__.game.level;
        return {
          id: level.id,
          gates: level.gates.map((g) => ({ keys: g.keys, paragraph: g.paragraph ?? null, x: g.x })),
          coins: level.coins.length,
          requiredCoins: level.requiredCoins,
          platforms: level.platforms.length,
          checkpoints: level.checkpoints.length,
          obstacles: level.obstacles.length,
          width: level.width,
        };
      });
      expect(built.id).toBe(levelId);
      expect(built.platforms).toBeGreaterThan(0);
      expect(built.coins).toBeGreaterThanOrEqual(built.requiredCoins);
      expect(built.width).toBeGreaterThan(700);

      for (let gateIndex = 0; gateIndex < built.gates.length; gateIndex += 1) {
        const opened = await page.evaluate((i) => window.__TKA__.openGate(i), gateIndex);
        expect(opened, `${levelId} burbuja ${gateIndex}`).toBe(true);
        await expect(page.locator('.challenge-modal')).toBeVisible();
        const gate = await page.evaluate(
          (i) => {
            const current = window.__TKA__.game.level.gates[i];
            return { keys: current.keys, paragraph: current.paragraph ?? null };
          },
          gateIndex,
        );
        if (gate.paragraph) {
          await typeParagraph(page, gate.paragraph);
        } else {
          for (const key of gate.keys) {
            await page.keyboard.press(keyToPlaywright(key));
          }
        }
        await expect(page.locator('.challenge-modal')).toHaveCount(0, { timeout: 5000 });
        expect(
          await page.evaluate((i) => window.__TKA__.game.level.gates[i].completed, gateIndex),
          `${levelId} burbuja ${gateIndex} sin completar`,
        ).toBe(true);
      }

      await page.evaluate(() => window.__TKA__.finishActiveLevel());
      await expect(page.locator('.victory-card')).toBeVisible();
      await expect(page.locator('.victory-stars .on')).toHaveCount(3);
      const state = await storeState(page);
      expect(state.completed, `${levelId} completado`).toBe(index + 1);
      expect(state.stars, `${levelId} estrellas`).toBe((index + 1) * 3);
    }

    const final = await storeState(page);
    expect(final.completed).toBe(48);
    expect(final.stars).toBe(144);
    await expect(page.locator('.victory-title')).toContainText('¡Reino recuperado!');
    await expect(page.locator('.final-banner')).toContainText('48 niveles');

    await page.locator('[data-action="victory-progress"]').click();
    await expect(page.locator('.summary-card').nth(0)).toContainText('48/48');
    await expect(page.locator('.summary-card').nth(1)).toContainText('144/144');
    await expect(page.locator('.progress-world')).toHaveCount(12);

    expect(errors).toEqual([]);
  });
});
