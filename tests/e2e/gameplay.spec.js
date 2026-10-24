import { expect, test } from '@playwright/test';
import {
  finishLevel,
  monitorErrors,
  openMenu,
  resetApp,
  snapshot,
  startFirstLevelFromMenu,
  startLevelDirect,
} from './helpers.js';

test.describe('juego de plataformas', () => {
  test('las flechas mueven, ESPACIO salta y el HUD se actualiza', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await openMenu(page);
    await startFirstLevelFromMenu(page);

    await expect(page.locator('#hud-world')).toContainText('Mundo 1');
    await expect(page.locator('#hud-name')).toContainText('¡Hola, teclado!');
    await expect(page.locator('#hud-hearts')).toHaveText('❤❤❤');
    await expect(page.locator('#hud-coins')).toContainText('/');

    const start = await page.evaluate(() => ({
      x: window.__TKA__.game.player.x,
      y: window.__TKA__.game.player.y,
    }));
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1400);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(120);
    const moved = await page.evaluate(() => ({
      x: window.__TKA__.game.player.x,
      y: window.__TKA__.game.player.y,
      coins: window.__TKA__.game.coins,
      state: window.__TKA__.game.player.state,
    }));
    expect(moved.x).toBeGreaterThan(start.x + 100);
    expect(moved.coins).toBeGreaterThan(0);
    await expect(page.locator('#hud-coins')).not.toContainText('🪙 0/');

    // Moverse a la izquierda también funciona.
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(80);
    const back = await page.evaluate(() => window.__TKA__.game.player.x);
    expect(back).toBeLessThan(moved.x);

    // Salto real con la barra espaciadora.
    const groundY = await page.evaluate(() => window.__TKA__.game.player.y);
    await page.keyboard.down('Space');
    await page.waitForTimeout(190);
    const airY = await page.evaluate(() => ({
      y: window.__TKA__.game.player.y,
      state: window.__TKA__.game.player.state,
    }));
    await page.keyboard.up('Space');
    expect(airY.y).toBeLessThan(groundY - 50);
    expect(['jump', 'fall']).toContain(airY.state);

    await page.waitForFunction(
      () => window.__TKA__.game.player.onGround === true,
      undefined,
      { timeout: 5000 },
    );

    expect(errors).toEqual([]);
  });

  test('plataformas móviles, obstáculos, monedas y banderines funcionan en el bucle real', async ({
    page,
  }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await startLevelDirect(page, 'w1l3');

    const game = await page.evaluate(() => ({
      moving: window.__TKA__.game.level.platforms
        .filter((p) => p.moving)
        .map((p) => ({ id: p.id, x: p.x, y: p.y, axis: p.moving.axis })),
      obstacle: window.__TKA__.game.level.obstacles[0]
        ? { x: window.__TKA__.game.level.obstacles[0].x, id: 'obs' }
        : null,
      checkpoint: window.__TKA__.game.level.checkpoints[0]
        ? {
            x: window.__TKA__.game.level.checkpoints[0].x,
            y: window.__TKA__.game.level.checkpoints[0].y,
          }
        : null,
      coin: window.__TKA__.game.level.coins[0]
        ? { x: window.__TKA__.game.level.coins[0].x, y: window.__TKA__.game.level.coins[0].y }
        : null,
    }));
    expect(game.moving.length).toBe(2);
    expect(game.checkpoint).toBeTruthy();
    expect(game.coin).toBeTruthy();

    await page.waitForTimeout(450);
    const movedPlatforms = await page.evaluate(() =>
      window.__TKA__.game.level.platforms
        .filter((p) => p.moving)
        .map((p) => ({ id: p.id, x: p.x, y: p.y })),
    );
    const changed = movedPlatforms.some((p) => {
      const before = game.moving.find((m) => m.id === p.id);
      return Math.abs(p.x - before.x) > 0.5 || Math.abs(p.y - before.y) > 0.5;
    });
    expect(changed).toBe(true);

    // Moneda: el bucle de juego detecta la colisión.
    await page.evaluate((coin) => {
      window.__TKA__.game.player.x = coin.x - 15;
      window.__TKA__.game.player.y = coin.y - 24;
      window.__TKA__.game.player.vx = 0;
      window.__TKA__.game.player.vy = 0;
    }, game.coin);
    await page.waitForFunction(() => window.__TKA__.game.coins > 0);
    expect((await snapshot(page)).hud.coins).toBeGreaterThan(0);

    // Banderín: restaura corazones y activa el punto de reaparición.
    await page.evaluate((cp) => {
      window.__TKA__.game.hearts = 1;
      window.__TKA__.game.player.x = cp.x - 15;
      window.__TKA__.game.player.y = cp.y - 20;
      window.__TKA__.game.player.vx = 0;
      window.__TKA__.game.player.vy = 0;
    }, game.checkpoint);
    await page.waitForFunction(
      () => window.__TKA__.game.level.checkpoints.some((cp) => cp.active),
      undefined,
      { timeout: 4000 },
    );
    expect(await page.evaluate(() => window.__TKA__.game.hearts)).toBe(3);

    // Obstáculo amistoso: quita un corazón y empuja, sin terminar el nivel.
    if (game.obstacle) {
      await page.evaluate(() => {
        const obs = window.__TKA__.game.level.obstacles[0];
        window.__TKA__.game.player.x = obs.x;
        window.__TKA__.game.player.y = obs.y;
        window.__TKA__.game.player.invulnerableUntil = 0;
        window.__TKA__.game.player.vx = 0;
        window.__TKA__.game.player.vy = 0;
      });
      await page.waitForFunction(() => window.__TKA__.game.hearts < 3, undefined, {
        timeout: 4000,
      });
      expect((await snapshot(page)).state).toBe('playing');
    }

    expect(errors).toEqual([]);
  });

  test('al completar el nivel se muestran estrellas y se desbloquea el siguiente', async ({
    page,
  }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await startLevelDirect(page, 'w1l1');
    await finishLevel(page);

    await expect(page.locator('.victory-title')).toContainText('¡Nivel completado!');
    await expect(page.locator('.victory-stars .on')).toHaveCount(3);
    await expect(page.locator('.victory-stats')).toContainText('Precisión');
    await expect(page.locator('.victory-message')).not.toBeEmpty();

    const state = await page.evaluate(() => ({
      completed: window.__TKA__.store.completedCount(),
      stars: window.__TKA__.store.totalStars(),
      unlocked: window.__TKA__.store.isLevelUnlocked('w1l2'),
    }));
    expect(state).toEqual({ completed: 1, stars: 3, unlocked: true });

    await page.locator('[data-action="victory-next"]').click();
    await expect(page.locator('.intro-screen')).toBeVisible();
    await expect(page.locator('.world-banner__title')).toContainText('Caminos y saltos');
    await page.locator('[data-action="start-level"]').click();
    await page.waitForFunction(() => window.__TKA__.game.state === 'playing');
    expect(await page.evaluate(() => window.__TKA__.game.level.id)).toBe('w1l2');

    await page.locator('[data-action="pause"]').click();
    await expect(page.locator('.pause-panel')).toBeVisible();
    await page.locator('[data-action="exit-level"]').click();
    await expect(page.locator('.level-card')).toHaveCount(4);
    await expect(page.locator('.level-card').nth(1)).toBeEnabled();

    expect(errors).toEqual([]);
  });
});
