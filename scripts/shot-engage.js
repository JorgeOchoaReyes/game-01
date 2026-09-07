// Visual check: start the game, generate a combo + reward floaters, and screenshot
// so the momentum readout and floating numbers can be eyeballed.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8193;
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
  const page = await browser.newPage({ viewport: { width: 440, height: 820 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.click('.big'); await page.waitForTimeout(300);
  const res = await page.evaluate(() => {
    const E = window.__EMBER;
    // build a combo and spawn floaters near the fire, then run a couple frames
    E.game.combo = 14; E.game.comboT = 2.6; E.game.comboBest = 14; E.game.bonus = 420;
    E.game.carry = 3;
    E.survivor.x = E.cfg.fireX + 40; E.survivor.y = E.cfg.fireY - 30;
    // emit via internal helper if present
    E.step(1 / 60);
    return { combo: E.game.combo, bonus: E.game.bonus, floaters: (window.__floaters ? window.__floaters.length : 'n/a') };
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/40-engage.png') });
  // count visible DOM overlays
  const dom = await page.evaluate(() => ({
    comboVisible: getComputedStyle(document.getElementById('combo')).opacity,
    comboText: (document.querySelector('#combo b') || {}).textContent,
    floaterNodes: document.querySelectorAll('#floaters .floater').length
  }));
  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('state:', JSON.stringify(res));
  console.log('dom:', JSON.stringify(dom), '| errors:', errs.length);
  if (errs.length) console.log('ERR:', errs.slice(0, 4).join(' | '));
})();
