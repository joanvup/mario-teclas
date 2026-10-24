import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'test-results/title.png', fullPage: true });
console.log('title:', await page.title());
console.log('buttons:', await page.locator('button').count());
await page.locator('[data-action="title-start"]').click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'test-results/menu.png', fullPage: true });
console.log('menu heading:', await page.locator('h1').first().textContent());
console.log('errors:', errors);
await browser.close();
