// Verify: drops spawn far from the fire; enemy contact triggers the hurt flash;
// death sets a strong flash; trees are spread across the frame. Plus screenshots.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'); const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8205; const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => { let p = req.url.split('?')[0]; if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' }); fs.createReadStream(fp).pipe(res); });
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: EXEC, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 440, height: 820 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.click('.big'); await page.waitForTimeout(150);

  const r = await page.evaluate(() => {
    const E = window.__EMBER, dt = 1 / 30, out = {};
    // far drops: spawn a bunch and measure min distance from the fire
    E.drops.length = 0; for (let i = 0; i < 12; i++) E.__spawn ? 0 : E.drops.push(0);
    E.drops.length = 0;
    for (let i = 0; i < 12; i++) { E.game.night = 3; E.pick && 0; window.__EMBER; }
    // use internal spawnDrop via a dawn drop path: call collectDrop indirectly is hard; instead read after killing shades
    // simpler: directly exercise spawnDrop through the exposed randomDropType + drop push isn't exposed, so
    // trigger via nova kill spawning drops. Instead just check tree spread + hurt + death here.

    // tree spread: measure how far the farthest tree is from the fire
    let maxTreeD = 0, minTreeD = 1e9;
    for (const t of E.trees) { const d = Math.hypot(t.x - E.cfg.fireX, t.y - E.cfg.fireY); if (d > maxTreeD) maxTreeD = d; if (d < minTreeD) minTreeD = d; }
    out.treeSpread = Math.round(maxTreeD - minTreeD); out.maxTreeD = Math.round(maxTreeD);

    // hurt on contact: place a shade on the player, step, expect game.hurt > 0
    E.game.hurt = 0; E.shades.length = 0;
    E.survivor.x = 250; E.survivor.y = 400;
    E.shades.push({ x: 252, y: 400, r: 12, hp: 50, maxHp: 50, spd: 0, biteCd: 0, playerBiteCd: 0, wob: 0, hitFlash: 0, kind: 'shade', bite: 4 });
    const warm0 = E.game.warmth;
    for (let i = 0; i < 3; i++) { E.survivor.x = 250; E.survivor.y = 400; E.shades[0].x = 252; E.shades[0].y = 400; E.trees.length = 0; E.step(dt); }
    out.hurtOnContact = E.game.hurt > 0; out.warmthDropped = E.game.warmth < warm0;

    return out;
  });

  // far drops: kill shades near fire to spawn drops, then read positions
  const drops = await page.evaluate(() => {
    const E = window.__EMBER; E.game.night = 4; E.drops.length = 0;
    // spawn + kill several shades to generate drops (brutes always drop)
    for (let n = 0; n < 8; n++) { E.shades.push({ x: E.cfg.fireX, y: E.cfg.fireY, r: 19, hp: 1, maxHp: 1, spd: 0, biteCd: 0, playerBiteCd: 0, wob: 0, hitFlash: 0, kind: 'brute', bite: 7 }); }
    for (let i = 0; i < 5; i++) E.step(1 / 30);
    const ds = E.drops.map((d) => Math.round(Math.hypot(d.x - E.cfg.fireX, d.y - E.cfg.fireY)));
    return { count: ds.length, dists: ds, minDist: ds.length ? Math.min(...ds) : -1 };
  });

  // death flash: force a fire-death and screenshot during the red flash
  await page.evaluate(() => { const E = window.__EMBER; E.game.fuel = 0.5; E.game.phase = 'night'; E.step(1 / 30); });
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/48-death.png') });
  const dead = await page.evaluate(() => ({ state: window.__EMBER.game.state, hurt: Math.round(window.__EMBER.game.hurt * 100) / 100 }));

  await browser.close(); await new Promise((r) => server.close(r));
  console.log('tree:', JSON.stringify(r), '| drops:', JSON.stringify(drops), '| dead:', JSON.stringify(dead), '| errors:', errs.length);
  const ok = !errs.length && r.hurtOnContact && r.warmthDropped && drops.minDist > 200 && dead.state === 'over' && dead.hurt > 0.5;
  console.log('HURT/DROPS/DEATH OK:', ok);
})();
