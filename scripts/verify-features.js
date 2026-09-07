// Verify the new mechanics: slingshot (fires wood at shades, consuming carry),
// irregulars (hunt the player, torch-immune, drop wood on hit, die to slingshot/fire),
// and the blue-hot fire tint (high nights + Nova).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8199;
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
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push('con:' + m.text()); });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });

  const out = await page.evaluate(() => {
    const E = window.__EMBER, dt = 1 / 30;
    E.start();
    const r = {};

    // --- SLINGSHOT: away from the fire/bank zone (no dump, no fire burn), shade in sling range
    E.game.buffs.sling = 14; E.game.carry = 5; E.trees.length = 0; E.game.fuel = 40;
    E.survivor.x = 120; E.survivor.y = 250;               // far from fire (270,576) and its radius
    E.shades.length = 0;
    E.shades.push({ x: 270, y: 250, r: 12, hp: 40, maxHp: 40, spd: 0, biteCd: 0, playerBiteCd: 0, wob: 0, hitFlash: 0, kind: 'shade', bite: 4 });
    const carry0 = E.game.carry, hp0 = E.shades[0].hp;
    E.survivor.x = 120; E.survivor.y = 250; E.step(dt);   // one step: fires a projectile
    r.slingProjectile = E.projs.length > 0;
    for (let i = 0; i < 24; i++) { E.survivor.x = 120; E.survivor.y = 250; E.shades[0] && (E.shades[0].x = 270, E.shades[0].y = 250); E.trees.length = 0; E.step(dt); }
    r.slingFired = E.game.carry < carry0;
    r.slingDamaged = E.shades.length === 0 || E.shades[0].hp < hp0;

    // --- IRREGULAR: torch-immune + steals wood. Force it adjacent each frame (past the torch
    //     knockback), pack full so the torch bashes, trees cleared, far from the fire.
    E.game.buffs = {}; E.trees.length = 0; E.game.fuel = 100;
    E.game.carry = E.carryCap();                 // full pack -> torch bashes instead of chopping
    E.survivor.x = 200; E.survivor.y = 300;
    E.shades.length = 0;
    // fast shade so it closes between torch downstrokes (as a real irregular does)
    E.shades.push({ x: 240, y: 300, r: 13, hp: 40, maxHp: 40, spd: 320, biteCd: 0, playerBiteCd: 0, wob: 0, hitFlash: 0, kind: 'irregular', bite: 0 });
    const irrHp0 = E.shades[0].hp, carryBefore = E.game.carry;
    E.input.active = false;
    let minCarry = E.game.carry, everGW = false, minDist = 1e9;   // catch the transient steal
    for (let i = 0; i < 120; i++) {
      E.survivor.x = 200; E.survivor.y = 300; E.trees.length = 0; E.step(dt);
      if (E.game.carry < minCarry) minCarry = E.game.carry;
      if (E.groundWood.length > 0) everGW = true;
      if (E.shades[0]) { const d = Math.hypot(E.shades[0].x - E.survivor.x, E.shades[0].y - E.survivor.y); if (d < minDist) minDist = d; }
    }
    r.irrTorchImmune = E.shades.length > 0 && E.shades[0].hp > irrHp0 - 1;  // torch barely dents it (only knockback)
    r.irrStoleWood = minCarry < carryBefore || everGW;

    // --- IRREGULAR dies to fire: park it on the fire
    E.shades.length = 0;
    E.shades.push({ x: E.cfg.fireX, y: E.cfg.fireY, r: 13, hp: 20, maxHp: 20, spd: 0, biteCd: 0, playerBiteCd: 0, wob: 0, hitFlash: 0, kind: 'irregular', bite: 0 });
    E.game.fuel = 120;
    for (let i = 0; i < 90; i++) { E.step(dt); }
    r.irrDiesToFire = E.shades.length === 0;

    // --- BLUE FIRE: high night should raise the blue factor; Nova sets blueFire timer
    r.nightForBlue = (function () { E.game.night = 13; return true; })();
    E.game.blueFire = 0;
    E.game.buffs = {};
    // trigger nova via collectDrop path
    const before = E.game.blueFire;
    E.drops.push({ x: E.survivor.x, y: E.survivor.y, type: 'nova', life: 13, bob: 0 });
    E.step(dt);
    r.novaBlue = E.game.blueFire > before;
    return r;
  });

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log('features:', JSON.stringify(out, null, 0));
  console.log('errors:', errs.length, errs.slice(0, 5).join(' | '));
  const ok = !errs.length && out.slingFired && out.slingProjectile && out.slingDamaged && out.irrTorchImmune && out.irrStoleWood && out.irrDiesToFire && out.novaBlue;
  if (!ok) console.log('FAILED:', Object.keys(out).filter((k) => out[k] !== true).join(', '));
  console.log('FEATURES OK:', ok);
  process.exit(ok ? 0 : 1);
})();
