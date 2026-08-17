// Full 3D verification: serve the built index.html (with vendor/three.min.js),
// confirm WebGL renders, drive real bot play, assert feed/upgrade, screenshot.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8190;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const origin = 'http://localhost:' + PORT;
  const browser = await chromium.launch({
    executablePath: EXEC,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']
  });
  const page = await browser.newPage({ viewport: { width: 440, height: 820 }, deviceScaleFactor: 2 });
  const errs = [], ext = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push('con:' + m.text()); });
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:')) ext.push(u); });

  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const glok = await page.evaluate(() => {
    const c = document.getElementById('c');
    return !!(c.getContext('webgl2') || c.getContext('webgl')) && !!window.__EMBER;
  });
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/30-title3d.png') });

  await page.click('.big');
  await page.waitForTimeout(500);

  // drive real play in real time: steer toward nearest tree, feed low, buy rich
  await page.evaluate(async () => {
    const E = window.__EMBER;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let k = 0; k < 240; k++) {
      const g = E.game, cap = E.carryCap();
      let best = null, bd = 1e9;
      for (const t of E.trees) { const dd = (t.x - E.survivor.x) * (t.x - E.survivor.x) + (t.y - E.survivor.y) * (t.y - E.survivor.y); if (dd < bd) { bd = dd; best = t; } }
      let tx, ty;
      if (g.carry < cap && best) { tx = best.x; ty = best.y; } else { tx = E.cfg.fireX; ty = E.cfg.fireY; }
      const dx = tx - E.survivor.x, dy = ty - E.survivor.y, d = Math.hypot(dx, dy) || 1;
      E.input.active = true; E.input.dx = dx / d; E.input.dy = dy / d; E.input.mag = d > 12 ? 1 : d / 12;
      if (g.bank >= 5 && g.fuel < 48) E.feed();
      if (g.bank >= 18) E.buy('stoke');
      await wait(28);
    }
    E.input.active = false;
  });
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/31-play3d.png') });
  const st = await page.evaluate(() => ({
    night: __EMBER.game.night, phase: __EMBER.game.phase, fuel: Math.round(__EMBER.game.fuel),
    warmth: Math.round(__EMBER.game.warmth), wood: __EMBER.game.woodPopped, burned: __EMBER.game.shadesBurned,
    state: __EMBER.game.state, stoke: __EMBER.upgrades.stoke.lvl
  }));
  const act = await page.evaluate(() => {
    const E = window.__EMBER; E.game.bank = 60; const f0 = E.game.fuel; E.feed(); const f1 = E.game.fuel;
    E.buy('ashheart'); return { feedUp: f1 > f0, ash: E.upgrades.ashheart.lvl };
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/32-night3d.png') });

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('webgl+scene:', glok, '| external:', ext.length, '| errors:', errs.length);
  console.log('play:', JSON.stringify(st));
  console.log('actions:', JSON.stringify(act));
  if (errs.length) console.log('ERR:', errs.slice(0, 6).join(' | '));
  const ok = glok && ext.length === 0 && errs.length === 0 && st.wood > 0 && act.feedUp && act.ash === 1;
  console.log('ALL OK:', ok);
  process.exit(ok ? 0 : 1);
})();
