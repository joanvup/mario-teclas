import fs from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  finishLevel,
  monitorErrors,
  openMenu,
  resetApp,
  startLevelDirect,
  storeState,
} from './helpers.js';

async function completeFirstLevel(page) {
  await startLevelDirect(page, 'w1l1');
  await finishLevel(page);
}

async function goToProgress(page) {
  await page.locator('[data-action="menu"]').click();
  await expect(page.locator('.menu-title')).toBeVisible();
  await page.locator('[data-action="progress"]').first().click();
  await expect(page.locator('.progress-summary')).toBeVisible();
}

test.describe('progreso y persistencia', () => {
  test('el progreso se guarda en LocalStorage y sobrevive a una recarga', async ({ page }) => {
    const errors = monitorErrors(page);
    await resetApp(page);
    await completeFirstLevel(page);
    expect((await storeState(page)).completed).toBe(1);

    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tecladoaventura.save.v1')),
    );
    expect(saved.app).toBe('tecladoaventura');
    expect(saved.version).toBe(1);
    expect(saved.progress).toBeUndefined();
    expect(saved.profiles[0].progress.w1l1.completed).toBe(true);
    expect(saved.profiles[0].progress.w1l1.stars).toBe(3);

    await page.reload();
    await expect(page.locator('[data-action="title-start"]')).toBeVisible();
    await openMenu(page);
    await expect(page.locator('.profile-strip__meta').first()).toContainText('1 de 48');
    await page.locator('[data-action="progress"]').first().click();

    await expect(page.locator('.summary-card').nth(0)).toContainText('1/48');
    await expect(page.locator('.summary-card').nth(1)).toContainText('3/144');
    await expect(page.locator('.progress-world')).toHaveCount(12);
    await expect(page.locator('.level-row').first()).toContainText('¡Hola, teclado!');
    await expect(page.locator('.level-row').first()).toContainText('Sin datos');
    expect((await storeState(page)).stars).toBe(3);

    expect(errors).toEqual([]);
  });

  test('exporta un JSON válido del perfil activo', async ({ page }) => {
    await resetApp(page);
    await completeFirstLevel(page);
    await goToProgress(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-action="export-progress"]').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^tecladoaventura-progreso-.*\.json$/);
    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    expect(data.app).toBe('tecladoaventura');
    expect(data.version).toBe(1);
    expect(data.profile.progress.w1l1.completed).toBe(true);
    expect(data.profile.alias).toBe('Aventurero');
    expect(data.meta.levelsCompleted).toBe(1);
    expect(data.meta.stars).toBe(3);
    expect(data.meta.note).toContain('No contiene datos personales');
    await download.delete();
  });

  test('rechaza archivos inválidos y acepta un JSON de progreso válido', async ({ page }) => {
    await resetApp(page);
    await completeFirstLevel(page);
    await goToProgress(page);

    await page.locator('#import-file').setInputFiles({
      name: 'roto.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{esto no es json'),
    });
    await expect(page.locator('.toast--error').last()).toContainText('No se pudo importar');
    expect((await storeState(page)).profiles).toBe(1);

    await page.locator('#import-file').setInputFiles({
      name: 'otro-juego.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({ app: 'otro-juego', version: 1, profile: { progress: {} } }),
      ),
    });
    await expect(page.locator('.toast--error').last()).toContainText('no pertenece');
    expect((await storeState(page)).profiles).toBe(1);

    const exported = await page.evaluate(() => window.__TKA__.store.exportActive());
    await page.locator('#import-file').setInputFiles({
      name: 'progreso.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(exported)),
    });
    await expect(page.locator('.toast--success').last()).toContainText('Progreso importado');
    const imported = await storeState(page);
    expect(imported.profiles).toBe(2);
    expect(imported.progress.w1l1.completed).toBe(true);
    await expect(page.locator('.summary-card').nth(0)).toContainText('1/48');
  });

  test('reiniciar el progreso pide confirmación y conserva la configuración', async ({ page }) => {
    await resetApp(page);
    await completeFirstLevel(page);
    await page.evaluate(() => window.__TKA__.store.updateSettings({ largeText: true }));
    await goToProgress(page);

    await page.locator('[data-action="reset-progress"]').click();
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('.modal')).toContainText('¿Reiniciar todo el progreso?');
    await page.locator('[data-action="reset-cancel"]').click();
    await expect(page.locator('.modal')).toHaveCount(0);
    expect((await storeState(page)).completed).toBe(1);

    await page.locator('[data-action="reset-progress"]').click();
    await page.locator('[data-action="reset-confirm"]').click();
    await expect(page.locator('.modal')).toHaveCount(0);
    await expect(page.locator('.summary-card').nth(0)).toContainText('0/48');
    const reset = await storeState(page);
    expect(reset.completed).toBe(0);
    expect(reset.stars).toBe(0);
    expect(reset.tutorialDone).toBe(false);
    expect(reset.settings.largeText).toBe(true);
  });

  test('se pueden crear perfiles locales y cambiar entre ellos', async ({ page }) => {
    await resetApp(page);
    await openMenu(page);
    await page.locator('[data-action="settings"]').first().click();
    await page.locator('#profile-name').fill('Ana');
    await page.locator('#profile-form button[type="submit"]').click();
    await expect(page.locator('.toast--success').last()).toContainText('Ana');
    expect((await storeState(page)).profiles).toBe(2);
    expect((await storeState(page)).alias).toBe('Ana');

    await page.locator('[data-action="back-settings"]').click();
    await expect(page.locator('.menu-title')).toContainText('Ana');

    await page.locator('[data-action="settings"]').first().click();
    await page.locator('.profile-option').first().click();
    expect((await storeState(page)).alias).toBe('Aventurero');
    await page.locator('.profile-option').nth(1).click();
    expect((await storeState(page)).alias).toBe('Ana');
  });
});
