/*
 * EMBER (3D) — a single-player, portrait survival prototype.
 *
 * Same game as the 2D prototype — the campfire is your light, warmth, currency
 * and weapon — but rendered in 3D with Three.js so the fire is a REAL light that
 * flickers and casts dynamic shadows. The game logic, systems and balance are
 * unchanged from the tuned 2D build; only the presentation layer is different.
 *
 * Core loop: gather wood in the dark -> bank at the fire -> FEED it (fuel = light
 * radius + burn power) or spend on upgrades -> survive escalating nightly waves.
 * Win: survive 5 nights. Lose: the fire dies or you freeze.
 *
 * Game logic runs in a 2D top-down field (x, y). Rendering maps that field onto
 * the ground plane (x -> world x, y -> world z), so the tuned distances, radii
 * and speeds carry over exactly.
 */
var THREE = window.THREE;

// ---------------------------------------------------------------------------
// Field + world mapping
// ---------------------------------------------------------------------------
var VW = 540, VH = 960;
var K = 0.03;                                  // game-units -> world-units
var ARENA = 250;                               // play radius in game units (hard bound)
var CFG = {
  fireX: VW / 2, fireY: VH * 0.60,
  playTop: 132, playBottom: VH - 150,
  fuelMax: 100, warmthMax: 100,
  survivorSpeed: 215, carryBase: 6, gatherTime: 0.65,
  feedCost: 4, feedGain: 14, nights: 5, nightLen: 26, dawnLen: 10, bankRadius: 66
};
function wx(gx) { return (gx - CFG.fireX) * K; }
function wz(gy) { return (gy - CFG.fireY) * K; }
function wr(gr) { return gr * K; }

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function TAU() { return Math.PI * 2; }

// ---------------------------------------------------------------------------
// Three.js scene
// ---------------------------------------------------------------------------
var stage = document.getElementById('stage');
var canvas = document.getElementById('c');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x06040c);
scene.fog = new THREE.FogExp2(0x06040c, 0.05);

var camera = new THREE.PerspectiveCamera(56, 1, 0.1, 100);
var CAM = new THREE.Vector3(0, 13.5, 10.2);
var CAM_LOOK = new THREE.Vector3(0, 0.2, -2.6);
camera.position.copy(CAM);
camera.lookAt(CAM_LOOK);

function resize() {
  var r = stage.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// lights: dim cold ambient so shadows read as blue-black, plus the fire
var ambient = new THREE.HemisphereLight(0x38406a, 0x0a0812, 0.5);
scene.add(ambient);
var fireLight = new THREE.PointLight(0xff8a3a, 6, 20, 2);
fireLight.position.set(0, 1.2, 0);
fireLight.castShadow = true;
fireLight.shadow.mapSize.set(1024, 1024);
fireLight.shadow.camera.near = 0.2;
fireLight.shadow.camera.far = 22;
fireLight.shadow.bias = -0.004;
scene.add(fireLight);
var moonLight = new THREE.DirectionalLight(0x4a5a86, 0.38);
moonLight.position.set(-6, 12, -4);
scene.add(moonLight);

// ground
var groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 1 });
var ground = new THREE.Mesh(new THREE.CircleGeometry(34, 56), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
for (var st = 0; st < 16; st++) {
  var stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07 + Math.random() * 0.1),
    new THREE.MeshStandardMaterial({ color: 0x39312b, roughness: 1 }));
  var sa = Math.random() * TAU(), sd = 2 + Math.random() * 11;
  stone.position.set(Math.cos(sa) * sd, 0.03, Math.sin(sa) * sd);
  stone.castShadow = true; stone.receiveShadow = true;
  scene.add(stone);
}

// faint arena boundary so the play area's edge is legible
var boundR = wr(ARENA);
var boundary = new THREE.Mesh(new THREE.RingGeometry(boundR - 0.06, boundR + 0.06, 72),
  new THREE.MeshBasicMaterial({ color: 0x6a5a8a, transparent: true, opacity: 0.14, side: THREE.DoubleSide }));
boundary.rotation.x = -Math.PI / 2; boundary.position.y = 0.02; scene.add(boundary);

// fire strength/range ring: sits at the fire's effective edge, grows + brightens
// with fuel so the protected zone (warmth + burn) is always legible
var rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.94, 1.0, 64),
  new THREE.MeshBasicMaterial({ color: 0xff8a2b, transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
rangeRing.rotation.x = -Math.PI / 2; rangeRing.position.y = 0.04; scene.add(rangeRing);

// bank drop-zone ring: where you deposit carried wood
var bankRing = new THREE.Mesh(new THREE.RingGeometry(wr(CFG.bankRadius) - 0.05, wr(CFG.bankRadius) + 0.05, 48),
  new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
bankRing.rotation.x = -Math.PI / 2; bankRing.position.y = 0.05; scene.add(bankRing);

// low-fuel warning ring on the ground
var warnRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.45, 32),
  new THREE.MeshBasicMaterial({ color: 0xff5a6a, transparent: true, opacity: 0, side: THREE.DoubleSide }));
warnRing.rotation.x = -Math.PI / 2; warnRing.position.y = 0.05;
scene.add(warnRing);

// ---------------------------------------------------------------------------
// Fire mesh
// ---------------------------------------------------------------------------
var fireGroup = new THREE.Group(); scene.add(fireGroup);
var logMat = new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 1 });
for (var lg = 0; lg < 3; lg++) {
  var log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8), logMat);
  log.rotation.z = Math.PI / 2; log.rotation.y = (lg / 3) * Math.PI; log.position.y = 0.1;
  log.castShadow = true; log.receiveShadow = true; fireGroup.add(log);
}
function flameCone(color, rad, h) {
  var m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 10),
    new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false }));
  fireGroup.add(m); return m;
}
var flameOuter = flameCone(0xff5a1e, 0.4, 1.5);
var flameMid = flameCone(0xffab3a, 0.28, 1.2);
var flameCore = flameCone(0xffe9a8, 0.15, 0.8);
var coals = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20),
  new THREE.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
coals.rotation.x = -Math.PI / 2; coals.position.y = 0.05; fireGroup.add(coals);

// fire embers (rise in y; independent of the ground-plane game particles)
var EMB = 70;
var embGeo = new THREE.BufferGeometry();
var embPos = new Float32Array(EMB * 3);
var embV = [];
for (var em = 0; em < EMB; em++) resetEmber(em, true);
embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
var embers = new THREE.Points(embGeo, new THREE.PointsMaterial({ color: 0xffc46a, size: 0.11, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(embers);
function resetEmber(i, spread) {
  embPos[i * 3] = (Math.random() - 0.5) * 0.5;
  embPos[i * 3 + 1] = spread ? Math.random() * 2 : 0.25;
  embPos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  embV[i] = { x: (Math.random() - 0.5) * 0.4, y: 0.8 + Math.random() * 1.3, z: (Math.random() - 0.5) * 0.4, life: 0.5 + Math.random() };
}

// ---------------------------------------------------------------------------
// Survivor mesh
// ---------------------------------------------------------------------------
var hero = new THREE.Group(); hero.scale.setScalar(0.82); scene.add(hero);
var cloakMat = new THREE.MeshStandardMaterial({ color: 0xe8d0a0, roughness: 0.9 });
var bootMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
// legs (animated) — pivot at the hip so they swing
var legL = new THREE.Group(); legL.position.set(-0.09, 0.28, 0); hero.add(legL);
var legR = new THREE.Group(); legR.position.set(0.09, 0.28, 0); hero.add(legR);
function makeLeg(g) { var m = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.3, 6), bootMat); m.position.y = -0.15; m.castShadow = true; g.add(m); }
makeLeg(legL); makeLeg(legR);
var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.6, 10), cloakMat);
torso.position.y = 0.5; torso.castShadow = true; hero.add(torso);
var hood = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.46, 10), cloakMat);
hood.position.y = 0.92; hood.castShadow = true; hero.add(hood);
var faceDark = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12),
  new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 1 }));
