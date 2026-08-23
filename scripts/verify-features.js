// Functionally verify the new systems: drop pickup applies a buff, tree collision
// pushes the survivor out, and screenshot drops + a brute + active buffs.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8183;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fs.existsSync(fp)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: EXEC, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 440, height: 820 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
  await page.goto('http://localhost:' + PORT, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.click('.big');
  await page.waitForTimeout(300);

  const res = await page.evaluate(() => {
    const E = window.__EMBER, out = {};
    // drop pickup -> buff applies
    E.game.buffs = {}; E.drops.length = 0;
    E.survivor.x = E.cfg.fireX; E.survivor.y = E.cfg.fireY + 40;
    E.drops.push({ x: E.survivor.x, y: E.survivor.y, type: 'inferno', life: 13, bob: 0 });
    for (let i = 0; i < 3; i++) E.step(1 / 30);
    out.buffApplied = E.game.buffs.inferno > 0;
    out.dropConsumed = E.drops.length === 0;
    // collision: place survivor inside a tree, step, must be pushed out
    const tr = E.trees[0];
    E.survivor.x = tr.x; E.survivor.y = tr.y; E.input.active = false;
    for (let i = 0; i < 3; i++) E.step(1 / 30);
    const dd = Math.hypot(E.survivor.x - tr.x, E.survivor.y - tr.y);
    out.pushedOut = dd >= (E.survivor.r + tr.r * 0.7 - 1);
    return out;
  });

  // screenshot a night with drops + a brute + active buffs
  await page.evaluate(() => {
    const E = window.__EMBER;
    E.game.fuel = 85; E.game.phase = 'night'; E.game.phaseTime = 20; E.game.night = 4; E.game.banner = null;
    E.game.buffs = { inferno: 9, swift: 5 };
    E.drops.push({ x: E.cfg.fireX + 90, y: E.cfg.fireY - 40, type: 'harvest', life: 13, bob: 0 });
    E.drops.push({ x: E.cfg.fireX - 110, y: E.cfg.fireY + 30, type: 'nova', life: 13, bob: 1 });
    const a = 1.0;
    E.shades.push({ x: E.cfg.fireX + Math.cos(a) * 150, y: E.cfg.fireY + Math.sin(a) * 150, r: 19, hp: 80, maxHp: 80, spd: 6, biteCd: 0, wob: 0, hitFlash: 0, kind: 'brute', bite: 7 });
    for (let i = 0; i < 3; i++) { const bb = i * 2; E.shades.push({ x: E.cfg.fireX + Math.cos(bb) * 160, y: E.cfg.fireY + Math.sin(bb) * 160, r: 12, hp: 20, maxHp: 20, spd: 8, biteCd: 0, wob: bb, hitFlash: 0, kind: 'shade', bite: 4 }); }
    E.survivor.x = E.cfg.fireX + 40; E.survivor.y = E.cfg.fireY + 60;
    for (let k = 0; k < 8; k++) E.step(1 / 30);
    E.game.fuel = 85; E.game.banner = null;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/70-features.png') });

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('results:', JSON.stringify(res), '| errors:', errs.length);
  if (errs.length) console.log('ERR:', errs.slice(0, 4).join(' | '));
})();
