// Screenshot the blue-hot fire (deep night) with irregulars on the field.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8201;
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
  await page.evaluate(() => {
    const E = window.__EMBER;
    E.game.night = 14; E.game.phase = 'night'; E.game.phaseTime = 20; E.game.fuel = 120; E.game.endless = true;
    E.survivor.x = E.cfg.fireX - 40; E.survivor.y = E.cfg.fireY - 20; E.game.carry = 4;
    E.shades.length = 0;
    // a mix of irregulars (teal) and shades around the fire
    for (let i = 0; i < 4; i++) E.shades.push({ x: E.cfg.fireX + Math.cos(i) * 120, y: E.cfg.fireY - 120 + i * 30, r: 13, hp: 30, maxHp: 30, spd: 40, biteCd: 0, playerBiteCd: 0, wob: i, hitFlash: 0, kind: 'irregular', bite: 0 });
    for (let i = 0; i < 3; i++) E.shades.push({ x: E.cfg.fireX - 130 + i * 40, y: E.cfg.fireY + 150, r: 12, hp: 10, maxHp: 10, spd: 30, biteCd: 0, wob: i, hitFlash: 0, kind: 'shade', bite: 4 });
    for (let k = 0; k < 30; k++) E.step(1 / 60);
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/42-bluefire.png') });
  const dom = await page.evaluate(() => ({ night: window.__EMBER.game.night, shades: window.__EMBER.shades.length }));
  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('dom:', JSON.stringify(dom), '| errors:', errs.length);
})();