faceDark.position.set(0, 0.85, 0.12); hero.add(faceDark);
// torch arm (swings a little as you walk)
var torchGrp = new THREE.Group(); torchGrp.position.set(0, 0.62, 0); hero.add(torchGrp);
var stick = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.56, 6),
  new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 }));
stick.position.set(0.3, -0.04, 0.14); stick.rotation.z = -0.5; torchGrp.add(stick);
var torchFlame = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10),
  new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
torchFlame.position.set(0.46, 0.18, 0.14); torchGrp.add(torchFlame);
var torchLight = new THREE.PointLight(0xffb060, 1.3, 5, 2);
torchLight.position.set(0.46, 0.2, 0.14); torchGrp.add(torchLight);
// carried wood on the back
var carryGrp = new THREE.Group(); hero.add(carryGrp);
var carryBlocks = [];
for (var cb = 0; cb < 8; cb++) {
  var blk = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.26),
    new THREE.MeshStandardMaterial({ color: cb % 2 ? 0xb5793f : 0xc98a4a, roughness: 1 }));
  blk.position.set(-0.12 + (cb % 4) * 0.08, 0.5 + Math.floor(cb / 4) * 0.1, -0.22);
  blk.castShadow = true; blk.visible = false; carryGrp.add(blk); carryBlocks.push(blk);
}
// floating pack meter above the survivor's head (so carry status is always in view)
var packUI = new THREE.Group(); scene.add(packUI);
var packBg = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.16),
  new THREE.MeshBasicMaterial({ color: 0x120c14, transparent: true, opacity: 0.7 }));
packUI.add(packBg);
var packFill = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.1),
  new THREE.MeshBasicMaterial({ color: 0xd8a066 }));
packFill.position.z = 0.002; packUI.add(packFill);
var packIcon = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14),
  new THREE.MeshBasicMaterial({ color: 0xe0a866, transparent: true, opacity: 0.9 }));
packIcon.position.set(-0.48, 0, 0.002); packUI.add(packIcon);
packUI.visible = false;

// ---------------------------------------------------------------------------
// Pools: trees, shades, particles, flares
// ---------------------------------------------------------------------------
// A simple pine group (used for both harvestable trees and the background treeline).
function makePine(seed, foliageMats) {
  var g = new THREE.Group();
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 1 }));
  trunk.position.y = 0.25; trunk.castShadow = true; g.add(trunk);
  var cones = [];
  for (var t = 0; t < 3; t++) {
    var cone = new THREE.Mesh(new THREE.ConeGeometry(0.58 - t * 0.15, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: foliageMats[t], roughness: 1 }));
    cone.position.y = 0.66 + t * 0.38; cone.castShadow = true; cone.receiveShadow = true; g.add(cone); cones.push(cone);
  }
  var sc = 0.7 + (seed % 100) / 100 * 0.3; g.scale.setScalar(sc);
  g.userData.cones = cones;
  return g;
}

var treeMap = new Map();
function buildTree(seed) {
  var g = new THREE.Group();
  var pine = makePine(seed, [0x2f6b3a, 0x3c8248, 0x4f9a56]);   // shrinks as it is chopped
  g.add(pine);
  // ground ring marks this pine as harvestable (vs. the background treeline)
  var ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 28),
    new THREE.MeshBasicMaterial({ color: 0x6ad0a0, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
  // chop-progress bar (billboarded), shown while you're chopping this tree
  var barBg = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }));
  barBg.position.y = 1.8; barBg.visible = false; g.add(barBg);
  var barFg = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.14), new THREE.MeshBasicMaterial({ color: 0xffce54 }));
  barFg.position.set(0, 1.8, 0.001); barFg.visible = false; g.add(barFg);
  g.userData = { pine: pine, cones: pine.userData.cones, ring: ring, barBg: barBg, barFg: barFg, baseScale: pine.scale.x };
  scene.add(g); return g;
}

// static background treeline just outside the arena — atmosphere + a visible edge
var treeline = new THREE.Group(); scene.add(treeline);
for (var bl = 0; bl < 22; bl++) {
  var ba = (bl / 22) * TAU() + (bl % 2) * 0.14;
  var brad = ARENA + 25 + (bl % 3) * 22;
  var bp = makePine(bl * 37 + 5, [0x223f28, 0x274a2e, 0x2d5636]);
  bp.position.set(wx(CFG.fireX + Math.cos(ba) * brad), 0, wz(CFG.fireY + Math.sin(ba) * brad));
  bp.scale.multiplyScalar(1.1);
  treeline.add(bp);
}

var shadeMap = new Map();
function buildShade() {
  var g = new THREE.Group();
  var body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0),
    new THREE.MeshStandardMaterial({ color: 0x5140a0, roughness: 1, transparent: true, opacity: 0.94, emissive: 0x3a2478, emissiveIntensity: 0.9 }));
  body.castShadow = true; g.add(body);
  // a soft glow halo so shades read as threats even in the dark
  var halo = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x7a5cff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(halo);
  var eyeMat = new THREE.MeshBasicMaterial({ color: 0xe9e2ff });
  var eL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat); eL.position.set(-0.09, 0.05, 0.26); g.add(eL);
  var eR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat); eR.position.set(0.09, 0.05, 0.26); g.add(eR);
  var barBg = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.13), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 }));
  barBg.position.y = 0.66; g.add(barBg);
  var barFg = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.13), new THREE.MeshBasicMaterial({ color: 0xff5a6a }));
  barFg.position.set(0, 0.66, 0.001); g.add(barFg);
  g.userData = { body: body, barBg: barBg, barFg: barFg };
  scene.add(g); return g;
}

// ability-drop pickups: a glowing orb with a halo + a beam of light
var dropMap = new Map();
function buildDrop(type) {
  var g = new THREE.Group();
  var col = BUFFS[type].color;
  var orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0),
    new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.35 }));
  g.add(orb);
  var halo = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 12),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(halo);
  var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 3.2, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 1.6; g.add(beam);
  g.userData = { orb: orb };
  scene.add(g); return g;
}

// ground-plane particle points (chips, deposits, deaths, flare sparks)
var PMAX = 500;
var pGeo = new THREE.BufferGeometry();
var pPos = new Float32Array(PMAX * 3);
var pCol = new Float32Array(PMAX * 3);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
var pPoints = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.13, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(pPoints);
var colorCache = {};
function toColor(hex) { if (!colorCache[hex]) colorCache[hex] = new THREE.Color(hex); return colorCache[hex]; }

// flare rings
var flareRings = [];
for (var fr = 0; fr < 6; fr++) {
  var ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; ring.visible = false;
  scene.add(ring); flareRings.push(ring);
}

// ===========================================================================
//  GAME LOGIC  (ported unchanged from the tuned 2D build)
// ===========================================================================
var Audio2 = (function () {
  var ac = null, master = null, enabled = true;
  function ensure() { if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination); } catch (e) { enabled = false; } }
  function resume() { ensure(); if (ac && ac.state === 'suspended') ac.resume(); }
  function tone(freq, dur, type, vol, slideTo) {
    if (!enabled) return; ensure(); if (!ac) return;
    var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, filterFreq) {
    if (!enabled) return; ensure(); if (!ac) return;
    var t = ac.currentTime, n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = ac.createBufferSource(); src.buffer = buf;
    var f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
    var g = ac.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }
  return {
    resume: resume,
    chop: function () { noise(0.12, 0.25, 1600); tone(220, 0.08, 'square', 0.06); },
    fell: function () { noise(0.4, 0.3, 700); tone(120, 0.35, 'sine', 0.14, 55); },
    wood: function () { tone(540, 0.09, 'triangle', 0.16); tone(360, 0.12, 'triangle', 0.1); },
    crit: function () { tone(720, 0.1, 'square', 0.14, 980); tone(480, 0.14, 'triangle', 0.12); },
    pickup: function () { [660, 880, 1180].forEach(function (f, i) { setTimeout(function () { tone(f, 0.14, 'triangle', 0.18); }, i * 70); }); },
    sizzle: function () { noise(0.14, 0.06, 2600); },
    feed: function () { tone(180, 0.25, 'sawtooth', 0.18, 420); noise(0.35, 0.28, 900); },
    upgrade: function () { tone(520, 0.12, 'triangle', 0.2); setTimeout(function () { tone(780, 0.18, 'triangle', 0.2); }, 90); },
    shadeDie: function () { noise(0.18, 0.22, 700); tone(90, 0.18, 'sine', 0.12, 40); },
    bite: function () { tone(70, 0.18, 'square', 0.18, 40); noise(0.12, 0.15, 500); },
    night: function () { tone(70, 0.9, 'sine', 0.16, 55); },
    dawn: function () { tone(330, 0.3, 'triangle', 0.16); setTimeout(function () { tone(494, 0.4, 'triangle', 0.16); }, 150); },
    lose: function () { tone(200, 1.1, 'sawtooth', 0.22, 45); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { tone(f, 0.35, 'triangle', 0.18); }, i * 140); }); }
  };
})();

