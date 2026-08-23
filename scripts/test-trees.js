// Confirm the forest restocks under brisk gathering and recovers from empty.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8180;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fs.existsSync(fp)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: EXEC, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:' + PORT, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.click('.big');
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => {
    const E = window.__EMBER;
    function run(fellEvery) {
      let minC = 99;
      for (let k = 0; k < 3000; k++) {
        // pin the game in a running dawn so it never wins/loses — isolate trees only
        E.game.fuel = 80; E.game.warmth = 100; E.game.night = 1; E.game.phase = 'dawn'; E.game.phaseTime = 50;
        if (E.trees.length && k % fellEvery === 0) { E.trees[0].wood = 0; E.trees.splice(0, 1); }
        E.step(1 / 30);
        if (E.trees.length < minC) minC = E.trees.length;
      }
      return { minC: minC, final: E.trees.length };
    }
    const realistic = run(60);          // fell ~1 tree / 2s (brisk real play)
    const aggressive = run(24);         // fell ~1 tree / 0.8s (very heavy gathering)
    E.trees.length = 0;                  // wipe the forest
    for (let k = 0; k < 180; k++) { E.game.fuel = 80; E.game.warmth = 100; E.game.night = 1; E.game.phase = 'dawn'; E.game.phaseTime = 50; E.step(1 / 30); }
    return { realistic: realistic, aggressive: aggressive, recoveredIn6s: E.trees.length };
  });
  await browser.close();
  await new Promise((x) => server.close(x));
  console.log(JSON.stringify(r));
})();
