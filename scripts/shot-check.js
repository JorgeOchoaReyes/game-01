// Capture the simplified title screen and a full-fuel gameplay frame to confirm
// the fire light now reaches the top of the frame.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8202;
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
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/43-title.png') });    // simplified landing page
  await page.click('.big'); await page.waitForTimeout(200);
  await page.evaluate(() => { const E = window.__EMBER; E.game.fuel = 120; E.survivor.x = E.cfg.fireX - 50; E.survivor.y = E.cfg.fireY - 40; for (let k = 0; k < 20; k++) E.step(1 / 60); });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(ROOT, 'scripts/shots/44-lightreach.png') });   // full-fuel: light should reach the top
  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('errors:', errs.length);
})();