var UPGRADES = {
  stoke: { name: 'Stoke', lvl: 0, max: 5, base: 12, step: 8 },
  ashheart: { name: 'Ashheart', lvl: 0, max: 5, base: 14, step: 9 },
  satchel: { name: 'Satchel', lvl: 0, max: 5, base: 10, step: 7 },
  coat: { name: 'Coat', lvl: 0, max: 5, base: 10, step: 7 }
};
function upgradeCost(u) { return u.base + u.step * u.lvl; }

// Timed ability pickups that drop from shades and each dawn (Nova is instant).
var BUFFS = {
  inferno: { name: 'Inferno', icon: '🔥', color: 0xff7a2b, dur: 12 },
  swift:   { name: 'Swift',   icon: '💨', color: 0x5fd0ff, dur: 12 },
  ward:    { name: 'Ward',    icon: '🛡', color: 0x8affc1, dur: 12 },
  harvest: { name: 'Harvest', icon: '🪓', color: 0xffd24a, dur: 14 },
  nova:    { name: 'Nova',    icon: '💥', color: 0xffe08a, dur: 0 }
};
var DROP_POOL = ['inferno', 'swift', 'ward', 'harvest', 'inferno', 'swift', 'harvest', 'nova']; // nova rarer
function buffOn(k) { return game.buffs[k] > 0; }

var game = {
  state: 'title', time: 0, fuel: 65, warmth: 100, bank: 0, carry: 0,
  night: 1, phase: 'dawn', phaseTime: CFG.dawnLen, woodPopped: 0, shadesBurned: 0,
  shake: 0, lowFuelWarn: 0, flash: 0, banner: null, tipShown: false, buffs: {}, packFull: false
};
function setBanner(main, sub, dur) { game.banner = { main: main, sub: sub || '', t: dur || 2.2, max: dur || 2.2 }; }

var survivor = { x: CFG.fireX, y: CFG.fireY + 60, r: 13, face: Math.PI / 2, chill: 0, walk: 0, moving: false, chopping: false, chopT: 0, prevPhase: 0 };
var trees = [], shades = [], particles = [], flares = [], drops = [];
var targetTree = null;   // tree currently in gather range (for highlight/progress UI)

function fireRadius() { return (78 + (game.fuel / CFG.fuelMax) * 120 + UPGRADES.stoke.lvl * 14) * (buffOn('inferno') ? 1.22 : 1); }
function fireIntensity() { return clamp(game.fuel / CFG.fuelMax, 0, 1); }
function carryCap() { return CFG.carryBase + UPGRADES.satchel.lvl * 3; }
function burnDps() { return (34 + UPGRADES.ashheart.lvl * 12) * (buffOn('inferno') ? 2 : 1); }
function moveSpeed() { return CFG.survivorSpeed * (buffOn('swift') ? 1.6 : 1); }
function gatherTime() { return CFG.gatherTime * (buffOn('harvest') ? 0.5 : 1); }

function spawnTree() {
  // always inside the reachable arena, not on the bank zone, not overlapping another tree
  for (var tries = 0; tries < 28; tries++) {
    var a = rand(0, TAU()), d = rand(95, ARENA - 24);
    var x = CFG.fireX + Math.cos(a) * d, y = CFG.fireY + Math.sin(a) * d;
    var ok = true;
    for (var i = 0; i < trees.length; i++) { if (dist2(x, y, trees[i].x, trees[i].y) < 46 * 46) { ok = false; break; } }
    if (!ok) continue;
    trees.push({ x: x, y: y, r: 17, wood: 5, chop: 0, seed: Math.floor(rand(0, 1e6)) });
    return true;
  }
  return false;
}
function spawnShade(hpMul, spdMul, kind) {
  // spawn on a ring just outside the arena, so they always march in on-screen
  var a = rand(0, TAU()), d = ARENA + 20;
  var x = CFG.fireX + Math.cos(a) * d, y = CFG.fireY + Math.sin(a) * d;
  kind = kind || 'shade';
  var hp, r, spd, bite;
  if (kind === 'brute') { hp = 10 * hpMul; r = 19; spd = rand(15, 22) * spdMul; bite = 7; }   // slow, tanky, hits hard
  else { hp = 3 * hpMul; r = 12; spd = rand(26, 40) * spdMul; bite = 4; }
  shades.push({ x: x, y: y, r: r, hp: hp, maxHp: hp, spd: spd, biteCd: 0, wob: rand(0, TAU()), hitFlash: 0, kind: kind, bite: bite });
}
function addParticles(x, y, n, color, spd, life, sz) {
  for (var i = 0; i < n; i++) {
    var a = rand(0, TAU());
    particles.push({ x: x, y: y, vx: Math.cos(a) * rand(0, spd), vy: Math.sin(a) * rand(0, spd) - rand(0, spd * 0.4), life: life * rand(0.6, 1), maxLife: life, color: color, sz: sz || rand(2, 4) });
  }
}

function spawnDrop(x, y, type) {
  drops.push({ x: x, y: y, type: type, life: 13, bob: rand(0, TAU()) });
}
function randomDropType() { return DROP_POOL[Math.floor(rand(0, DROP_POOL.length))]; }

function collectDrop(d) {
  var b = BUFFS[d.type];
  addParticles(d.x, d.y, 20, '#' + b.color.toString(16).padStart(6, '0'), 130, 0.6, 3);
  if (d.type === 'nova') {
    triggerFlare(fireRadius() * 2.4, 40);            // instant screen-clearing blast
    for (var i = 0; i < shades.length; i++) { shades[i].hp -= 40; shades[i].hitFlash = 0.2; }
    game.flash = Math.max(game.flash, 0.5); game.shake = Math.max(game.shake, 10);
  } else {
    game.buffs[d.type] = b.dur;                      // (re)start the timed buff
  }
  Audio2.pickup();
}

function updateDrops(dt) {
  for (var i = drops.length - 1; i >= 0; i--) {
    var d = drops[i]; d.life -= dt; d.bob += dt * 3;
    if (dist2(d.x, d.y, survivor.x, survivor.y) < Math.pow(survivor.r + 20, 2)) { collectDrop(d); drops.splice(i, 1); continue; }
    if (d.life <= 0) drops.splice(i, 1);
  }
  for (var k in game.buffs) { if (game.buffs[k] > 0) { game.buffs[k] -= dt; if (game.buffs[k] <= 0) game.buffs[k] = 0; } }
}

