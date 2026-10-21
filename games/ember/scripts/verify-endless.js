// Endless-mode check: play the 5-night run to a win, then continue endlessly and
// confirm nights keep climbing past 5, escalation bites (the run eventually ends in
// death), and no runtime errors occur across a long endless session.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8196;
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
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push('con:' + m.text()); });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });

  const out = await page.evaluate(() => {
    const E = window.__EMBER;
    const dt = 1 / 30;
    function steer(tx, ty) { const dx = tx - E.survivor.x, dy = ty - E.survivor.y, d = Math.hypot(dx, dy) || 1; E.input.active = true; E.input.dx = dx / d; E.input.dy = dy / d; E.input.mag = d > 10 ? 1 : d / 10; }
    function nearestTree() { let b = null, bd = 1e9; for (const t of E.trees) { const dd = (t.x - E.survivor.x) ** 2 + (t.y - E.survivor.y) ** 2; if (dd < bd) { bd = dd; b = t; } } return b; }
    function playStep() {
      const G = E.game, cap = E.carryCap();
      if (G.fuel > 70 && G.phase === 'dawn') { for (const k of ['stoke', 'ashheart', 'satchel', 'coat']) { if (E.upgrades[k].lvl < E.upgrades[k].max && G.fuel >= E.cost(k) + 70) { E.buy(k); break; } } }
      if (G.warmth < 30) steer(E.cfg.fireX, E.cfg.fireY);
      else if (G.carry < cap && E.trees.length) { const t = nearestTree(); if (t) steer(t.x, t.y); }
      else steer(E.cfg.fireX, E.cfg.fireY);
      E.step(dt);
    }
    // 1) force the 5-night clear (the milestone) deterministically — the bot's win rate
    //    is a balance question tested elsewhere; here we verify the endless FLOW
    E.start();
    E.game.night = 5; E.game.phase = 'night'; E.game.phaseTime = 0.001; E.game.fuel = 90; E.game.warmth = 90;
    E.step(1 / 30);
    const wonAt = E.game.night, wonState = E.game.state;
    if (wonState !== 'win') return { wonState, wonAt, reachedNight: E.game.night, died: true, errAtWin: true };

    // 2) continue endlessly and keep playing until death
    E.endless();
    const startNight = E.game.night;         // should be 6
    guard = 0;
    while (E.game.state !== 'over' && guard < 120000) { guard++; if (E.game.state === 'levelup') { E.pick(0); continue; } playStep(); }
    return {
      wonAt, endlessFlag: E.game.endless, startNight,
      reachedNight: E.game.night, finalState: E.game.state,
      shades: E.game.shadesBurned, wood: E.game.woodPopped, bonus: E.game.bonus,
      score: (function () { E.game.state = 'over'; return null; })() || null
    };
  });

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('result:', JSON.stringify(out));
  console.log('errors:', errs.length, errs.slice(0, 5).join(' | '));
  const ok = !errs.length && out.wonAt === 5 && out.endlessFlag === true && out.startNight === 6 && out.reachedNight >= 6 && out.finalState === 'over';
  console.log('ENDLESS OK:', ok, '(won night 5, continued, reached night', out.reachedNight + ', then died)');
  process.exit(ok ? 0 : 1);
})();
