// Check: light reaches the top at full fuel; player can walk to the bottom bound;
// Super Nova erupts (fells trees, kills shades). Screenshots + a few assertions.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8203;
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

  // full fuel, then screenshot to check light reaches the top
  await page.evaluate(() => { const E = window.__EMBER; E.game.fuel = 125; for (let k = 0; k < 20; k++) E.step(1 / 60); });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/45-light2.png') });

  // walk to the bottom bound and confirm the survivor reaches near BOUND.y1
  const bottom = await page.evaluate(async () => {
    const E = window.__EMBER, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let k = 0; k < 90; k++) { E.input.active = true; E.input.dx = 0; E.input.dy = 1; E.input.mag = 1; E.step(1 / 30); }
    E.input.active = false;
    return { survY: Math.round(E.survivor.y), boundY1: Math.round(E.__b ? 0 : 0), y1: Math.round(window.__EMBER.cfg.fireY) };
  });
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/46-bottom.png') });

  // Super Nova: night 5, spawn trees + shades, collect a supernova drop
  const sn = await page.evaluate(() => {
    const E = window.__EMBER;
    E.game.night = 5; E.game.fuel = 60;
    E.shades.length = 0; for (let i = 0; i < 6; i++) E.shades.push({ x: E.cfg.fireX + Math.cos(i) * 120, y: E.cfg.fireY - 100 + i * 20, r: 12, hp: 20, maxHp: 20, spd: 20, biteCd: 0, playerBiteCd: 0, wob: i, hitFlash: 0, kind: 'shade', bite: 4 });
    const trees0 = E.trees.filter((t) => !t.felling).length, shades0 = E.shades.length, fuel0 = E.game.fuel;
    E.drops.push({ x: E.survivor.x, y: E.survivor.y, type: 'supernova', life: 13, bob: 0 });
    E.step(1 / 30);
    for (let k = 0; k < 40; k++) E.step(1 / 30);   // let felling + flare resolve
    const treesAlive = E.trees.filter((t) => !t.felling).length;
    return { trees0, shades0, fuel0, shadesAfter: E.shades.length, fuelAfter: Math.round(E.game.fuel), felledMost: treesAlive <= 1 };
  });
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/47-supernova.png') });

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('bottom-walk survY:', bottom.survY);
  console.log('supernova:', JSON.stringify(sn));
  console.log('errors:', errs.length, errs.slice(0, 4).join(' | '));
  console.log('SN OK:', sn.shadesAfter === 0 && sn.fuelAfter > sn.fuel0 && !errs.length);
})();