function startGame() {
  game.state = 'play'; game.time = 0;
  game.fuel = 65; game.warmth = 100; game.bank = 0; game.carry = 0;
  game.night = 1; game.phase = 'dawn'; game.phaseTime = CFG.dawnLen;
  game.woodPopped = 0; game.shadesBurned = 0; game.shake = 0; game.lowFuelWarn = 0; game.flash = 0;
  survivor.x = CFG.fireX; survivor.y = CFG.fireY + 60; survivor.chill = 0;
  trees.length = 0; shades.length = 0; particles.length = 0; flares.length = 0; drops.length = 0;
  for (var k in UPGRADES) UPGRADES[k].lvl = 0;
  game.buffs = {}; game.treeTimer = 0;
  game.banner = null; game.tipShown = false;
  for (var i = 0; i < 6; i++) spawnTree();
  setBanner('DAWN', 'Chop wood, then FEED the fire', 3.4);
  UI.showScreen(null); UI.syncDock();
}
function endGame(win) { game.state = win ? 'win' : 'over'; if (win) Audio2.win(); else Audio2.lose(); UI.showResult(win); }
function feedFire() {
  if (game.state !== 'play' || game.bank < CFG.feedCost) return;
  game.bank -= CFG.feedCost;
  game.fuel = clamp(game.fuel + CFG.feedGain, 0, CFG.fuelMax + 40);
  triggerFlare(fireRadius() * 0.9, 14);
  game.flash = Math.max(game.flash, 0.35); game.shake = Math.max(game.shake, 4);
  Audio2.feed(); UI.syncDock(); UI.flashBtn('feed');
}
function triggerFlare(radius, dmg) {
  flares.push({ x: CFG.fireX, y: CFG.fireY, r: 20, max: radius, dmg: dmg, life: 0.45, maxLife: 0.45 });
  addParticles(CFG.fireX, CFG.fireY, 22, '#ffce54', 220, 0.5, 4);
}
function buyUpgrade(key) {
  if (game.state !== 'play') return;
  var u = UPGRADES[key]; if (u.lvl >= u.max) return;
  var cost = upgradeCost(u); if (game.bank < cost) return;
  game.bank -= cost; u.lvl++;
  Audio2.upgrade(); addParticles(survivor.x, survivor.y, 16, '#8affc1', 120, 0.6, 3);
  UI.syncDock(); UI.flashBtn(key);
}

