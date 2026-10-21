// Reproduce the "black screen / no trees after dying and replaying" bug.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', PORT = 8175;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const s = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!fs.existsSync(fp)) { rs.writeHead(404); rs.end(); return; } rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); fs.createReadStream(fp).pipe(rs); });
(async () => {
  await new Promise((r) => s.listen(PORT, r));
  const b = await chromium.launch({ executablePath: EXEC, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 440, height: 820 }, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:' + PORT, { waitUntil: 'load' }); await pg.waitForTimeout(300);
  await pg.click('.big'); await pg.waitForTimeout(300);
  // die
  await pg.evaluate(() => { window.__EMBER.game.fuel = 0.02; for (let i = 0; i < 4; i++) window.__EMBER.step(1 / 30); });
  await pg.waitForTimeout(2500); // let the world go dark
  // Play Again
  await pg.click('.big'); await pg.waitForTimeout(200);
  // run a bit of fresh play and sample the scene mood + tree count over time
  const r = await pg.evaluate(async () => {
    const E = window.__EMBER, wait = (ms) => new Promise(x => setTimeout(x, ms));
    let minTrees = 99, samples = [];
    for (let k = 0; k < 120; k++) { E.step(1 / 30); if (E.trees.length < minTrees) minTrees = E.trees.length; }
    await wait(200);
    return { state: E.game.state, trees: E.trees.length, minTrees };
  });
  await pg.waitForTimeout(200);
  await pg.screenshot({ path: path.join(ROOT, 'scripts/shots/D1-after-respawn.png') });
  await b.close(); await new Promise((x) => s.close(x));
  console.log('after respawn:', JSON.stringify(r), '| errors:', errs.length);
})();
