import { expect, test } from '@playwright/test';
import { monitorErrors, openMenu, resetApp } from './helpers.js';

test.describe('portada, menú y selección de niveles', () => {
  test('la portada y el menú ofrecen todas las secciones obligatorias', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);

    await expect(page.locator('.title-logo')).toContainText('Teclado');
    await expect(page.locator('.title-sub')).toContainText('El Reino de las Teclas');
    await expect(page.locator('.title-hint')).toContainText('Enter');

    await page.locator('[data-action="title-start"]').click();
    await expect(page.locator('.menu-title')).toBeVisible();
    await expect(page.locator('.profile-strip__name').first()).toContainText('Aventurero');

    for (const action of [
      'play-next',
      'continue',
      'worlds',
      'progress',
      'practice',
      'settings',
      'about',
    ]) {
      await expect(page.locator(`[data-action="${action}"]`).first()).toBeVisible();
    }
    await expect(page.locator('[data-action="play-next"]')).toContainText('Jugar');
    await expect(page.locator('[data-action="continue"]')).toContainText('aventura');

    expect(errors).toEqual([]);
  });

  test('Enter en la portada abre el menú', async ({ page }) => {
    await resetApp(page);
    await page.keyboard.press('Enter');
    await expect(page.locator('.menu-title')).toBeVisible();
  });

  test('el mapa muestra 12 mundos y solo el primero está desbloqueado al inicio', async ({
    page,
  }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await openMenu(page);
    await page.locator('[data-action="worlds"]').click();

    await expect(page.locator('.world-card')).toHaveCount(12);
    await expect(page.locator('.world-card').first()).toBeEnabled();
    for (let i = 1; i < 12; i += 1) {
      await expect(page.locator('.world-card').nth(i)).toBeDisabled();
      await expect(page.locator('.world-card').nth(i)).toContainText('Completa el mundo anterior');
    }
    await expect(page.locator('.world-card').first()).toContainText('Pradera');
    await expect(page.locator('.world-card').last()).toContainText('Palacio');
    await expect(page.locator('.world-card').last()).toContainText('Párrafos');

    await page.locator('.world-card').first().click();
    await expect(page.locator('.level-card')).toHaveCount(4);
    await expect(page.locator('.level-card').first()).toBeEnabled();
    for (let i = 1; i < 4; i += 1) {
      await expect(page.locator('.level-card').nth(i)).toBeDisabled();
    }
    await expect(page.locator('.world-banner__title')).toContainText('Pradera');

    await page.locator('.level-card').first().click();
    await expect(page.locator('.intro-screen')).toBeVisible();
    await expect(page.locator('.world-banner__title')).toContainText('¡Hola, teclado!');
    await expect(page.locator('[data-action="start-level"]')).toBeVisible();
    await expect(page.locator('.demo-keys .kbd-chip')).toHaveCount(2);
    await expect(page.locator('#intro-keyboard .vkb')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('las pantallas Acerca de, Configuración y Práctica son accesibles', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await openMenu(page);

    await page.locator('[data-action="about"]').first().click();
    await expect(page.locator('.about-hero')).toContainText('Tecladoaventura');
    await expect(page.locator('.about-grid')).toContainText('Recursos originales');
    await expect(page.locator('.about-grid')).toContainText('No se usan sprites');
    await page.locator('[data-action="menu"]').click();
    await expect(page.locator('.menu-title')).toBeVisible();

    await page.locator('[data-action="settings"]').first().click();
    await expect(page.locator('.settings-layout')).toBeVisible();
    await expect(page.locator('#setting-layout')).toBeVisible();
    await expect(page.locator('#settings-keyboard .vkb')).toBeVisible();
    await page.locator('[data-action="back-settings"]').click();
    await expect(page.locator('.menu-title')).toBeVisible();

    await page.locator('[data-action="practice"]').first().click();
    await expect(page.locator('.practice-target__key')).toBeVisible();
    await expect(page.locator('#practice-keyboard .vkb')).toBeVisible();
    await expect(page.locator('.workshop-chars')).toContainText('Ñ');
    await page.locator('[data-action="menu"]').click();
    await expect(page.locator('.menu-title')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('Continuar aventura lleva a la introducción del siguiente nivel', async ({ page }) => {
    await resetApp(page);
    await openMenu(page);
    await page.locator('[data-action="continue"]').click();
    await expect(page.locator('.intro-screen')).toBeVisible();
    await expect(page.locator('.world-banner__title')).toContainText('¡Hola, teclado!');
  });
});
