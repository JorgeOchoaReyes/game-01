// Balance probe: run a *sensible-player* bot through entire games at logic
// speed (no rendering) and report outcomes. Signals whether good play wins and
// how close the margins are. Run several games to see the spread.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8197;
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
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });

  const games = await page.evaluate((N) => {
    const E = window.__EMBER;
    const results = [];

    function steer(tx, ty, noise) {
      const dx = tx - E.survivor.x + (noise || 0) * (Math.random() - 0.5) * 120;
      const dy = ty - E.survivor.y + (noise || 0) * (Math.random() - 0.5) * 120;
      const d = Math.hypot(dx, dy) || 1;
      E.input.active = true; E.input.dx = dx / d; E.input.dy = dy / d;
      E.input.mag = d > 10 ? 1 : d / 10;
    }
    function nearestTree() {
      let best = null, bd = 1e9;
      for (const t of E.trees) { const dd = (t.x - E.survivor.x) ** 2 + (t.y - E.survivor.y) ** 2; if (dd < bd) { bd = dd; best = t; } }
      return best;
    }

    function play(policy) {
      E.start();
      const G = E.game;
      let minFuel = 100, minWarmth = 100, feeds = 0, buys = 0, guard = 0;
      const dt = 1 / 30;
      while (G.state === 'play' && guard < 30000) {
        guard++;
        const cap = E.carryCap();
        if (G.bank >= 5 && G.fuel < policy.feedAt) { E.feed(); feeds++; }
        if (G.fuel > 62 && G.warmth > 55) {
          for (const k of ['stoke', 'satchel', 'ashheart', 'coat']) {
            if (E.upgrades[k].lvl < E.upgrades[k].max && G.bank >= E.cost(k) + 10) { E.buy(k); buys++; break; }
          }
        }
        if (G.warmth < policy.warmAt) steer(E.cfg.fireX, E.cfg.fireY, policy.noise);
        else if (G.carry < cap && E.trees.length) { const t = nearestTree(); if (t) steer(t.x, t.y, policy.noise); }
        else steer(E.cfg.fireX, E.cfg.fireY, policy.noise);
        E.step(dt);
        if (G.fuel < minFuel) minFuel = G.fuel;
        if (G.warmth < minWarmth) minWarmth = G.warmth;
      }
      return {
        policy: policy.name, outcome: G.state, night: G.night, phase: G.phase,
        minFuel: Math.round(minFuel), minWarmth: Math.round(minWarmth),
        feeds, buys, wood: G.woodPopped, burned: G.shadesBurned
      };
    }

    const sensible = { name: 'sensible', feedAt: 48, warmAt: 28, noise: 0 };
    const careless = { name: 'careless', feedAt: 26, warmAt: 14, noise: 0.6 };
    for (let g = 0; g < N; g++) results.push(play(sensible));
    for (let g = 0; g < N; g++) results.push(play(careless));
    return results;
  }, 5);

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('--- BALANCE (sensible vs careless, 5 games each) ---');
  games.forEach((r) => console.log(
    `${r.policy.padEnd(9)} ${r.outcome.toUpperCase().padEnd(4)} night ${r.night}(${r.phase}) | ` +
    `minFuel ${String(r.minFuel).padStart(3)} minWarmth ${String(r.minWarmth).padStart(3)} | ` +
    `feeds ${r.feeds} buys ${r.buys} wood ${r.wood} burned ${r.burned}`));
  const w = (n) => games.filter((r) => r.policy === n && r.outcome === 'win').length;
  const c = (n) => games.filter((r) => r.policy === n).length;
  console.log(`sensible wins: ${w('sensible')}/${c('sensible')}   careless wins: ${w('careless')}/${c('careless')}`);
})();
