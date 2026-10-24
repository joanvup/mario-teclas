import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.locator('[data-action="title-start"]').click();
// Continuar aventura abre la intro directamente
await page.locator('[data-action="continue"]').click();
await page.waitForTimeout(300);
await page.locator('[data-action="start-level"]').click();
await page.waitForTimeout(300);
console.log('started', await page.evaluate(() => window.__TKA__.snapshot()));
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(7000);
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(700);
console.log('after walk', await page.evaluate(() => window.__TKA__.snapshot()));
console.log('victory visible:', await page.locator('.victory-card').isVisible().catch(() => false));
await page.screenshot({ path: 'test-results/victory.png', fullPage: true });
console.log('storage', await page.evaluate(() => JSON.parse(localStorage.getItem('tecladoaventura.save.v1')).profiles[0].progress));
console.log('errors:', errors);

// Recargar y comprobar persistencia
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-action="title-start"]').click();
await page.waitForTimeout(300);
console.log('menu after reload:', await page.locator('.profile-strip__meta').first().textContent());
await page.screenshot({ path: 'test-results/menu-progress.png', fullPage: true });
await browser.close();
