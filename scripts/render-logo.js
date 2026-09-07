// Render the logo HTML files to PNGs offline via headless Chromium.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = path.join(ROOT, 'logo');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
(async () => {
  const browser = await chromium.launch({ executablePath: EXEC });

  // App icon 1024x1024
  let page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(ROOT, 'scripts/logo-icon.html'), { waitUntil: 'load' });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, 'ember-icon-1024.png'), clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  // also a 512 downscale for convenience
  await page.setViewportSize({ width: 512, height: 512 });
  await page.addStyleTag({ content: '#icon{transform:scale(0.5);transform-origin:top left;}' });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(OUT, 'ember-icon-512.png'), clip: { x: 0, y: 0, width: 512, height: 512 } });
  await page.close();

  // Wordmark on transparent background
  page = await browser.newPage({ viewport: { width: 1600, height: 520 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(ROOT, 'scripts/logo-wordmark.html'), { waitUntil: 'load' });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, 'ember-wordmark.png'), omitBackground: true });
  await page.close();

  // 3:2 logo card (1500x1000) — recommended submission ratio
  page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(ROOT, 'scripts/logo-3x2.html'), { waitUntil: 'load' });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, 'ember-logo-3x2.png'), clip: { x: 0, y: 0, width: 1500, height: 1000 } });
  await page.close();

  await browser.close();
  for (const f of ['ember-icon-1024.png', 'ember-icon-512.png', 'ember-wordmark.png', 'ember-logo-3x2.png']) {
    const s = fs.statSync(path.join(OUT, f));
    console.log('wrote logo/' + f, (s.size / 1024).toFixed(1) + ' KB');
  }
})();
