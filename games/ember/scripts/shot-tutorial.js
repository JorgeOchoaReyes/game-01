const http = require('http'), fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', PORT = 8209;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((q, s) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' }); fs.createReadStream(fp).pipe(s); });
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await chromium.launch({ executablePath: EXEC, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 440, height: 820 }, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'load' });
  await pg.evaluate(() => { try { localStorage.removeItem('ember_tut'); } catch (e) {} });   // simulate first-ever load
  await pg.reload({ waitUntil: 'load' });
  await pg.click('.big'); await pg.waitForTimeout(200);
  await pg.evaluate(() => { for (let k = 0; k < 10; k++) window.__EMBER.step(1 / 60); });
  await pg.waitForTimeout(120);
  const step1 = await pg.evaluate(() => ({ tut: window.__EMBER.game.tut, text: (document.getElementById('tuttext') || {}).textContent, ptrShown: !document.getElementById('tutptr').hidden }));
  await pg.screenshot({ path: path.join(ROOT, 'scripts/shots/53-tut1.png') });

  // walk to nearest tree and chop until carrying, then check step 2
  await pg.evaluate(async () => {
    const E = window.__EMBER, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    let nt = null, nd = 1e9; for (const t of E.trees) { const d = (t.x - E.survivor.x) ** 2 + (t.y - E.survivor.y) ** 2; if (d < nd) { nd = d; nt = t; } }
    for (let k = 0; k < 120 && E.game.carry === 0; k++) { const dx = nt.x - E.survivor.x, dy = nt.y - E.survivor.y, d = Math.hypot(dx, dy) || 1; E.input.active = true; E.input.dx = dx / d; E.input.dy = dy / d; E.input.mag = 1; E.step(1 / 30); await wait(0); }
  });
  await pg.waitForTimeout(300);
  const step2 = await pg.evaluate(() => ({ tut: window.__EMBER.game.tut, text: (document.getElementById('tuttext') || {}).textContent, carry: window.__EMBER.game.carry }));
  await pg.screenshot({ path: path.join(ROOT, 'scripts/shots/54-tut2.png') });

  // return to the fire to deliver -> tutorial completes
  const done = await pg.evaluate(async () => {
    const E = window.__EMBER, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let k = 0; k < 200 && E.game.tut !== 0; k++) { const dx = E.cfg.fireX - E.survivor.x, dy = E.cfg.fireY - E.survivor.y, d = Math.hypot(dx, dy) || 1; E.input.active = true; E.input.dx = dx / d; E.input.dy = dy / d; E.input.mag = 1; E.step(1 / 30); await wait(0); }
    let saved = false; try { saved = localStorage.getItem('ember_tut') === '1'; } catch (e) {}
    return { tut: E.game.tut, saved: saved };
  });

  await b.close(); await new Promise((r) => server.close(r));
  console.log('step1:', JSON.stringify(step1));
  console.log('step2:', JSON.stringify(step2));
  console.log('done:', JSON.stringify(done), 'errors:', errs.length);
  const ok = !errs.length && step1.tut === 1 && step1.ptrShown && /tree/.test(step1.text || '') && step2.tut === 2 && /fire/.test(step2.text || '') && done.tut === 0 && done.saved;
  console.log('TUTORIAL OK:', ok);
})();
