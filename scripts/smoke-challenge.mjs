import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => window.__TKA__.startAnyLevel('w2l1'));
await page.waitForTimeout(500);
await page.evaluate(() => window.__TKA__.openGate(0));
await page.waitForTimeout(400);
console.log('challenge visible:', await page.locator('.challenge-modal').isVisible());
console.log('prompt:', await page.locator('.challenge-prompt').textContent());
await page.screenshot({ path: 'test-results/challenge.png' });
await page.keyboard.press('s');
await page.waitForTimeout(400);
console.log('after wrong feedback:', await page.locator('.challenge-feedback').textContent());
await page.screenshot({ path: 'test-results/challenge-wrong.png' });
await page.keyboard.press('a');
await page.waitForTimeout(600);
console.log('challenge closed:', await page.locator('.challenge-modal').count());
console.log('gate state:', await page.evaluate(() => window.__TKA__.game.level.gates.map(g => ({completed: g.completed, progress: g.progress}))));
await page.screenshot({ path: 'test-results/after-gate.png' });
// Reto de secuencia
await page.evaluate(() => window.__TKA__.startAnyLevel('w2l3'));
await page.waitForTimeout(400);
await page.evaluate(() => window.__TKA__.openGate(1));
await page.waitForTimeout(300);
console.log('sequence prompt:', await page.locator('.challenge-prompt').textContent());
await page.keyboard.press('i');
await page.waitForTimeout(250);
console.log('slots:', await page.locator('.challenge-slot').allTextContents());
await page.screenshot({ path: 'test-results/sequence.png' });
await page.keyboard.press('u');
await page.waitForTimeout(400);
console.log('gate2 completed:', await page.evaluate(() => window.__TKA__.game.level.gates[1].completed));
// Portal/victory con hook de prueba
await page.evaluate(() => window.__TKA__.finishActiveLevel());
await page.waitForTimeout(500);
console.log('victory:', await page.locator('.victory-card').isVisible());
console.log('errors:', errors);
await browser.close();
