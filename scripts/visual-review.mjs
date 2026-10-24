#!/usr/bin/env node
/**
 * Revisión visual manual: captura varios mundos, el taller de práctica y una
 * pantalla pequeña. No forma parte de la suite automática; sirve para revisar
 * el resultado con ojos humanos.
 *
 * Requisito: servidor de desarrollo en http://127.0.0.1:5173/
 * Uso: node scripts/visual-review.mjs
 */

import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173/';
const OUT = 'artifacts/visual-review';
const LEVELS = ['w1l1', 'w3l3', 'w5l4', 'w6l3', 'w8l2', 'w9l1', 'w10l2', 'w11l4', 'w12l4'];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.locator('[data-action="title-start"]').click();
await page.locator('[data-action="practice"]').first().click();
await page.locator('.practice-target__key').waitFor();
await page.screenshot({ path: `${OUT}/practica.png`, fullPage: true });

for (const id of LEVELS) {
  await page.evaluate((levelId) => window.__TKA__.startAnyLevel(levelId), id);
  await page.waitForFunction(
    (levelId) => window.__TKA__.game.state === 'playing' && window.__TKA__.game.level?.id === levelId,
    id,
  );
  // Avanza un poco para ver plataformas y decoración en movimiento.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/${id}.png`, fullPage: true });
  const snapshot = await page.evaluate(() => window.__TKA__.snapshot());
  console.log(
    `${id}: x=${Math.round(snapshot.player?.x ?? 0)} ` +
      `monedas=${snapshot.hud?.coins ?? '?'}/${snapshot.level?.coins ?? '?'} estado=${snapshot.state}`,
  );
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(() => window.__TKA__.startAnyLevel('w12l1'));
await page.waitForFunction(
  () => window.__TKA__.game.state === 'playing' && window.__TKA__.game.level?.id === 'w12l1',
);
await page.evaluate(() => window.__TKA__.openGate(0));
await page.locator('.paragraph-card').waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/parrafo.png`, fullPage: true });
await page.keyboard.press('Escape');

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.__TKA__.startAnyLevel('w5l2'));
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/movil.png`, fullPage: true });

await browser.close();

if (errors.length) {
  console.error('Errores de consola:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Capturas en ${OUT}/ sin errores de consola.`);
}
