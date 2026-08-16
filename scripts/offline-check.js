// Offline-safety check: load the built game and record EVERY network request.
// Passes only if nothing is fetched from an external host — the automated
// equivalent of "unzip, serve locally, turn the internet off, and play".
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8195;
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
  const origin = `http://localhost:${PORT}`;
  const browser = await chromium.launch({ executablePath: EXEC });
  const page = await browser.newPage();
  const external = [];
  const all = [];
  page.on('request', (r) => {
    const u = r.url();
    all.push(u);
    if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
  });
  await page.goto(`${origin}/index.html`, { waitUntil: 'load' });
  await page.click('.big');
  await page.waitForTimeout(1500);
  // play a little to trigger audio + any lazy loads
  await page.evaluate(() => { const E = window.__EMBER; for (let i = 0; i < 200; i++) E.step(1 / 30); });
  await page.waitForTimeout(500);
  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('total requests:', all.length);
  console.log('unique hosts:', [...new Set(all.map((u) => { try { return new URL(u).host || u.split(':')[0]; } catch { return u.slice(0, 12); } }))].join(', '));
  if (external.length) { console.log('EXTERNAL REQUESTS (FAIL):'); external.forEach((u) => console.log('  ' + u)); process.exit(1); }
  console.log('OFFLINE-SAFE: no external requests.');
})();
