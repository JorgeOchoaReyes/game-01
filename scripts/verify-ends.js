// Verify the lose screen, win screen, and reset-to-play all render.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8198;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' });
  fs.createReadStream(fp).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: EXEC });
  const page = await browser.newPage({ viewport: { width: 420, height: 820 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const out = path.join(ROOT, 'scripts', 'shots');
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.click('.big'); await page.waitForTimeout(300);

  // Force a LOSE (fuel to 0)
  await page.evaluate(() => { window.__EMBER.game.fuel = 0.01; });
  await page.waitForTimeout(300);
  const loseTxt = await page.textContent('.screen');
  await page.screenshot({ path: path.join(out, '6-gameover.png') });

  // Reset via Play Again
  await page.click('.big'); await page.waitForTimeout(300);
  const playingAfterReset = await page.evaluate(() => window.__EMBER.game.state);

  // Force a WIN (jump to end of night 5)
  await page.evaluate(() => { const g = window.__EMBER.game; g.night = 5; g.phase = 'night'; g.phaseTime = 0.01; });
  await page.waitForTimeout(300);
  const winTxt = await page.textContent('.screen');
  await page.screenshot({ path: path.join(out, '7-win.png') });

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('lose screen has DIED:', /DIED/.test(loseTxt));
  console.log('reset -> state:', playingAfterReset);
  console.log('win screen has SURVIVED:', /SURVIVED/.test(winTxt));
  console.log('errors:', errors.length ? errors.join('; ') : 'none');
  const ok = /DIED/.test(loseTxt) && playingAfterReset === 'play' && /SURVIVED/.test(winTxt) && !errors.length;
  console.log('ENDS OK:', ok);
  process.exit(ok ? 0 : 1);
})();