function update(dt) {
  if (game.state !== 'play') { updateParticles(dt); return; }
  game.time += dt;
  game.phaseTime -= dt;
  if (game.phase === 'dawn') {
    if (game.phaseTime <= 0) { game.phase = 'night'; game.phaseTime = CFG.nightLen; game.nightSpawnAcc = 0; setBanner('NIGHT ' + game.night, 'The dark comes — keep it burning', 2.4); Audio2.night(); }
  } else {
    var hpMul = 1 + (game.night - 1) * 0.7, spdMul = 1 + (game.night - 1) * 0.12;
    var ratePerSec = 0.3 + game.night * 0.24;
    var bruteChance = game.night >= 3 ? 0.15 + (game.night - 3) * 0.1 : 0;
    game.nightSpawnAcc = (game.nightSpawnAcc || 0) + dt * ratePerSec;
    while (game.nightSpawnAcc >= 1) {
      spawnShade(hpMul, spdMul, Math.random() < bruteChance ? 'brute' : 'shade');
      game.nightSpawnAcc -= 1;
    }
    if (game.phaseTime <= 0) {
      if (game.night >= CFG.nights) { endGame(true); return; }
      game.night++; game.phase = 'dawn'; game.phaseTime = CFG.dawnLen;
      shades.length = 0; addParticles(CFG.fireX, CFG.fireY, 30, '#ffd24a', 160, 0.9, 4);
      spawnDrop(CFG.fireX + rand(-60, 60), CFG.fireY - rand(50, 100), randomDropType()); // reward for surviving
      setBanner('DAWN', 'Night ' + (game.night - 1) + ' survived — grab the drop & stock up', 2.8); Audio2.dawn();
    }
  }
  var decay = 1.2 + game.night * 0.34 + (game.phase === 'night' ? 1.5 : 0);
  game.fuel -= decay * dt;
  if (game.fuel <= 0) { game.fuel = 0; endGame(false); return; }
  game.lowFuelWarn = game.fuel < 22 ? (game.lowFuelWarn + dt) : 0;

  var dir = keyboardDir(), mvx = 0, mvy = 0, mag = 0;
  if (dir) { mvx = dir.dx; mvy = dir.dy; mag = dir.mag; }
  else if (input.active) { mvx = input.dx; mvy = input.dy; mag = input.mag; }
  survivor.moving = mag > 0.05;
  if (survivor.moving) {
    survivor.x += mvx * moveSpeed() * mag * dt;
    survivor.y += mvy * moveSpeed() * mag * dt;
    survivor.face = Math.atan2(mvy, mvx); survivor.walk += dt * (6 + mag * 6);
  }
  // hard radial bound: keep the survivor inside the arena
  var bdx = survivor.x - CFG.fireX, bdy = survivor.y - CFG.fireY, bd = Math.hypot(bdx, bdy);
  var maxB = ARENA - 12;
  if (bd > maxB) { survivor.x = CFG.fireX + bdx / bd * maxB; survivor.y = CFG.fireY + bdy / bd * maxB; }
  // solid trees: push the survivor out of any trunk it overlaps (no walking through)
  for (var ck = 0; ck < trees.length; ck++) {
    var ct = trees[ck], cx = survivor.x - ct.x, cy = survivor.y - ct.y, cd = Math.hypot(cx, cy);
    var minD = survivor.r + ct.r * 0.7;
    if (cd < minD) {
      if (cd < 0.001) { cx = 1; cy = 0; cd = 1; }   // dead-centre: pick a direction
      survivor.x = ct.x + cx / cd * minD; survivor.y = ct.y + cy / cd * minD;
    }
  }

  var litByFire = dist2(survivor.x, survivor.y, CFG.fireX, CFG.fireY) < Math.pow(fireRadius(), 2);
  var warmthRate;
  if (litByFire) warmthRate = 22;
  else if (buffOn('ward')) warmthRate = 0;   // Ward: immune to the cold
  else { var coldBase = 7 + game.night * 0.9 + (game.phase === 'night' ? 3 : 0); warmthRate = -coldBase * (1 - UPGRADES.coat.lvl * 0.12); }
  game.warmth = clamp(game.warmth + warmthRate * dt, 0, CFG.warmthMax);
  survivor.chill = 1 - game.warmth / CFG.warmthMax;
  if (game.warmth <= 0) { endGame(false); return; }

  var near = null, nearD = 1e9;
  for (var i = 0; i < trees.length; i++) {
    var tt = trees[i], d = dist2(survivor.x, survivor.y, tt.x, tt.y);
    if (d < Math.pow(tt.r + survivor.r + 20, 2) && d < nearD) { near = tt; nearD = d; }
  }
  targetTree = near;
  survivor.chopping = false;
  game.packFull = false;
  if (near && game.carry < carryCap()) {
    survivor.chopping = true;
    if (!survivor.moving) survivor.face = Math.atan2(near.y - survivor.y, near.x - survivor.x); // turn to face the tree
    // advance the axe swing and land an impact on every downstroke (so no swing feels dead)
    survivor.chopT += dt;
    var phase = (survivor.chopT * 3.2) % 1;
    if (survivor.prevPhase < 0.5 && phase >= 0.5) {
      near.hit = 0.18;
      addParticles(near.x, near.y, 6, '#d8a468', 100, 0.4, 2);     // chips fly on each strike
      Audio2.chop();
    }
    survivor.prevPhase = phase;
    // wood accumulates toward the next log
    near.chop += dt;
    if (near.chop >= gatherTime()) {
      near.chop = 0; near.wood--; game.carry++; game.woodPopped++;
      near.hit = 0.24;
      addParticles(near.x, near.y, 12, '#c98a4a', 145, 0.55, 3);   // bigger burst on a log gained
      // critical chop: a lucky strike splits off a bonus log
      if (Math.random() < 0.2 && near.wood > 0 && game.carry < carryCap()) {
        near.wood--; game.carry++; game.woodPopped++;
        addParticles(near.x, near.y, 14, '#ffe08a', 175, 0.6, 3);
        Audio2.crit();
      } else Audio2.wood();
      // Harvest buff: an extra log on top
      if (buffOn('harvest') && near.wood > 0 && game.carry < carryCap()) {
        near.wood--; game.carry++; game.woodPopped++;
        addParticles(near.x, near.y, 8, '#ffd24a', 120, 0.5, 2);
      }
      UI.flashCarry();
      if (near.wood <= 0) {
        trees.splice(trees.indexOf(near), 1);
        addParticles(near.x, near.y, 22, '#6a9a55', 155, 0.7, 3);  // felled burst
        Audio2.fell();
        // regrow is handled by the deterministic top-up below (survives restarts)
      }
      UI.syncDock();
    }
  } else {
    survivor.chopT = 0; survivor.prevPhase = 0;
    if (near) game.packFull = true;   // standing at a tree but the pack is full
  }
  // bank wood by stepping into the fixed drop-zone ring around the fire
  if (dist2(survivor.x, survivor.y, CFG.fireX, CFG.fireY) < Math.pow(CFG.bankRadius, 2)) {
    if (game.carry > 0) { game.bank += game.carry; game.carry = 0; addParticles(CFG.fireX, CFG.fireY, 8, '#ffd24a', 80, 0.45, 3); Audio2.wood(); UI.syncDock(); }
  }
  // keep the forest stocked with reachable trees (deterministic top-up to 6;
  // refills faster the emptier it gets, so heavy gathering never runs it dry)
  if (trees.length < 6) {
    game.treeTimer = (game.treeTimer || 0) - dt;
    if (game.treeTimer <= 0) { spawnTree(); game.treeTimer = trees.length < 3 ? 0.25 : 0.6; }
  } else game.treeTimer = 0;

  var R = fireRadius(), dps = burnDps(), anyBurning = false;
  for (var j = shades.length - 1; j >= 0; j--) {
    var s = shades[j]; s.wob += dt * 4; s.burning = false;
    var toFx = CFG.fireX - s.x, toFy = CFG.fireY - s.y, fd = Math.hypot(toFx, toFy) || 1;
    s.x += (toFx / fd) * s.spd * dt + Math.cos(s.wob) * 8 * dt;
    s.y += (toFy / fd) * s.spd * dt + Math.sin(s.wob) * 8 * dt;
    if (s.hitFlash > 0) s.hitFlash -= dt;
    if (fd < R) {
      var burn = dps * (0.4 + fireIntensity() * 0.8) * (1 - fd / R + 0.25) * dt;
      s.hp -= burn; s.burning = true; anyBurning = true;
      if (Math.random() < dt * 18) addParticles(s.x, s.y, 1, '#ff9d3a', 55, 0.35, 2); // singe embers
    }
    if (dist2(s.x, s.y, survivor.x, survivor.y) < Math.pow(s.r + survivor.r, 2)) {
      game.warmth = clamp(game.warmth - 24 * dt, 0, CFG.warmthMax);
      survivor.x -= (toFx / fd) * 40 * dt; survivor.y -= (toFy / fd) * 40 * dt;
    }
    if (fd < 42) {
      s.biteCd -= dt;
      if (s.biteCd <= 0) { s.biteCd = 0.6; game.fuel = clamp(game.fuel - (s.bite || 4), 0, CFG.fuelMax + 40); game.shake = Math.max(game.shake, s.kind === 'brute' ? 10 : 6); addParticles(CFG.fireX, CFG.fireY, 6, '#7a5cff', 80, 0.4, 3); Audio2.bite(); UI.syncDock(); }
    }
    if (s.hp <= 0) {
      shades.splice(j, 1); game.shadesBurned++;
      addParticles(s.x, s.y, 16, '#8f79ff', 120, 0.5, 3);   // soul burst
      addParticles(s.x, s.y, 9, '#ff9d3a', 150, 0.45, 3);   // + fire flash
      Audio2.shadeDie();
      // ability drops: brutes always drop, shades occasionally
      if (Math.random() < (s.kind === 'brute' ? 1 : 0.1)) spawnDrop(s.x, s.y, randomDropType());
    }
  }
  if (anyBurning && Math.random() < dt * 5) Audio2.sizzle();
  for (var f = flares.length - 1; f >= 0; f--) {
    var fl = flares[f]; fl.life -= dt; fl.r = lerp(fl.max, 20, fl.life / fl.maxLife);
    for (var q = shades.length - 1; q >= 0; q--) {
      var sh = shades[q], dd = Math.hypot(sh.x - fl.x, sh.y - fl.y);
      if (Math.abs(dd - fl.r) < 26) { sh.hp -= fl.dmg * dt * 6; sh.hitFlash = 0.15; var kx = (sh.x - fl.x) / (dd || 1), ky = (sh.y - fl.y) / (dd || 1); sh.x += kx * 60 * dt; sh.y += ky * 60 * dt; }
    }
    if (fl.life <= 0) flares.splice(f, 1);
  }
  updateParticles(dt);
  updateDrops(dt);
  game._uiAcc = (game._uiAcc || 0) + dt;
  if (game._uiAcc > 0.25) { game._uiAcc = 0; UI.syncDock(); }
  if (game.banner) { game.banner.t -= dt; if (game.banner.t <= 0) game.banner = null; }
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 22);
  if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 1.6);
}
function updateParticles(dt) {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// Input — floating joystick (screen space) + keyboard
// ---------------------------------------------------------------------------
var input = { active: false, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, mag: 0, keys: {} };
function localPt(e) { var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e; var r = stage.getBoundingClientRect(); return { x: t.clientX - r.left, y: t.clientY - r.top }; }
function pDown(e) { Audio2.resume(); if (game.state !== 'play') return; var p = localPt(e); input.active = true; input.ox = input.x = p.x; input.oy = input.y = p.y; input.dx = input.dy = input.mag = 0; }
function pMove(e) {
  if (!input.active) return; var p = localPt(e); input.x = p.x; input.y = p.y;
  var dx = input.x - input.ox, dy = input.y - input.oy, d = Math.hypot(dx, dy), maxR = 70;
  if (d > maxR) { input.ox = input.x - dx / d * maxR; input.oy = input.y - dy / d * maxR; dx = input.x - input.ox; dy = input.y - input.oy; d = maxR; }
  input.mag = clamp(d / maxR, 0, 1); if (d > 0.001) { input.dx = dx / d; input.dy = dy / d; }
}
function pUp() { input.active = false; input.dx = input.dy = input.mag = 0; }
canvas.addEventListener('mousedown', pDown); window.addEventListener('mousemove', pMove); window.addEventListener('mouseup', pUp);
canvas.addEventListener('touchstart', function (e) { e.preventDefault(); pDown(e); }, { passive: false });
canvas.addEventListener('touchmove', function (e) { e.preventDefault(); pMove(e); }, { passive: false });
canvas.addEventListener('touchend', function (e) { e.preventDefault(); pUp(e); }, { passive: false });
window.addEventListener('keydown', function (e) { input.keys[e.key.toLowerCase()] = true; if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(e.key.toLowerCase()) >= 0) e.preventDefault(); });
window.addEventListener('keyup', function (e) { input.keys[e.key.toLowerCase()] = false; });
function keyboardDir() {
  var k = input.keys, x = 0, y = 0;
  if (k['a'] || k['arrowleft']) x -= 1; if (k['d'] || k['arrowright']) x += 1;
  if (k['w'] || k['arrowup']) y -= 1; if (k['s'] || k['arrowdown']) y += 1;
  var d = Math.hypot(x, y); if (d > 0) return { dx: x / d, dy: y / d, mag: 1 }; return null;
}

