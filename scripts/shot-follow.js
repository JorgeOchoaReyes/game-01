const http = require('http'), fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', PORT = 8207;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((q, s) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' }); fs.createReadStream(fp).pipe(s); });
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await chromium.launch({ executablePath: EXEC, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 440, height: 820 }, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'load' });
  await pg.click('.big'); await pg.waitForTimeout(150);
  await pg.evaluate(() => { const E = window.__EMBER; E.game.fuel = 110; for (let k = 0; k < 20; k++) E.step(1 / 60); });
  await pg.waitForTimeout(150); await pg.screenshot({ path: path.join(ROOT, 'scripts/shots/50-near.png') });   // near the fire

  // walk the player up to the far north and let the camera follow
  const up = await pg.evaluate(async () => {
    const E = window.__EMBER, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let k = 0; k < 140; k++) { E.input.active = true; E.input.dx = 0; E.input.dy = -1; E.input.mag = 1; E.step(1 / 30); await wait(0); }
    E.input.active = false;
    // is the top-most reachable tree actually within gather range once we walk to it?
    let top = null, ty = 1e9; for (const t of E.trees) { if (t.y < ty) { ty = t.y; top = t; } }
    return { survY: Math.round(E.survivor.y), boundY0: Math.round(E.cfg.fireY - 600), topTreeY: top ? Math.round(top.y) : null, trees: E.trees.length };
  });
  await pg.waitForTimeout(200); await pg.screenshot({ path: path.join(ROOT, 'scripts/shots/51-north.png') });   // camera followed up

  await b.close(); await new Promise((r) => server.close(r));
  console.log(JSON.stringify(up), 'errors:', errs.length);
})();
