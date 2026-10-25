/*
 * EMBER — 3D look test (Three.js r128).
 *
 * A visual mock-up of the same scene as the 2D game, to judge the feel of a 3D
 * rendering. The whole point of 3D here is REAL dynamic lighting: the campfire is
 * an actual point light that flickers and casts shadows from the survivor and the
 * pines onto the ground. Drag to move; tap STOKE to feed the fire and watch the
 * light (and shadows) grow.
 *
 * This is a look test, not the full game loop.
 */
(function () {
  var THREE = window.THREE;
  var stage = document.getElementById('stage');
  var canvas = document.getElementById('c');

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06040c);
  scene.fog = new THREE.FogExp2(0x06040c, 0.055);

  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 10.5, 8.5);
  camera.lookAt(0, 0.6, -0.5);

  function resize() {
    var r = stage.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // --- lights ---
  // very dim cold ambient so shadows read as deep blue-black, not pure void
  scene.add(new THREE.HemisphereLight(0x2a2f4a, 0x05040a, 0.35));

  // the fire: the hero light source
  var fireLight = new THREE.PointLight(0xff8a3a, 6, 26, 2);
  fireLight.position.set(0, 1.3, 0);
  fireLight.castShadow = true;
  fireLight.shadow.mapSize.set(1024, 1024);
  fireLight.shadow.camera.near = 0.2;
  fireLight.shadow.camera.far = 26;
  fireLight.shadow.bias = -0.004;
  scene.add(fireLight);

  // --- ground ---
  var groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 1, metalness: 0 });
  var ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // scattered stones for texture
  for (var i = 0; i < 22; i++) {
    var s = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.16),
      new THREE.MeshStandardMaterial({ color: 0x3a322c, roughness: 1 })
    );
    var a = Math.random() * Math.PI * 2, rad = 2 + Math.random() * 12;
    s.position.set(Math.cos(a) * rad, 0.05, Math.sin(a) * rad);
    s.castShadow = true; s.receiveShadow = true;
    scene.add(s);
  }

  // --- campfire ---
  var fire = new THREE.Group();
  scene.add(fire);
  var logMat = new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 1 });
  for (var l = 0; l < 3; l++) {
    var log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 8), logMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (l / 3) * Math.PI;
    log.position.y = 0.12;
    log.castShadow = true; log.receiveShadow = true;
    fire.add(log);
  }
  // flame — stacked additive cones (unlit, glowing)
  function flameCone(color, rad, h) {
    var m = new THREE.Mesh(
      new THREE.ConeGeometry(rad, h, 10),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    fire.add(m); return m;
  }
  var flameOuter = flameCone(0xff5a1e, 0.42, 1.5);
  var flameMid = flameCone(0xffab3a, 0.30, 1.2);
  var flameCore = flameCone(0xffe9a8, 0.16, 0.8);
  // glowing coal disc
  var coals = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 16),
    new THREE.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  coals.rotation.x = -Math.PI / 2; coals.position.y = 0.06; fire.add(coals);

  // ember particles
  var emberN = 60;
  var emberGeo = new THREE.BufferGeometry();
  var emberPos = new Float32Array(emberN * 3);
  var emberVel = [];
  for (var e = 0; e < emberN; e++) { resetEmber(e, true); }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  var embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: 0xffc46a, size: 0.12, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(embers);
  function resetEmber(idx, spread) {
    emberPos[idx * 3] = (Math.random() - 0.5) * 0.5;
    emberPos[idx * 3 + 1] = spread ? Math.random() * 2 : 0.3;
    emberPos[idx * 3 + 2] = (Math.random() - 0.5) * 0.5;
    emberVel[idx] = { x: (Math.random() - 0.5) * 0.4, y: 0.8 + Math.random() * 1.4, z: (Math.random() - 0.5) * 0.4, life: 0.5 + Math.random() };
  }

  // --- pine trees ---
  function makeTree() {
    var g = new THREE.Group();
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 1 }));
    trunk.position.y = 0.35; trunk.castShadow = true; g.add(trunk);
    var greens = [0x2f6b3a, 0x3c8248, 0x4f9a56];
    for (var t = 0; t < 3; t++) {
      var cone = new THREE.Mesh(new THREE.ConeGeometry(0.85 - t * 0.22, 1.0, 8),
        new THREE.MeshStandardMaterial({ color: greens[t], roughness: 1 }));
      cone.position.y = 0.9 + t * 0.55;
      cone.castShadow = true; cone.receiveShadow = true;
      g.add(cone);
    }
    return g;
  }
  var trees = [];
  for (var tr = 0; tr < 9; tr++) {
    var tree = makeTree();
    var ta = (tr / 9) * Math.PI * 2 + Math.random() * 0.5, trad = 4.5 + Math.random() * 6;
    tree.position.set(Math.cos(ta) * trad, 0, Math.sin(ta) * trad);
    var sc = 0.8 + Math.random() * 0.6; tree.scale.set(sc, sc, sc);
    scene.add(tree); trees.push(tree);
  }

  // --- survivor with a torch ---
  var hero = new THREE.Group();
  scene.add(hero);
  var cloakMat = new THREE.MeshStandardMaterial({ color: 0xe8d0a0, roughness: 0.9 });
  var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.7, 10), cloakMat);
  torso.position.y = 0.45; torso.castShadow = true; hero.add(torso);
  var hood = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 10), cloakMat);
  hood.position.y = 0.9; hood.castShadow = true; hero.add(hood);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 1 }));
  head.position.y = 0.82; hero.add(head);
  // torch
  var torch = new THREE.Group(); hero.add(torch);
  var stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 }));
  stick.position.set(0.32, 0.6, 0.1); stick.rotation.z = -0.5; torch.add(stick);
  var torchFlame = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  torchFlame.position.set(0.5, 0.82, 0.1); torch.add(torchFlame);
  var torchLight = new THREE.PointLight(0xffb060, 1.4, 6, 2);
  torchLight.position.set(0.5, 0.85, 0.1); torch.add(torchLight);
  hero.position.set(-1.6, 0, 2.2);

  // --- shades ---
  var shades = [];
  function makeShade() {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0),
      new THREE.MeshStandardMaterial({ color: 0x3a2c60, roughness: 1, transparent: true, opacity: 0.9, emissive: 0x120a2a }));
    body.castShadow = true; g.add(body);
    var eyeMat = new THREE.MeshBasicMaterial({ color: 0xd7c4ff });
    var eL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat); eL.position.set(-0.1, 0.05, 0.3); g.add(eL);
    var eR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat); eR.position.set(0.1, 0.05, 0.3); g.add(eR);
    var glow = new THREE.PointLight(0x9c7cff, 0.5, 3, 2); glow.position.set(0, 0.1, 0.3); g.add(glow);
    respawnShade(g);
    scene.add(g); return g;
  }
  function respawnShade(g) {
    var a = Math.random() * Math.PI * 2, rad = 9 + Math.random() * 4;
    g.position.set(Math.cos(a) * rad, 0.6, Math.sin(a) * rad);
    g.userData.spd = 0.5 + Math.random() * 0.5;
    g.userData.wob = Math.random() * Math.PI * 2;
  }
  for (var sh = 0; sh < 5; sh++) shades.push(makeShade());

  // --- controls: drag to move; STOKE button feeds the fire ---
  var target = hero.position.clone();
  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var dragging = false;
  function pointerToGround(clientX, clientY) {
    var r = stage.getBoundingClientRect();
    ndc.x = ((clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    var hit = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (hit) { target.set(THREE.MathUtils.clamp(hit.x, -12, 12), 0, THREE.MathUtils.clamp(hit.z, -10, 12)); }
  }
  function down(e) { dragging = true; var p = pt(e); pointerToGround(p.x, p.y); }
  function move(e) { if (dragging) { var p = pt(e); pointerToGround(p.x, p.y); } }
  function up() { dragging = false; }
  function pt(e) { var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e; return { x: t.clientX, y: t.clientY }; }
  canvas.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  canvas.addEventListener('touchstart', function (e) { e.preventDefault(); down(e); }, { passive: false });
  canvas.addEventListener('touchmove', function (e) { e.preventDefault(); move(e); }, { passive: false });
  canvas.addEventListener('touchend', function (e) { e.preventDefault(); up(e); }, { passive: false });

  var fuel = 0.55;
  document.getElementById('stoke').addEventListener('click', function () { fuel = Math.min(1.2, fuel + 0.28); });

  // --- animation loop ---
  var clock = new THREE.Clock();
  function tick() {
    var dt = Math.min(0.05, clock.getDelta());
    var t = clock.elapsedTime;

    // fuel slowly decays; fire light + flame scale with it
    fuel = Math.max(0.12, fuel - dt * 0.045);
    var flick = 1 + Math.sin(t * 13) * 0.07 + Math.sin(t * 27) * 0.05 + (Math.random() - 0.5) * 0.06;
    fireLight.intensity = (1.2 + fuel * 6.5) * flick;
    fireLight.position.x = Math.sin(t * 9) * 0.08;
    var fs = 0.35 + fuel * 1.05;
    flameOuter.scale.set(fs, fs * flick, fs); flameOuter.position.y = 0.2 + fs * 0.7;
    flameMid.scale.set(fs, fs * 1.1 * flick, fs); flameMid.position.y = 0.2 + fs * 0.55;
    flameCore.scale.set(fs, fs * 1.2 * flick, fs); flameCore.position.y = 0.2 + fs * 0.4;
    flameCore.visible = fuel > 0.35;
    coals.material.opacity = 0.5 + fuel * 0.5;
    var cs = 0.6 + fuel * 0.5; coals.scale.set(cs, cs, cs);

    // embers rise
    for (var i = 0; i < emberN; i++) {
      emberVel[i].life -= dt;
      emberPos[i * 3] += emberVel[i].x * dt;
      emberPos[i * 3 + 1] += emberVel[i].y * dt * (0.5 + fuel);
      emberPos[i * 3 + 2] += emberVel[i].z * dt;
      if (emberVel[i].life <= 0 || emberPos[i * 3 + 1] > 3.5) resetEmber(i, false);
    }
    embers.geometry.attributes.position.needsUpdate = true;

    // torch flicker
    torchLight.intensity = 1.2 + Math.sin(t * 18) * 0.3;
    var tf = 1 + Math.sin(t * 20) * 0.2; torchFlame.scale.set(tf, tf, tf);

    // survivor walks toward target, faces travel
    var d = new THREE.Vector3().subVectors(target, hero.position); d.y = 0;
    var dl = d.length();
    if (dl > 0.05) {
      d.normalize();
      var step = Math.min(dl, 3.2 * dt);
      hero.position.addScaledVector(d, step);
      hero.rotation.y = Math.atan2(d.x, d.z);
      hero.position.y = Math.abs(Math.sin(t * 12)) * 0.05; // walk bob
    }

    // shades drift toward the fire, bob, respawn when they reach it
    for (var s = 0; s < shades.length; s++) {
      var g = shades[s];
      g.userData.wob += dt * 3;
      var toF = new THREE.Vector3(0, 0.6, 0).sub(g.position); toF.y = 0;
      var fl = toF.length();
      if (fl < 1.2) { respawnShade(g); continue; }
      toF.normalize();
      g.position.addScaledVector(toF, g.userData.spd * dt);
      g.position.y = 0.6 + Math.sin(g.userData.wob) * 0.15;
      g.lookAt(0, 0.6, 0);
    }

    // gentle idle camera sway for life
    camera.position.x = Math.sin(t * 0.25) * 0.5;
    camera.lookAt(0, 0.6, -0.5);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  resize();
  tick();

  // expose for headless verification
  window.__EMBER3D = { scene: scene, renderer: renderer, stoke: function () { fuel = Math.min(1.2, fuel + 0.3); }, fuel: function () { return fuel; } };
})();