// ---------------------------------------------------------------------------
// Render — sync 3D scene + DOM HUD from game state
// ---------------------------------------------------------------------------
var _cq = new THREE.Quaternion();
function renderScene(dt) {
  var t = game.time;
  var it = fireIntensity();

  // fire flame + light scale with fuel
  var flick = 1 + Math.sin(t * 14) * 0.07 + Math.sin(t * 27) * 0.05 + (Math.random() - 0.5) * 0.05;
  // light scales hard with fuel: a dying fire throws a small, dim pool
  fireLight.intensity = (0.35 + it * 7.2) * flick;
  fireLight.distance = 3.0 + it * 10.5;
  fireLight.position.x = Math.sin(t * 9) * 0.06;
  // the whole world darkens as the fire fails (with a readable floor)
  ambient.intensity = 0.24 + it * 0.34;
  moonLight.intensity = 0.28 + it * 0.14;

  // fire range ring: radius tracks the fire's reach; colour dim-red (weak) -> gold (strong)
  var rr = wr(fireRadius());
  rangeRing.scale.set(rr, rr, rr);
  rangeRing.material.color.setRGB(lerp(0.75, 1.0, it), lerp(0.16, 0.82, it), lerp(0.08, 0.3, it));
  rangeRing.material.opacity = 0.16 + it * 0.4;

  // bank drop-zone ring: pulses brighter while you're carrying wood to deposit
  var carrying = game.carry > 0;
  bankRing.material.opacity = carrying ? 0.45 + 0.35 * Math.abs(Math.sin(t * 5)) : 0.2;
  bankRing.material.color.setHex(carrying ? 0xffe08a : 0xffd24a);
  var fs = 0.32 + it * 1.05;
  flameOuter.scale.set(fs, fs * flick, fs); flameOuter.position.y = 0.18 + fs * 0.72;
  flameMid.scale.set(fs, fs * 1.1 * flick, fs); flameMid.position.y = 0.18 + fs * 0.56;
  flameCore.scale.set(fs, fs * 1.2 * flick, fs); flameCore.position.y = 0.18 + fs * 0.42;
  flameCore.visible = it > 0.35;
  coals.material.opacity = 0.45 + it * 0.5; var cs = 0.6 + it * 0.5; coals.scale.set(cs, cs, cs);

  // fire embers
  for (var e = 0; e < EMB; e++) {
    embV[e].life -= dt;
    embPos[e * 3] += embV[e].x * dt;
    embPos[e * 3 + 1] += embV[e].y * dt * (0.5 + it);
    embPos[e * 3 + 2] += embV[e].z * dt;
    if (embV[e].life <= 0 || embPos[e * 3 + 1] > 3.4) resetEmber(e, false);
  }
  embers.geometry.attributes.position.needsUpdate = true;
  embers.material.opacity = 0.25 + it * 0.65;

  // low-fuel warning ring
  if (game.lowFuelWarn > 0) { var wp = 0.5 + 0.5 * Math.sin(t * 9); warnRing.material.opacity = 0.3 + wp * 0.5; warnRing.visible = true; }
  else warnRing.visible = false;

  // survivor — smooth turning, a walk cycle, and a chop/attack swing
  var targetRot = Math.atan2(Math.cos(survivor.face), Math.sin(survivor.face));
  var da = targetRot - hero.rotation.y;
  while (da > Math.PI) da -= TAU(); while (da < -Math.PI) da += TAU();
  hero.rotation.y += da * Math.min(1, dt * 12);              // ease toward facing
  var baseY = survivor.moving ? Math.abs(Math.sin(survivor.walk)) * 0.035 : 0;
  var tf;
  if (survivor.chopping) {
    // overhead chop: raise the torch-arm back, then strike down, with a lunge
    var strike = Math.sin(((survivor.chopT * 3.2) % 1) * Math.PI);   // 0→1→0, ~3/sec
    torchGrp.rotation.x = -1.15 + strike * 1.95;
    hero.position.set(wx(survivor.x), baseY - strike * 0.05, wz(survivor.y));
    legL.rotation.x = 0.18; legR.rotation.x = -0.18;                 // braced stance
    tf = 1 + strike * 0.5 + Math.sin(t * 20) * 0.12;
    torchLight.intensity = 1.15 + strike * 0.6;
  } else {
    hero.position.set(wx(survivor.x), baseY, wz(survivor.y));
    var swing = survivor.moving ? Math.sin(survivor.walk) * 0.62 : 0;
    legL.rotation.x = swing; legR.rotation.x = -swing;
    torchGrp.rotation.x = survivor.moving ? Math.sin(survivor.walk) * 0.14 : Math.sin(t * 2) * 0.03;
    tf = 1 + Math.sin(t * 20) * 0.2;
    torchLight.intensity = 1.1 + Math.sin(t * 18) * 0.3;
  }
  torchFlame.scale.set(tf, tf, tf);
  // chill tint on cloak
  var chill = survivor.chill;
  cloakMat.color.setRGB(0.91 - chill * 0.28, 0.82 - chill * 0.34, 0.63 + chill * 0.3);
  // carried wood on the back
  for (var cbi = 0; cbi < carryBlocks.length; cbi++) carryBlocks[cbi].visible = cbi < game.carry;
  // floating pack meter above the head — visible whenever carrying
  var pcap = carryCap();
  if (game.carry > 0) {
    packUI.visible = true;
    packUI.position.set(wx(survivor.x), 1.55, wz(survivor.y));
    packUI.quaternion.copy(camera.quaternion);
    var pfr = clamp(game.carry / pcap, 0, 1), pFull = game.carry >= pcap;
    packFill.scale.x = Math.max(0.03, pfr);
    packFill.position.x = -0.36 * (1 - pfr);
    packFill.material.color.setHex(pFull ? 0xffd24a : 0xd8a066);
    if (pFull) { var pp = 0.6 + 0.4 * Math.abs(Math.sin(t * 6)); packFill.material.color.setRGB(1, 0.82 + pp * 0.12, 0.3); }
  } else packUI.visible = false;

  // trees — reconcile + gather targeting UI
  var seenT = new Set();
  for (var ti = 0; ti < trees.length; ti++) {
    var tr = trees[ti]; seenT.add(tr);
    var mesh = treeMap.get(tr);
    if (!mesh) { mesh = buildTree(tr.seed); treeMap.set(tr, mesh); }
    mesh.position.set(wx(tr.x), 0, wz(tr.y));
    var ud = mesh.userData;
    var chopping = (tr === targetTree) && game.carry < carryCap();
    if (tr.hit > 0) tr.hit -= dt;
    var hitK = clamp((tr.hit || 0) / 0.18, 0, 1);
    // the pine visibly shrinks as its wood is chopped down (5 -> felled), and pops on each hit
    ud.pine.scale.setScalar(ud.baseScale * (0.58 + 0.42 * clamp(tr.wood / 5, 0, 1)) * (1 + hitK * 0.08));
    // ground ring: green harvestable marker normally, gold + pulsing while chopping
    ud.ring.material.color.setHex(chopping ? 0xffd24a : 0x6ad0a0);
    ud.ring.material.opacity = chopping ? 0.6 + 0.35 * Math.abs(Math.sin(t * 6)) : 0.5;
    // foliage flashes bright on each strike, sits slightly lit while chopping
    for (var ci = 0; ci < ud.cones.length; ci++) {
      if (hitK > 0.02) ud.cones[ci].material.emissive.setRGB(0.18 * hitK, 0.55 * hitK, 0.24 * hitK);
      else ud.cones[ci].material.emissive.setHex(chopping ? 0x1e5e2c : 0x000000);
    }
    ud.pine.rotation.z = hitK > 0 ? Math.sin(t * 60) * 0.16 * hitK : (chopping ? Math.sin(t * 30) * 0.04 : 0);
    // chop-progress bar, continuously visible while you chop this tree
    ud.barBg.visible = chopping; ud.barFg.visible = chopping;
    if (chopping) {
      var pr = clamp(tr.chop / gatherTime(), 0, 1);
      ud.barFg.scale.x = Math.max(0.001, pr); ud.barFg.position.x = -0.41 * (1 - pr);
      ud.barBg.quaternion.copy(camera.quaternion); ud.barFg.quaternion.copy(camera.quaternion);
    }
  }
  treeMap.forEach(function (mesh, tr) { if (!seenT.has(tr)) { scene.remove(mesh); disposeGroup(mesh); treeMap.delete(tr); } });

  // shades — reconcile
  var seenS = new Set();
  for (var si = 0; si < shades.length; si++) {
    var sh = shades[si]; seenS.add(sh);
    var sg = shadeMap.get(sh);
    if (!sg) { sg = buildShade(); shadeMap.set(sh, sg); }
    var by = (0.55 + Math.sin(sh.wob) * 0.12) * (sh.r / 12);
    sg.position.set(wx(sh.x), by, wz(sh.y));
    sg.scale.setScalar(sh.r / 12);           // brutes are visibly bigger
    sg.lookAt(0, by, 0);
    var ud = sg.userData;
    var isBrute = sh.kind === 'brute';
    if (sh.hitFlash > 0) { ud.body.material.emissive.setHex(0xffffff); ud.body.material.color.setHex(0xffffff); }
    else {
      // ease a "burning" glow: shade colour -> hot orange while inside the firelight
      sh.glow = lerp(sh.glow || 0, sh.burning ? 1 : 0, Math.min(1, dt * 8));
      var gG = sh.glow;
      var eR = isBrute ? 0.6 : 0.23, eG = isBrute ? 0.12 : 0.14, eB = isBrute ? 0.18 : 0.47;
      var cR = isBrute ? 0.62 : 0.32, cG = isBrute ? 0.16 : 0.25, cB = isBrute ? 0.34 : 0.63;
      ud.body.material.emissive.setRGB(lerp(eR, 1.0, gG), lerp(eG, 0.42, gG), lerp(eB, 0.05, gG));
      ud.body.material.color.setRGB(lerp(cR, 1.0, gG), lerp(cG, 0.5, gG), lerp(cB, 0.2, gG));
    }
    var hpR = clamp(sh.hp / sh.maxHp, 0, 1);
    var showBar = hpR < 0.999;
    ud.barBg.visible = showBar; ud.barFg.visible = showBar;
    if (showBar) { ud.barFg.scale.x = hpR; ud.barFg.position.x = -0.3 * (1 - hpR); ud.barBg.quaternion.copy(camera.quaternion); ud.barFg.quaternion.copy(camera.quaternion); }
  }
  shadeMap.forEach(function (sg, sh) { if (!seenS.has(sh)) { scene.remove(sg); disposeGroup(sg); shadeMap.delete(sh); } });

  // ability drops — reconcile
  var seenD = new Set();
  for (var di = 0; di < drops.length; di++) {
    var d = drops[di]; seenD.add(d);
    var dm = dropMap.get(d);
    if (!dm) { dm = buildDrop(d.type); dropMap.set(d, dm); }
    dm.position.set(wx(d.x), 0.7 + Math.sin(d.bob) * 0.14, wz(d.y));
    dm.userData.orb.rotation.y += dt * 2.2; dm.userData.orb.rotation.x += dt * 1.4;
    dm.userData.orb.material.emissiveIntensity = 0.7 + 0.5 * Math.abs(Math.sin(t * 4));
    dm.visible = d.life > 2 ? true : (Math.sin(t * 18) > -0.3); // blink when about to expire
  }
  dropMap.forEach(function (dm, d) { if (!seenD.has(d)) { scene.remove(dm); disposeGroup(dm); dropMap.delete(d); } });

  // ground-plane particles
  var pn = Math.min(particles.length, PMAX);
  for (var pi = 0; pi < pn; pi++) {
    var p = particles[pi], lifeR = clamp(p.life / p.maxLife, 0, 1);
    pPos[pi * 3] = wx(p.x); pPos[pi * 3 + 1] = 0.08 + lifeR * 0.5; pPos[pi * 3 + 2] = wz(p.y);
    var col = toColor(p.color); pCol[pi * 3] = col.r * lifeR; pCol[pi * 3 + 1] = col.g * lifeR; pCol[pi * 3 + 2] = col.b * lifeR;
  }
  pGeo.setDrawRange(0, pn);
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;

  // flare rings
  for (var ri = 0; ri < flareRings.length; ri++) {
    var rg = flareRings[ri];
    if (ri < flares.length) { var flr = flares[ri]; var rad = wr(flr.r); rg.scale.set(rad, rad, rad); rg.material.opacity = clamp(flr.life / flr.maxLife, 0, 1) * 0.7; rg.visible = true; }
    else rg.visible = false;
  }

  // camera shake
  var shk = game.shake * K * 2.2;
  camera.position.set(CAM.x + Math.sin(t * 0.25) * 0.4 + rand(-1, 1) * shk, CAM.y + rand(-1, 1) * shk, CAM.z);
  camera.lookAt(CAM_LOOK);

  UI.updateHUD();
  renderer.render(scene, camera);
}
function disposeGroup(g) { g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); }); else o.material.dispose(); } }); }

