const http = require('http'), fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', PORT = 8211;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((q, s) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' }); fs.createReadStream(fp).pipe(s); });
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await chromium.launch({ executablePath: EXEC, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 440, height: 820 }, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'load' });
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: path.join(ROOT, 'scripts/shots/55-title.png') });   // title with flame + best badge
  const titleHas = await pg.evaluate(() => ({ flame: !!document.querySelector('.titleflame'), muteBtn: !!document.querySelector('.ctrlbtn') }));

  await pg.click('.big'); await pg.waitForTimeout(200);
  // mute cycle: click the audio button and read state
  const audio = await pg.evaluate(() => { const st0 = window.__EMBER && window.__EMBER.game ? 1 : 1; return {}; });
  // pause: click the pause button, confirm frozen + overlay
  await pg.evaluate(() => { window.__EMBER.game.fuel = 90; });
  await pg.click('#controls .ctrlbtn:nth-child(1)');   // pause button
  await pg.waitForTimeout(60);
  const p1 = await pg.evaluate(() => ({ paused: window.__EMBER.game.paused, fuel: Math.round(window.__EMBER.game.fuel) }));
  await pg.waitForTimeout(400);
  const p2 = await pg.evaluate(() => ({ paused: window.__EMBER.game.paused, fuel: Math.round(window.__EMBER.game.fuel) }));   // fuel should NOT drop while paused
  await pg.screenshot({ path: path.join(ROOT, 'scripts/shots/56-pause.png') });
  // resume
  await pg.click('.pausescreen .big');
  await pg.waitForTimeout(60);
  const p3 = await pg.evaluate(() => ({ paused: window.__EMBER.game.paused }));
  // audio cycle via the mute button
  const a1 = await pg.evaluate(() => { const bt = document.querySelectorAll('#controls .ctrlbtn')[1]; bt.click(); bt.click(); return bt.textContent; });

  await b.close(); await new Promise((r) => server.close(r));
  console.log('title:', JSON.stringify(titleHas));
  console.log('pause froze fuel:', p1.fuel === p2.fuel, '(', p1.fuel, '->', p2.fuel, ') pausedDuring:', p1.paused, 'resumed:', !p3.paused);
  console.log('audio icon after 2 cycles:', a1);
  console.log('errors:', errs.length, errs.slice(0, 4).join(' | '));
  const ok = !errs.length && titleHas.flame && titleHas.muteBtn && p1.paused && p1.fuel === p2.fuel && !p3.paused;
  console.log('POLISH OK:', ok);
})();
