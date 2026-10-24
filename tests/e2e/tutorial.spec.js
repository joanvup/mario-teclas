import { expect, test } from '@playwright/test';
import { monitorErrors, openMenu, resetApp, storeState } from './helpers.js';

test.describe('tutorial inicial interactivo', () => {
  test('recorre las cuatro teclas y deja lista la primera aventura', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await openMenu(page);
    await page.locator('[data-action="play-next"]').click();

    await expect(page.locator('.tutorial-modal')).toBeVisible();
    await expect(page.locator('.tutorial-modal .eyebrow')).toContainText('Paso 1 de 4');
    await expect(page.locator('.tutorial-modal .modal__text')).toContainText('flecha derecha');
    await expect(page.locator('#tutorial-keyboard .vkb__key.is-target')).toHaveCount(1);

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.tutorial-modal .eyebrow')).toContainText('Paso 2 de 4');
    await expect(page.locator('.tutorial-modal .modal__text')).toContainText('flecha izquierda');

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.tutorial-modal .eyebrow')).toContainText('Paso 3 de 4');
    await expect(page.locator('.tutorial-modal .modal__text')).toContainText('barra espaciadora');

    await page.keyboard.press('Space');
    await expect(page.locator('.tutorial-modal .eyebrow')).toContainText('Paso 4 de 4');
    await expect(page.locator('.tutorial-modal .modal__title')).toContainText('tecla mágica');

    await page.keyboard.press('a');
    await expect(page.locator('.tutorial-modal')).toHaveCount(0);
    await expect(page.locator('.intro-screen')).toBeVisible();
    await expect(page.locator('.world-banner__title')).toContainText('¡Hola, teclado!');

    const state = await storeState(page);
    expect(state.tutorialDone).toBe(true);
    expect(errors).toEqual([]);
  });

  test('una tecla equivocada no bloquea y muestra una pista amable', async ({ page }) => {
    await resetApp(page);
    await openMenu(page);
    await page.locator('[data-action="play-next"]').click();
    await expect(page.locator('.tutorial-modal')).toBeVisible();

    await page.keyboard.press('x');
    await expect(page.locator('.tutorial-modal .modal__text')).toContainText('¡Casi!');
    await expect(page.locator('.tutorial-modal .eyebrow')).toContainText('Paso 1 de 4');

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.tutorial-modal .eyebrow')).toContainText('Paso 2 de 4');
  });

  test('el botón Saltar tutorial también completa el tutorial', async ({ page }) => {
    await resetApp(page);
    await openMenu(page);
    await page.locator('[data-action="play-next"]').click();
    await expect(page.locator('.tutorial-modal')).toBeVisible();
    await page.locator('[data-action="tutorial-skip"]').click();
    await expect(page.locator('.tutorial-modal')).toHaveCount(0);
    await expect(page.locator('.intro-screen')).toBeVisible();
    expect((await storeState(page)).tutorialDone).toBe(true);
  });

  test('se puede tocar la tecla iluminada del teclado virtual', async ({ page }) => {
    await resetApp(page);
    await openMenu(page);
    await page.locator('[data-action="play-next"]').click();
    await expect(page.locator('.tutorial-modal')).toBeVisible();
    await page.locator('#tutorial-keyboard .vkb__key.is-target').click();
    await expect(page.locator('.tutorial-modal .eyebrow')).toContainText('Paso 2 de 4');
  });
});