// ---------------------------------------------------------------------------
// DOM UI
// ---------------------------------------------------------------------------
var UI = (function () {
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // tints
  var vignette = el('div', 'tint'); vignette.id = 'vignette';
  var cold = el('div', 'tint'); cold.id = 'cold';
  var flash = el('div', 'tint'); flash.id = 'flash';
  stage.appendChild(vignette); stage.appendChild(cold); stage.appendChild(flash);

  // HUD
  var hud = el('div'); hud.id = 'hud';
  hud.innerHTML =
    '<div class="hud-top"><span class="night"></span><span class="phase"></span></div>' +
    '<div class="phasebar"><i></i></div>' +
    '<div class="meter fire"><i></i><span class="lbl">🔥 FIRE</span><span class="val"></span></div>' +
    '<div class="meter warmth"><i></i><span class="lbl">❄ WARMTH</span><span class="val"></span></div>' +
    '<div class="woodrow"><span class="bank"></span><span class="carrywrap"><em>PACK</em><span class="pips"></span></span></div>';
  stage.appendChild(hud);
  var q = function (s) { return hud.querySelector(s); };
  var elNight = q('.night'), elPhase = q('.phase'), elPhaseBar = q('.phasebar'), elPhaseFill = q('.phasebar > i');
  var elFire = q('.meter.fire > i'), elFireVal = q('.meter.fire .val');
  var elWarm = q('.meter.warmth > i'), elWarmVal = q('.meter.warmth .val');
  var elBank = q('.woodrow .bank'), elCarryWrap = q('.woodrow .carrywrap'), elPips = q('.woodrow .pips');

  var buffbar = el('div'); buffbar.id = 'buffs'; stage.appendChild(buffbar);

  var banner = el('div'); banner.id = 'banner'; banner.innerHTML = '<div class="main"></div><div class="sub"></div>'; stage.appendChild(banner);
  var bMain = banner.querySelector('.main'), bSub = banner.querySelector('.sub');
  var warn = el('div', null, '⚠ THE FIRE IS DYING — FEED IT'); warn.id = 'warn'; stage.appendChild(warn);
  var packhint = el('div', null, '🎒 PACK FULL — return to the fire to bank'); packhint.id = 'packhint'; stage.appendChild(packhint);

  var stick = el('div'); stick.id = 'stick'; stick.innerHTML = '<i></i>'; stage.appendChild(stick);
  var stickNub = stick.querySelector('i');

  // dock
  var dock = el('div', 'dock'); stage.appendChild(dock);
  var feedRow = el('div', 'dock-row');
  var feedBtn = el('button', 'btn feed'); feedBtn.innerHTML = '<span class="main">🔥 FEED FIRE</span><span class="cost"></span>';
  feedBtn.addEventListener('click', feedFire); feedRow.appendChild(feedBtn); dock.appendChild(feedRow);
  var upRow = el('div', 'dock-row'), upBtns = {};
  Object.keys(UPGRADES).forEach(function (key) {
    var b = el('button', 'btn'); b.innerHTML = '<span class="main">' + UPGRADES[key].name + '</span><span class="cost"></span><span class="lvl"></span>';
    b.addEventListener('click', function () { buyUpgrade(key); }); upBtns[key] = b; upRow.appendChild(b);
  });
  dock.appendChild(upRow);

  // screen overlay
  var screen = el('div', 'screen hidden'); stage.appendChild(screen);

  function showScreen(nodes) {
    if (!nodes) { screen.classList.add('hidden'); screen.innerHTML = ''; dock.style.display = 'flex'; hud.style.display = 'block'; return; }
    screen.classList.remove('hidden'); screen.innerHTML = ''; nodes.forEach(function (n) { screen.appendChild(n); });
    dock.style.display = 'none'; hud.style.display = 'none';
  }
  function legendRow(color, text) { var r = el('div', 'row'); var d = el('span', 'dot'); d.style.background = color; r.appendChild(d); r.appendChild(el('span', null, text)); return r; }
  function showTitle() {
    var h = el('h1', null, 'EMBER');
    var p = el('p', null, 'Your fire is your light, your warmth, your wealth, and your only weapon. Feed it, and it burns the dark back. Neglect it, and the dark takes you.');
    var legend = el('div', 'legend');
    legend.appendChild(legendRow('#ffca57', 'You — carry a torch, chop wood'));
    legend.appendChild(legendRow('#ff8a2b', 'The fire — keep it fed'));
    legend.appendChild(legendRow('#4f9a56', 'Pines — walk into them to gather wood'));
    legend.appendChild(legendRow('#8f79ff', 'Shades — drain the fire at night'));
    legend.appendChild(legendRow('#ffd24a', 'Glowing drops — grab them for powers'));
    var how = el('p', 'hint', 'Drag anywhere to move (or WASD / arrows). Bank wood at the fire, then FEED it or buy upgrades. Grab glowing drops for abilities. Survive 5 nights.');
    var btn = el('button', 'big', 'LIGHT THE FIRE'); btn.addEventListener('click', function () { Audio2.resume(); startGame(); });
    var credit = el('div', 'credit', 'A survival prototype · portrait · offline · 3D');
    showScreen([h, p, legend, how, btn, credit]);
  }
  function showResult(win) {
    var h = el('h2', null, win ? '🌅 YOU SURVIVED' : '💀 THE FIRE DIED'); if (win) h.style.color = '#8affc1';
    var reason = win ? 'Dawn breaks on the fifth night. The dark could not take your fire.' : (game.fuel <= 0 ? 'Your fire guttered out, and the dark rushed in.' : 'You wandered too far, too cold, and the night claimed you.');
    var p = el('p', null, reason);
    var nights = win ? CFG.nights : (game.night - (game.phase === 'dawn' ? 1 : 0));
    var s1 = el('div', 'stat', 'Nights survived: ' + nights + ' / ' + CFG.nights);
    var s2 = el('div', 'stat', 'Wood gathered: ' + game.woodPopped);
    var s3 = el('div', 'stat', 'Shades burned: ' + game.shadesBurned);
    var score = Math.max(0, nights * 500 + game.shadesBurned * 20 + game.woodPopped * 5 + (win ? 1000 : 0));
    var s4 = el('div', 'stat', '★ Score: ' + score); s4.style.fontSize = '20px';
    var btn = el('button', 'big', 'PLAY AGAIN'); btn.addEventListener('click', function () { startGame(); });
    showScreen([h, p, s1, s2, s3, s4, btn]);
  }
  function syncDock() {
    var canFeed = game.bank >= CFG.feedCost;
    feedBtn.classList.toggle('disabled', !canFeed);
    feedBtn.classList.toggle('attn', canFeed && game.fuel < 32);
    feedBtn.querySelector('.cost').textContent = CFG.feedCost + ' wood → +' + CFG.feedGain + ' fire';
    Object.keys(UPGRADES).forEach(function (key) {
      var u = UPGRADES[key], b = upBtns[key], maxed = u.lvl >= u.max, cost = upgradeCost(u);
      b.classList.toggle('disabled', maxed || game.bank < cost);
      b.querySelector('.cost').textContent = maxed ? 'MAX' : (cost + '🪵');
      b.querySelector('.lvl').textContent = 'Lv ' + u.lvl + '/' + u.max;
    });
  }
  function flashBtn(id) { var b = id === 'feed' ? feedBtn : upBtns[id]; if (!b) return; b.classList.add('flash'); setTimeout(function () { b.classList.remove('flash'); }, 120); }
  function flashCarry() { elCarryWrap.classList.remove('pop'); void elCarryWrap.offsetWidth; elCarryWrap.classList.add('pop'); }

  function updateHUD() {
    if (game.state !== 'play') return;
    elNight.textContent = 'NIGHT ' + game.night + ' / ' + CFG.nights;
    var isNight = game.phase === 'night';
    elPhase.textContent = (isNight ? 'DARK  ' : 'DAWN  ') + Math.ceil(game.phaseTime) + 's';
    elPhase.className = 'phase ' + (isNight ? 'dark' : 'dawn');
    elPhaseBar.className = 'phasebar ' + (isNight ? 'dark' : 'dawn');
    var full = isNight ? CFG.nightLen : CFG.dawnLen;
    elPhaseFill.style.transform = 'scaleX(' + clamp(game.phaseTime / full, 0, 1) + ')';
    elFire.style.transform = 'scaleX(' + clamp(game.fuel / CFG.fuelMax, 0, 1) + ')';
    elFireVal.textContent = Math.round(game.fuel);
    elWarm.style.transform = 'scaleX(' + clamp(game.warmth / CFG.warmthMax, 0, 1) + ')';
    elWarmVal.textContent = Math.round(game.warmth);
    elBank.textContent = '🪵 BANK ' + game.bank;
    var cap = carryCap();
    var pipKey = game.carry + '/' + cap;
    if (elPips._key !== pipKey) {
      elPips._key = pipKey;
      var ph = '';
      for (var pi = 0; pi < cap; pi++) ph += '<i class="pip' + (pi < game.carry ? ' on' : '') + '"></i>';
      elPips.innerHTML = ph;
      elCarryWrap.classList.toggle('full', game.carry >= cap);
    }

    // banner
    if (game.banner) { var b = game.banner, k = b.t / b.max, a = clamp(k < 0.25 ? k / 0.25 : (k > 0.85 ? (1 - k) / 0.15 : 1), 0, 1); banner.style.opacity = a; bMain.textContent = b.main; bMain.style.color = isNight ? '#ff9d6a' : '#ffe08a'; bSub.textContent = b.sub; }
    else banner.style.opacity = 0;
    // warning
    warn.style.opacity = game.fuel < 22 ? (0.55 + 0.45 * Math.sin(game.time * 9)) : 0;
    // pack-full nudge (why chopping "does nothing")
    packhint.style.opacity = game.carry >= carryCap() ? (0.7 + 0.3 * Math.sin(game.time * 5)) : 0;
    // active ability buffs
    var bh = '';
    for (var bk in game.buffs) {
      if (game.buffs[bk] > 0) {
        var bm = BUFFS[bk], frac = clamp(game.buffs[bk] / bm.dur, 0, 1);
        bh += '<div class="buff" style="border-color:#' + bm.color.toString(16).padStart(6, '0') + '"><span>' + bm.icon + '</span><em>' + bm.name + '</em><i style="transform:scaleX(' + frac + ');background:#' + bm.color.toString(16).padStart(6, '0') + '"></i></div>';
      }
    }
    if (buffbar.innerHTML !== bh) buffbar.innerHTML = bh;
    else { var bars = buffbar.querySelectorAll('.buff > i'), n = 0; for (var bk2 in game.buffs) { if (game.buffs[bk2] > 0 && bars[n]) { bars[n].style.transform = 'scaleX(' + clamp(game.buffs[bk2] / BUFFS[bk2].dur, 0, 1) + ')'; n++; } } }
    // tints
    cold.style.opacity = survivor.chill > 0.15 ? (survivor.chill * 0.9) : 0;
    flash.style.opacity = game.flash > 0 ? game.flash * 0.7 : 0;
    // joystick
    if (input.active) { stick.style.opacity = 0.6; stick.style.left = input.ox + 'px'; stick.style.top = input.oy + 'px'; stickNub.style.transform = 'translate(' + (input.x - input.ox) + 'px,' + (input.y - input.oy) + 'px)'; }
    else stick.style.opacity = 0;
  }

  return { showScreen: showScreen, showTitle: showTitle, showResult: showResult, syncDock: syncDock, flashBtn: flashBtn, flashCarry: flashCarry, updateHUD: updateHUD };
})();

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
resize();
UI.showTitle();
var clock = new THREE.Clock();
function frame() {
  var dt = Math.min(0.05, clock.getDelta());
  update(dt);
  renderScene(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// debug hook for the headless harness
window.__EMBER = {
  game: game, survivor: survivor, trees: trees, shades: shades, drops: drops, input: input,
  cfg: CFG, upgrades: UPGRADES, buffs: BUFFS, feed: feedFire, buy: buyUpgrade, start: startGame,
  step: function (dt) { update(dt); }, cost: function (k) { return upgradeCost(UPGRADES[k]); },
  fireRadius: fireRadius, carryCap: carryCap
};
