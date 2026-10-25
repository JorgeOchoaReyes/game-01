// Screenshot the win screen to confirm the endless "keep the fire burning" flow.
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
  const browser = await chromium.launch({ executablePath: EXEC, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 440, height: 820 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.click('.big'); await page.waitForTimeout(200);
  await page.evaluate(() => { const E = window.__EMBER; E.game.woodPopped = 214; E.game.shadesBurned = 96; E.game.comboBest = 22; E.game.bonus = 4820; E.game.night = 5; E.game.phase = 'night'; window.__end = true; });
  // trigger the win via the internal path by fast-forwarding the night timer
  await page.evaluate(() => { const E = window.__EMBER; E.game.phaseTime = 0.001; E.step(0.01); });
  await page.waitForTimeout(1600);
  const dom = await page.evaluate(() => ({ state: window.__EMBER.game.state, buttons: [].map.call(document.querySelectorAll('.screen button'), (b) => b.textContent) }));
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/41-win.png') });
  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('dom:', JSON.stringify(dom), '| errors:', errs.length);
})();
