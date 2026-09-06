const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', PORT = 8179;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const s = http.createServer((rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!fs.existsSync(fp)) { rs.writeHead(404); rs.end(); return; } rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); fs.createReadStream(fp).pipe(rs); });
(async () => {
  await new Promise((r) => s.listen(PORT, r));
  const b = await chromium.launch({ executablePath: EXEC, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 440, height: 820 }, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:' + PORT, { waitUntil: 'load' }); await pg.waitForTimeout(300);
  await pg.click('.big'); await pg.waitForTimeout(300);
  // LEVEL UP: survive night 1
  await pg.evaluate(() => { const E = window.__EMBER; E.game.fuel = 70; E.game.warmth = 100; E.game.night = 1; E.game.phase = 'night'; E.game.phaseTime = 0.02; for (let i = 0; i < 4; i++) E.step(1 / 30); });
  await pg.waitForTimeout(250); await pg.screenshot({ path: path.join(ROOT, 'scripts/shots/A1-levelup.png') });
  const luText = await pg.textContent('.screen');
  // pick a boon to continue
  await pg.click('.boon'); await pg.waitForTimeout(200);
  // WIN
  await pg.evaluate(() => { const E = window.__EMBER; E.game.woodPopped = 240; E.game.shadesBurned = 96; E.game.night = 5; E.game.phase = 'night'; E.game.phaseTime = 0.02; E.game.warmth = 100; E.game.fuel = 60; for (let i = 0; i < 4; i++) E.step(1 / 30); });
  await pg.waitForTimeout(2600); await pg.screenshot({ path: path.join(ROOT, 'scripts/shots/A2-win.png') });
  // reset then LOSE
  await pg.click('.big'); await pg.waitForTimeout(300);
  await pg.evaluate(() => { const E = window.__EMBER; E.game.woodPopped = 40; E.game.shadesBurned = 12; E.game.fuel = 0.02; for (let i = 0; i < 4; i++) E.step(1 / 30); });
  await pg.waitForTimeout(2400); await pg.screenshot({ path: path.join(ROOT, 'scripts/shots/A3-lose.png') });
  await b.close(); await new Promise((r) => s.close(r));
  console.log('levelup shows SURVIVED:', /SURVIVED/.test(luText), '| errors:', errs.length);
})();
