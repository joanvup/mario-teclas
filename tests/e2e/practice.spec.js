import { expect, test } from '@playwright/test';
import { keyToPlaywright, monitorErrors, openMenu, resetApp } from './helpers.js';

async function openPractice(page) {
  await resetApp(page);
  await openMenu(page);
  await page.locator('[data-action="practice"]').first().click();
  await expect(page.locator('.practice-target__key')).toBeVisible();
}

async function currentTarget(page) {
  return (await page.locator('.practice-target__key').textContent()).trim();
}

test.describe('práctica de teclado y taller de Ñ/tildes', () => {
  test('acepta la tecla correcta y pasa a otra tecla', async ({ page }) => {
    const errors = monitorErrors(page);
    await openPractice(page);
    const first = await currentTarget(page);
    expect(first.length).toBeGreaterThan(0);

    await page.keyboard.press(keyToPlaywright(first));
    await expect(page.locator('#practice-feedback')).toContainText('¡Muy bien!');
    await expect(page.locator('#practice-score')).toContainText('Aciertos 1');

    await page.waitForFunction(
      (old) =>
        document.getElementById('practice-target')?.textContent.trim() !== old ||
        document.getElementById('practice-feedback')?.textContent.includes('nueva tecla'),
      first,
      { timeout: 5000 },
    );
    await expect(page.locator('#practice-feedback')).toContainText('nueva tecla');
    expect((await currentTarget(page)).length).toBeGreaterThan(0);

    expect(errors).toEqual([]);
  });

  test('un error explica la tecla correcta sin castigar', async ({ page }) => {
    await openPractice(page);
    const target = await currentTarget(page);
    const wrong = target === 'Q' ? 'w' : 'q';
    await page.keyboard.press(wrong);
    await expect(page.locator('#practice-feedback')).toContainText('¡Casi!');
    await expect(page.locator('#practice-feedback')).toContainText(target);
    await expect(page.locator('#practice-score')).toContainText('Errores 1');
    await expect(page.locator('.practice-target__key')).toHaveText(target);

    await page.locator('#practice-keyboard .vkb__key.is-target').click();
    await expect(page.locator('#practice-feedback')).toContainText('¡Muy bien!');
  });

  test('Otra tecla cambia el reto y respeta el teclado virtual', async ({ page }) => {
    await openPractice(page);
    const before = await currentTarget(page);
    await page.locator('[data-action="practice-next"]').click();
    const after = await currentTarget(page);
    expect(after).not.toBe(before);
    await expect(page.locator('#practice-keyboard .vkb__key.is-target')).toHaveText(after);
  });

  test('el taller inserta Ñ y reconoce tildes tecleadas', async ({ page }) => {
    await openPractice(page);

    await page.locator('.workshop-chars [data-char="Ñ"]').click();
    await expect(page.locator('#workshop-input')).toHaveValue('Ñ');
    await expect(page.locator('[data-char-status="Ñ"]')).toHaveClass(/ok/);
    await expect(page.locator('[data-char-status="Ñ"]')).toContainText('✓');

    await page.locator('#workshop-input').fill('ÁÉÍÓÚ');
    for (const char of ['Á', 'É', 'Í', 'Ó', 'Ú']) {
      await expect(page.locator(`[data-char-status="${char}"]`)).toHaveClass(/ok/);
    }
    await expect(page.locator('[data-char-status="Ñ"]')).not.toHaveClass(/ok/);

    await page.evaluate(() => {
      const textarea = document.getElementById('workshop-input');
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });
    await page.locator('.workshop-chars [data-char="Ñ"]').click();
    await expect(page.locator('#workshop-input')).toHaveValue('ÁÉÍÓÚÑ');
    await expect(page.locator('[data-char-status="Ñ"]')).toHaveClass(/ok/);
  });

  test('muestra la distribución y el modo de aprendizaje activos', async ({ page }) => {
    await openPractice(page);
    await expect(page.locator('.practice-card').last()).toContainText('Latinoamérica');
    await expect(page.locator('.practice-card').last()).toContainText('carácter');
    await page.locator('[data-action="settings"]').first().click();
    await expect(page.locator('.settings-layout')).toBeVisible();
  });
});
