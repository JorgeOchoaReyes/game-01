// Quick Human Torch behavior check: near shades die, near trees fell + feed the
// fire, far ones survive, and the held pack is consumed as the cost.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'); const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8204; const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => { let p = req.url.split('?')[0]; if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' }); fs.createReadStream(fp).pipe(res); });
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: EXEC, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  const r = await page.evaluate(() => {
    const E = window.__EMBER; E.start();
    E.survivor.x = 200; E.survivor.y = 300; E.game.carry = 4; E.game.fuel = 40; E.game.night = 3;
    E.shades.length = 0; E.trees.length = 0;
    E.shades.push({ x: 240, y: 300, r: 12, hp: 20, maxHp: 20, spd: 0, biteCd: 0, playerBiteCd: 0, wob: 0, hitFlash: 0, kind: 'shade', bite: 4 }); // near
    E.shades.push({ x: 470, y: 300, r: 12, hp: 20, maxHp: 20, spd: 0, biteCd: 0, playerBiteCd: 0, wob: 0, hitFlash: 0, kind: 'shade', bite: 4 }); // far
    E.trees.push({ x: 250, y: 300, r: 17, wood: 5, chop: 0, seed: 1 });  // near
    E.trees.push({ x: 500, y: 300, r: 17, wood: 5, chop: 0, seed: 2 });  // far
    const carry0 = E.game.carry, fuel0 = E.game.fuel;
    E.drops.push({ x: 200, y: 300, type: 'humantorch', life: 13, bob: 0 });
    E.step(1 / 30);   // collect
    const nearTreeFelling = !!E.trees.find((t) => Math.round(t.x) === 250 && t.felling);
    const farTreeAlive = !!E.trees.find((t) => Math.round(t.x) === 500 && !t.felling);
    for (let k = 0; k < 4; k++) E.step(1 / 30);   // let the shade loop remove the dead near shade
    return { carrySpent: E.game.carry < carry0, carryNow: E.game.carry, fuelUp: E.game.fuel > fuel0,
             shadesLeft: E.shades.length, nearTreeFelling, farTreeAlive };
  });
  await browser.close(); await new Promise((r) => server.close(r));
  console.log(JSON.stringify(r), 'errors:', errs.length);
  const ok = !errs.length && r.carrySpent && r.carryNow === 0 && r.fuelUp && r.shadesLeft === 1 && r.nearTreeFelling && r.farTreeAlive;
  console.log('HUMAN TORCH OK:', ok);
  process.exit(ok ? 0 : 1);
})();
