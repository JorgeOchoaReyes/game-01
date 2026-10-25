const http = require('http'), fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', PORT = 8208;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((q, s) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' }); fs.createReadStream(fp).pipe(s); });
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await chromium.launch({ executablePath: EXEC, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 440, height: 820 }, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'load' });
  await pg.click('.big'); await pg.waitForTimeout(150);
  // force the end of Night 1 to trigger the celebration + level-up
  await pg.evaluate(() => { const E = window.__EMBER; E.game.night = 1; E.game.phase = 'night'; E.game.phaseTime = 0.001; E.game.fuel = 90; E.game.warmth = 90; E.step(1 / 30); });
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: path.join(ROOT, 'scripts/shots/52-nightwin.png') });
  const dom = await pg.evaluate(() => ({ state: window.__EMBER.game.state, heading: (document.querySelector('.screen.levelup h2') || {}).textContent, confetti: document.querySelectorAll('.screen.levelup .confetti i').length }));
  await b.close(); await new Promise((r) => server.close(r));
  console.log(JSON.stringify(dom), 'errors:', errs.length);
})();
