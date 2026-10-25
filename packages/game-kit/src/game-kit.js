/*
 * game-kit.js: the tiny runtime every Polly game loads from vendor/game-kit.js.
 *
 * It packages the habits Ember was built on so a new game only has to write the
 * fun part:
 *   Kit.canvas   letterboxed, DPR-aware 2D canvas, landscape by default (or hand it to Three.js)
 *   Kit.loop     clamped-dt game loop that pauses when the tab is hidden
 *   Kit.input    keyboard + "drag anywhere to move" touch stick, up to 2 local players
 *   Kit.audio    synthesized sound effects (no audio files), with a saved mute toggle
 *   Kit.fx       screen shake + particles + floating text
 *   Kit.store    localStorage that never throws (best scores, "seen tutorial")
 *   Kit.net      online multiplayer rooms through the Polly relay
 *
 * Plain ES5, no build step, no network unless the game opts into Kit.net.
 */
(function (global) {
  'use strict';

  var Kit = { version: '0.1.0' };

  // -------------------------------------------------------------------------
  // Math helpers (the same ones Ember defines at the top of the file)
  // -------------------------------------------------------------------------
  Kit.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  Kit.lerp = function (a, b, t) { return a + (b - a) * t; };
  Kit.rand = function (a, b) { return a + Math.random() * (b - a); };
  Kit.randInt = function (a, b) { return Math.floor(Kit.rand(a, b + 1)); };
  Kit.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  Kit.dist2 = function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  Kit.dist = function (ax, ay, bx, by) { return Math.sqrt(Kit.dist2(ax, ay, bx, by)); };
  Kit.hit = function (a, b) { var r = (a.r || 0) + (b.r || 0); return Kit.dist2(a.x, a.y, b.x, b.y) < r * r; };

  // -------------------------------------------------------------------------
  // Kit.store: storage that survives private windows and sandboxed iframes
  // -------------------------------------------------------------------------
  var memStore = {};
  Kit.store = {
    get: function (key, fallback) {
      try {
        var raw = global.localStorage.getItem('kit:' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : fallback;
      }
    },
    set: function (key, value) {
      memStore[key] = value;
      try { global.localStorage.setItem('kit:' + key, JSON.stringify(value)); } catch (e) { /* memory only */ }
    }
  };

  // -------------------------------------------------------------------------
  // Kit.canvas: a fixed logical field (landscape 1280 x 720 by default) scaled to fit
  // -------------------------------------------------------------------------
  // Game logic always runs in logical units (w x h); the canvas is letterboxed
  // and DPR-scaled so it looks crisp on phones without the game knowing.
  Kit.canvas = function (opts) {
    opts = opts || {};
    var w = opts.width || 1280, h = opts.height || 720;
    var el = opts.canvas || document.getElementById(opts.id || 'c');
    if (!el) { el = document.createElement('canvas'); el.id = opts.id || 'c'; document.body.appendChild(el); }
    var ctx = opts.webgl ? null : el.getContext('2d');
    // minPixels: while recording, the canvas keeps at least this many pixels per
    // logical unit, so a video is crisp however small the window is
    var view = { canvas: el, ctx: ctx, width: w, height: h, scale: 1, dpr: 1, left: 0, top: 0, minPixels: 0 };

    function fit() {
      var vw = global.innerWidth, vh = global.innerHeight;
      var s = Math.min(vw / w, vh / h);
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      view.scale = s; view.dpr = dpr;
      el.style.width = Math.round(w * s) + 'px';
      el.style.height = Math.round(h * s) + 'px';
      el.style.position = 'absolute';
      view.left = Math.round((vw - w * s) / 2); view.top = Math.round((vh - h * s) / 2);
      el.style.left = view.left + 'px'; el.style.top = view.top + 'px';
      if (ctx) {
        var k = Math.max(s * dpr, view.minPixels);
        el.width = Math.round(w * k); el.height = Math.round(h * k);
        ctx.setTransform(k, 0, 0, k, 0, 0);
      }
      if (opts.onResize) opts.onResize(view);
    }
    // convert a client (screen) point into logical game units
    view.toGame = function (cx, cy) { return { x: (cx - view.left) / view.scale, y: (cy - view.top) / view.scale }; };
    global.addEventListener('resize', fit);
    fit();
    view.fit = fit;
    Kit.view = view;
    return view;
  };

  // -------------------------------------------------------------------------
  // Kit.loop: update(dt) + render(), dt clamped so a hitch never tunnels
  // -------------------------------------------------------------------------
  Kit.loop = function (update, render) {
    var last = 0, running = true, paused = false;
    var loop = {
      time: 0,
      get paused() { return paused; },
      pause: function () { paused = true; },
      resume: function () { paused = false; last = 0; },
      toggle: function () { paused ? loop.resume() : loop.pause(); return paused; },
      stop: function () { running = false; }
    };
    function frame(t) {
      if (!running) return;
      var dt = last ? Math.min((t - last) / 1000, 1 / 20) : 0;
      last = t;
      if (!paused) { loop.time += dt; Kit.fx._update(dt); if (update) update(dt); }
      if (render) render(dt);
      Kit.input._endFrame();
      global.requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) loop.pause(); });
    global.requestAnimationFrame(frame);
    return loop;
  };

  // -------------------------------------------------------------------------
  // Kit.input: keyboard, gamepad-ish axes and Ember's drag-anywhere stick
  // -------------------------------------------------------------------------
  var down = {}, justDown = {};
  var stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
  var tapQueue = [];
  var BINDINGS = [
    { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], action: ['Space', 'KeyE'] },
    { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], action: ['Enter', 'ShiftRight'] }
  ];
  var players = 1;

  function anyDown(codes) { for (var i = 0; i < codes.length; i++) if (down[codes[i]]) return true; return false; }
  function anyJust(codes) { for (var i = 0; i < codes.length; i++) if (justDown[codes[i]]) return true; return false; }

  global.addEventListener('keydown', function (e) {
    if (!down[e.code]) justDown[e.code] = true;
    down[e.code] = true;
    Kit.audio._unlock();
    if (e.code.indexOf('Arrow') === 0 || e.code === 'Space') e.preventDefault();
  });
  global.addEventListener('keyup', function (e) { down[e.code] = false; });
  global.addEventListener('blur', function () { down = {}; mouse.down = false; });

  // The mouse, in game units. Until a game calls Kit.input.mouse(), a mouse
  // drag moves player 1 like a finger does; after, the mouse aims and clicks.
  var mouse = { x: 0, y: 0, down: false, clicked: false, aiming: false };
  function trackMouse(e) {
    if (e.pointerType !== 'mouse') return;
    var p = Kit.view ? Kit.view.toGame(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY };
    mouse.x = p.x; mouse.y = p.y;
  }

  function onPointerDown(e) {
    Kit.audio._unlock();
    if (e.target && e.target.closest && e.target.closest('button, a, input, [data-kit-ui]')) return;
    if (e.pointerType === 'mouse') {
      trackMouse(e);
      if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
      if (mouse.aiming) return;
    }
    if (!stick.active) { stick.active = true; stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = 0; stick.y = 0; stick.moved = false; }
  }
  function onPointerMove(e) {
    trackMouse(e);
    if (!stick.active || e.pointerId !== stick.id) return;
    var dx = e.clientX - stick.ox, dy = e.clientY - stick.oy, R = 46;
    var m = Math.sqrt(dx * dx + dy * dy);
    if (m > 8) stick.moved = true;
    if (m > R) { stick.ox += dx / m * (m - R); stick.oy += dy / m * (m - R); dx = e.clientX - stick.ox; dy = e.clientY - stick.oy; m = R; }
    stick.x = dx / R; stick.y = dy / R;
  }
  function onPointerUp(e) {
    if (e.pointerType === 'mouse' && e.button === 0) mouse.down = false;
    if (e.pointerId !== stick.id) return;
    if (!stick.moved) tapQueue.push(Kit.view ? Kit.view.toGame(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY });
    stick.active = false; stick.x = 0; stick.y = 0;
  }
  global.addEventListener('pointerdown', onPointerDown);
  global.addEventListener('pointermove', onPointerMove);
  global.addEventListener('pointerup', onPointerUp);
  global.addEventListener('pointercancel', onPointerUp);

  Kit.input = {
    // how many local players share the keyboard (1 or 2). Player 1 also gets touch.
    setPlayers: function (n) { players = Kit.clamp(n | 0, 1, 2); },
    key: function (code) { return !!down[code]; },
    pressed: function (code) { return !!justDown[code]; },
    // normalized movement for a player: {x, y} with length <= 1
    axis: function (player) {
      var p = player || 0, b = BINDINGS[p] || BINDINGS[0];
      var x = (anyDown(b.right) ? 1 : 0) - (anyDown(b.left) ? 1 : 0);
      var y = (anyDown(b.down) ? 1 : 0) - (anyDown(b.up) ? 1 : 0);
      if (players === 1 && p === 0) {
        x += (anyDown(BINDINGS[1].right) ? 1 : 0) - (anyDown(BINDINGS[1].left) ? 1 : 0);
        y += (anyDown(BINDINGS[1].down) ? 1 : 0) - (anyDown(BINDINGS[1].up) ? 1 : 0);
        if (stick.active) { x += stick.x; y += stick.y; }
      }
      var m = Math.sqrt(x * x + y * y);
      if (m > 1) { x /= m; y /= m; }
      return { x: x, y: y };
    },
    action: function (player) {
      var p = player || 0, b = BINDINGS[p] || BINDINGS[0];
      return anyJust(b.action) || (players === 1 && p === 0 && anyJust(BINDINGS[1].action));
    },
    // a tap (pointer down + up without dragging), in game units; null if none this frame
    tap: function () { return tapQueue.length ? tapQueue[0] : null; },
    // the mouse for aiming: {x, y} in game units, down (left button held),
    // clicked (pressed this frame). Calling it turns off mouse drag-to-move.
    mouse: function () { mouse.aiming = true; return mouse; },
    stick: stick,
    _endFrame: function () { justDown = {}; tapQueue.length = 0; mouse.clicked = false; }
  };

  // -------------------------------------------------------------------------
  // Kit.audio: every sound is synthesized, like Ember's chiptune and SFX
  // -------------------------------------------------------------------------
  var ac = null, master = null, streamOut = null, muted = Kit.store.get('muted', false);
  function ensureAudio() {
    if (ac) return true;
    try {
      ac = new (global.AudioContext || global.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
      return true;
    } catch (e) { return false; }
  }
  Kit.audio = {
    get muted() { return muted; },
    setMuted: function (m) { muted = !!m; Kit.store.set('muted', muted); if (master) master.gain.value = muted ? 0 : 0.5; },
    toggle: function () { Kit.audio.setMuted(!muted); return muted; },
    // tone({ freq, to, dur, type, vol, delay })
    tone: function (o) {
      if (!ensureAudio() || muted) return;
      var t0 = ac.currentTime + (o.delay || 0), dur = o.dur || 0.12;
      var osc = ac.createOscillator(), g = ac.createGain();
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(o.freq || 440, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(o.to, 1), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.25, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(master); osc.start(t0); osc.stop(t0 + dur + 0.02);
    },
    noise: function (o) {
      if (!ensureAudio() || muted) return;
      o = o || {};
      var dur = o.dur || 0.2, n = Math.floor(ac.sampleRate * dur);
      var buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = o.cutoff || 1800;
      g.gain.value = o.vol || 0.3;
      src.buffer = buf; src.connect(f); f.connect(g); g.connect(master); src.start(ac.currentTime + (o.delay || 0));
    },
    // ready-made effects so a prototype sounds alive on day one
    sfx: {
      blip: function () { Kit.audio.tone({ freq: 660, to: 880, dur: 0.06, vol: 0.15 }); },
      pickup: function () { Kit.audio.tone({ freq: 520, to: 1040, dur: 0.1, type: 'triangle', vol: 0.25 }); },
      hit: function () { Kit.audio.noise({ dur: 0.15, cutoff: 900, vol: 0.4 }); Kit.audio.tone({ freq: 160, to: 60, dur: 0.15, vol: 0.2 }); },
      jump: function () { Kit.audio.tone({ freq: 300, to: 620, dur: 0.14, type: 'square', vol: 0.18 }); },
      shoot: function () { Kit.audio.tone({ freq: 900, to: 200, dur: 0.09, type: 'sawtooth', vol: 0.12 }); },
      boom: function () { Kit.audio.noise({ dur: 0.5, cutoff: 600, vol: 0.6 }); },
      win: function () { [523, 659, 784, 1046].forEach(function (f, i) { Kit.audio.tone({ freq: f, dur: 0.18, delay: i * 0.11, type: 'triangle', vol: 0.25 }); }); },
      lose: function () { [392, 330, 262, 196].forEach(function (f, i) { Kit.audio.tone({ freq: f, dur: 0.22, delay: i * 0.14, type: 'sawtooth', vol: 0.15 }); }); }
    },
    // every Kit sound as a MediaStream, for recording video with sound
    stream: function () {
      if (!ensureAudio() || !ac.createMediaStreamDestination) return null;
      if (!streamOut) { streamOut = ac.createMediaStreamDestination(); master.connect(streamOut); }
      return streamOut.stream;
    },
    _unlock: function () { if (ensureAudio() && ac.state === 'suspended') ac.resume(); }
  };

  // -------------------------------------------------------------------------
  // Kit.fx: juice. Screen shake, particles, floating text (2D canvas)
  // -------------------------------------------------------------------------
  var particles = [], floaters = [], shakeT = 0, shakeMag = 0;
  Kit.fx = {
    shake: function (mag, dur) { shakeMag = Math.max(shakeMag, mag || 8); shakeT = Math.max(shakeT, dur || 0.25); },
    burst: function (x, y, n, color, speed, life, size) {
      for (var i = 0; i < (n || 12); i++) {
        var a = Math.random() * Math.PI * 2, s = (speed || 140) * (0.3 + Math.random() * 0.7);
        particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life || 0.6, max: life || 0.6, color: color || '#ffd24a', size: size || 3 });
      }
    },
    text: function (x, y, str, color) { floaters.push({ x: x, y: y, str: str, color: color || '#fff', life: 0.9 }); },
    // call between ctx.save()/restore(): offsets the world by the current shake
    applyShake: function (ctx) {
      if (shakeT > 0) ctx.translate(Kit.rand(-shakeMag, shakeMag), Kit.rand(-shakeMag, shakeMag));
    },
    draw: function (ctx) {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.globalAlpha = Math.max(p.life / p.max, 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.font = 'bold 22px system-ui, sans-serif';
      for (var j = 0; j < floaters.length; j++) {
        var f = floaters[j];
        ctx.globalAlpha = Math.min(f.life * 2, 1);
        ctx.fillStyle = f.color; ctx.fillText(f.str, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    },
    clear: function () { particles.length = 0; floaters.length = 0; shakeT = 0; },
    _update: function (dt) {
      if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeMag = 0; }
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94;
        if (p.life <= 0) particles.splice(i, 1);
      }
      for (var j = floaters.length - 1; j >= 0; j--) {
        floaters[j].life -= dt; floaters[j].y -= 40 * dt;
        if (floaters[j].life <= 0) floaters.splice(j, 1);
      }
    }
  };

  // -------------------------------------------------------------------------
  // Kit.net: online multiplayer rooms over the Polly relay (WebSocket)
  // -------------------------------------------------------------------------
  // The relay only forwards messages; each game decides who is authoritative.
  // A common pattern: the lowest id in the room ("host") runs the world and
  // broadcasts snapshots; everyone else sends inputs. See Kit.net.isHost().
  function query(name) {
    try { return new URLSearchParams(global.location.search).get(name); } catch (e) { return null; }
  }
  // The studio preview runs games in a sandboxed iframe with no URL of its own,
  // so it can hand over the relay, the room and the invite page through globals.
  function relayUrl() {
    return query('relay') || global.GAMEKIT_RELAY || 'ws://localhost:8787';
  }
  function invitedRoom() {
    return query('room') || global.GAMEKIT_ROOM || null;
  }
  function makeRoomCode() {
    var s = '', abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (var i = 0; i < 5; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return s;
  }

  Kit.net = {
    connected: false,
    id: null,
    room: null,
    peers: [],
    _ws: null,
    _handlers: {},
    // on('join'|'leave'|'open'|'close'|<any message type>, fn(data, fromId))
    on: function (type, fn) { (Kit.net._handlers[type] = Kit.net._handlers[type] || []).push(fn); return Kit.net; },
    _emit: function (type, data, from) {
      var hs = Kit.net._handlers[type] || [];
      for (var i = 0; i < hs.length; i++) { try { hs[i](data, from); } catch (e) { console.error(e); } }
    },
    // join a room. Room comes from opts.room, then ?room= in the URL, then a fresh code.
    connect: function (opts) {
      opts = opts || {};
      var room = (opts.room || invitedRoom() || makeRoomCode()).toUpperCase();
      var url = (opts.url || relayUrl()) + '?room=' + encodeURIComponent(room) + '&game=' + encodeURIComponent(opts.game || document.title || 'game');
      Kit.net.room = room;
      var ws;
      try { ws = new WebSocket(url); } catch (e) { Kit.net._emit('error', e); return Kit.net; }
      Kit.net._ws = ws;
      ws.onopen = function () { Kit.net.connected = true; };
      ws.onclose = function () { Kit.net.connected = false; Kit.net.peers = []; Kit.net._emit('close'); };
      ws.onerror = function (e) { Kit.net._emit('error', e); };
      ws.onmessage = function (ev) {
        var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.t === 'welcome') { Kit.net.id = m.id; Kit.net.peers = m.peers || []; Kit.net._emit('open', { id: m.id, peers: Kit.net.peers, room: room }); }
        else if (m.t === 'join') { if (Kit.net.peers.indexOf(m.id) < 0) Kit.net.peers.push(m.id); Kit.net._emit('join', m.id); }
        else if (m.t === 'leave') { Kit.net.peers = Kit.net.peers.filter(function (p) { return p !== m.id; }); Kit.net._emit('leave', m.id); }
        else if (m.t === 'msg') { Kit.net._emit(m.type, m.data, m.from); }
        else if (m.t === 'error') { Kit.net._emit('error', m); }
      };
      return Kit.net;
    },
    // send(type, data) to everyone else; send(type, data, toId) to one peer
    send: function (type, data, to) {
      var ws = Kit.net._ws;
      if (!ws || ws.readyState !== 1) return false;
      ws.send(JSON.stringify({ t: 'msg', type: type, data: data, to: to }));
      return true;
    },
    // the host is the peer with the smallest id: stable, needs no election
    isHost: function () {
      if (!Kit.net.id) return true;
      for (var i = 0; i < Kit.net.peers.length; i++) if (Kit.net.peers[i] < Kit.net.id) return false;
      return true;
    },
    // true when the player arrived through an invite (link or studio room code)
    hasInvite: function () { return !!invitedRoom(); },
    inviteLink: function () {
      try {
        var u = new URL(global.GAMEKIT_INVITE_BASE || global.location.href);
        u.searchParams.set('room', Kit.net.room || '');
        return u.toString();
      } catch (e) { return 'Room code: ' + Kit.net.room; }
    },
    disconnect: function () { if (Kit.net._ws) Kit.net._ws.close(); }
  };

  // -------------------------------------------------------------------------
  // Kit.film: a timeline for animations and explainer videos
  // -------------------------------------------------------------------------
  // scenes: [{ dur, caption, enter(), draw(ctx, t, p, film) }]. t is seconds into
  // the scene and p its progress 0..1. Captions and scene fades are drawn on the
  // canvas, so they end up in a recorded video. Run it with
  // Kit.loop(film.update, film.render).
  Kit.film = function (scenes, opts) {
    opts = opts || {};
    var total = 0;
    for (var i = 0; i < scenes.length; i++) { scenes[i].baseDur = scenes[i].dur; total += scenes[i].dur; }
    // A film keeps to the real clock, not the game loop's capped dt: under load
    // (recording, a slow machine) frames drop but the film still lasts as long
    // as it should, so a recording is never cut short.
    var lastAt = 0, endHooks = [], voiceSrc = null;
    function now() { return global.performance ? global.performance.now() : Date.now(); }
    function hush() { if (voiceSrc) { try { voiceSrc.stop(); } catch (e) { /* already stopped */ } voiceSrc = null; } }
    var film = {
      time: 0, duration: total, playing: false, index: -1, scenes: scenes,
      play: function () { Kit.audio._unlock(); if (film.time >= total) film.seek(0); film.playing = true; lastAt = now(); },
      pause: function () { film.playing = false; hush(); },
      toggle: function () { film.playing ? film.pause() : film.play(); return film.playing; },
      seek: function (t) { hush(); film.time = Kit.clamp(t, 0, total); film.index = -1; lastAt = now(); },
      restart: function () { film.seek(0); film.play(); },
      // run fn once, the next time the film reaches its end
      onceEnded: function (fn) { endHooks.push(fn); },
      // narration: [{ scene, data: ArrayBuffer (mp3) }]. Each clip plays as its
      // scene starts, and a scene grows to fit its clip. null removes it.
      setVoice: function (clips, done) {
        hush();
        scenes.forEach(function (sc) { sc.voice = null; sc.dur = sc.baseDur; });
        var pending = (clips || []).length;
        function settle() {
          total = 0;
          scenes.forEach(function (sc) { total += sc.dur; });
          film.duration = total;
          if (film.time > total) film.time = total;
          if (done) done(film);
        }
        if (!pending || !ensureAudio()) return settle();
        clips.forEach(function (c) {
          var sc = scenes[c.scene];
          if (!sc) { if (!--pending) settle(); return; }
          ac.decodeAudioData(c.data.slice(0), function (buf) {
            sc.voice = buf;
            sc.dur = Math.max(sc.baseDur, buf.duration + 0.8);
            if (!--pending) settle();
          }, function () { if (!--pending) settle(); });
        });
      },
      update: function () {
        if (!film.playing) return;
        var t = now();
        film.time += Math.min((t - lastAt) / 1000, 1);
        lastAt = t;
        if (film.time >= total) {
          film.time = total; film.playing = false;
          var hooks = endHooks; endHooks = [];
          hooks.forEach(function (fn) { fn(film); });
          if (opts.loop) film.restart(); else if (opts.onEnd) opts.onEnd(film);
        }
      },
      render: function () {
        var view = Kit.view, ctx = view && view.ctx;
        if (!ctx) return;
        var t = Math.min(film.time, total - 1e-6), k = 0;
        while (k < scenes.length - 1 && t >= scenes[k].dur) { t -= scenes[k].dur; k++; }
        var sc = scenes[k], next = scenes[k + 1];
        if (k !== film.index) {
          film.index = k;
          if (sc.enter && film.playing) sc.enter(film);
          // the scene's narration, a beat after the cut
          if (sc.voice && film.playing && ensureAudio()) {
            hush();
            voiceSrc = ac.createBufferSource(); voiceSrc.buffer = sc.voice;
            var vg = ac.createGain(); vg.gain.value = 1.6;
            voiceSrc.connect(vg); vg.connect(master); voiceSrc.start(ac.currentTime + 0.15);
          }
        }
        ctx.save(); sc.draw(ctx, t, Math.min(t / sc.dur, 1), film); ctx.restore();
        // crossfade into the next scene; fade from and to black at the very ends
        var fade = opts.fade === undefined ? 0.45 : opts.fade, left = sc.dur - t;
        if (fade && next && left < fade) {
          ctx.save(); ctx.globalAlpha = 1 - left / fade; next.draw(ctx, 0, 0, film); ctx.restore();
        }
        var black = 0;
        if (fade && k === 0 && t < fade) black = 1 - t / fade;
        if (fade && !next && left < fade) black = 1 - left / fade;
        post(ctx, view, opts);
        if (black) { ctx.fillStyle = 'rgba(0,0,0,' + black + ')'; ctx.fillRect(0, 0, view.width, view.height); }
        if (sc.caption) {
          if (opts.captions === 'bar') caption(ctx, view, sc.caption, Kit.clamp(Math.min(t, left) / 0.5, 0, 1));
          else popCaption(ctx, view, sc.caption, t, sc.dur);
        }
      }
    };
    Kit._film = film;
    return film;
  };

  // Finishing touches over every frame: a vignette that pulls the eye in, and a
  // little film grain so flat colours don't look sterile. opts.vignette /
  // opts.grain = false turn them off.
  var grainTile = null;
  function post(ctx, view, opts) {
    var w = view.width, h = view.height;
    if (opts.vignette !== false) {
      var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    if (opts.grain !== false) {
      if (!grainTile) {
        grainTile = document.createElement('canvas'); grainTile.width = grainTile.height = 128;
        var gc = grainTile.getContext('2d'), img = gc.createImageData(128, 128);
        for (var i = 0; i < img.data.length; i += 4) { var v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 22; }
        gc.putImageData(img, 0, 0);
      }
      ctx.save();
      ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
      ctx.translate(-Math.random() * 128, -Math.random() * 128);
      ctx.fillRect(0, 0, w + 128, h + 128);
      ctx.restore();
    }
  }

  // Shorts-style captions: a few words at a time, big and outlined, popping in
  // as they're "said" across the scene. *Starred* words are highlighted.
  var captionCache = {};
  function captionChunks(text) {
    if (captionCache[text]) return captionCache[text];
    var words = String(text).split(/\s+/).filter(Boolean), chunks = [], cur = [];
    for (var i = 0; i < words.length; i++) {
      cur.push(words[i]);
      var end = /[.,:;!?]\**$/.test(words[i]);
      if (cur.length >= 3 || end || i === words.length - 1) { chunks.push(cur); cur = []; }
    }
    return (captionCache[text] = chunks);
  }
  function popCaption(ctx, view, text, t, dur) {
    var chunks = captionChunks(text), total = 0, i;
    for (i = 0; i < chunks.length; i++) total += chunks[i].length + 1;
    // speak from just after the scene starts to just before it ends
    var start = Math.min(0.25, dur * 0.05), span = Math.max(dur - start - 0.35, 0.5);
    var at = (t - start) / span * total, k = 0, acc = 0;
    if (at < 0) return;
    while (k < chunks.length - 1 && at >= acc + chunks[k].length + 1) { acc += chunks[k].length + 1; k++; }
    var since = (at - acc) / total * span, words = chunks[k];
    var tall = view.height > view.width, short = Math.min(view.width, view.height);
    var size = Math.round(short * (tall ? 0.082 : 0.058)), maxW = view.width * 0.88;
    var pop = Math.min(since / 0.12, 1), scale = 0.82 + 0.18 * (1 - Math.pow(1 - pop, 3));
    ctx.save();
    ctx.font = '900 ' + size + 'px system-ui, sans-serif';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    // lay the words out in up to two lines
    var lines = [[]], widths = [0], space = ctx.measureText(' ').width;
    for (i = 0; i < words.length; i++) {
      var word = words[i].replace(/\*/g, ''), ww = ctx.measureText(word).width, L = lines.length - 1;
      if (widths[L] && widths[L] + space + ww > maxW) { lines.push([]); widths.push(0); L++; }
      lines[L].push({ text: word, hot: /\*/.test(words[i]), w: ww });
      widths[L] += (widths[L] ? space : 0) + ww;
    }
    var lh = size * 1.12, cy = tall ? view.height * 0.66 : view.height * 0.8;
    ctx.translate(view.width / 2, cy); ctx.scale(scale, scale); ctx.globalAlpha = Math.min(pop * 1.5, 1);
    for (var l = 0; l < lines.length; l++) {
      var x = -widths[l] / 2, y = (l - (lines.length - 1) / 2) * lh;
      for (var m = 0; m < lines[l].length; m++) {
        var wd = lines[l][m];
        ctx.lineWidth = size * 0.2; ctx.strokeStyle = 'rgba(10,6,4,.92)'; ctx.strokeText(wd.text, x, y);
        ctx.fillStyle = wd.hot ? '#e2b84f' : '#fff'; ctx.fillText(wd.text, x, y);
        x += wd.w + space;
      }
    }
    ctx.restore();
  }

  // subtitles: low on a wide frame; on a tall one (a 9:16 short) above the
  // bottom fifth, which Shorts, TikTok and Reels cover with their own buttons
  function caption(ctx, view, text, alpha) {
    var tall = view.height > view.width;
    var size = Math.round(Math.min(view.width, view.height) * (tall ? 0.052 : 0.042)), pad = size * 0.7, maxW = view.width * (tall ? 0.86 : 0.8);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '600 ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var words = String(text).split(' '), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = words[i]; } else line = next;
    }
    if (line) lines.push(line);
    var lh = size * 1.3, h = lines.length * lh + pad, y = tall ? view.height * 0.78 - h : view.height - h - view.height * 0.05, w = 0;
    for (var j = 0; j < lines.length; j++) w = Math.max(w, ctx.measureText(lines[j]).width);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect((view.width - w) / 2 - pad, y, w + pad * 2, h);
    ctx.fillStyle = '#fff';
    for (var m = 0; m < lines.length; m++) ctx.fillText(lines[m], view.width / 2, y + pad / 2 + lh * (m + 0.5));
    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Kit.record: film the canvas and every Kit sound into a video file
  // -------------------------------------------------------------------------
  // record({ seconds, fps, width, height, name, type, onStart(), onDone(blob, filename) }) -> { stop(), recording }
  // type picks the format ('video/webm'); by default MP4 where the browser can, else WebM.
  // The video is always width x height, not the window's size: by default the
  // game's shape with its long side 1280 (720x1280 for a 9:16 short, 720p).
  // Ask for 1080p with width/height; slower machines may drop frames. Without onDone the file is saved: inside Polly's studio the
  // page around the game offers the download.
  Kit.record = function (o) {
    o = o || {};
    var view = Kit.view;
    if (!view || !global.MediaRecorder) return null;
    var big = 1280 / Math.max(view.width, view.height);
    var w = Math.round(o.width || view.width * big), h = Math.round(o.height || view.height * big);
    // draw the game at video resolution while recording
    view.minPixels = Math.max(w / view.width, h / view.height);
    if (view.fit) view.fit();
    var copy = document.createElement('canvas');
    copy.width = w; copy.height = h;
    var cctx = copy.getContext('2d'), live = true;
    (function blit() {
      if (!live) return;
      cctx.fillStyle = '#000'; cctx.fillRect(0, 0, w, h);
      cctx.drawImage(view.canvas, 0, 0, w, h);
      global.requestAnimationFrame(blit);
    })();
    var stream = copy.captureStream(o.fps || 30);
    var audio = o.audio === false ? null : Kit.audio.stream();
    if (audio) audio.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
    var types = (o.type ? [o.type] : []).concat(['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']);
    var type = '';
    for (var i = 0; i < types.length; i++) if (global.MediaRecorder.isTypeSupported(types[i])) { type = types[i]; break; }
    var rec = new global.MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: o.bitrate || 8000000 } : {});
    var chunks = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = function () {
      live = false;
      view.minPixels = 0;
      if (view.fit) view.fit();
      var mime = rec.mimeType || type || 'video/webm';
      var blob = new Blob(chunks, { type: mime });
      var name = (o.name || document.title || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + (mime.indexOf('mp4') >= 0 ? '.mp4' : '.webm');
      if (o.onDone) return o.onDone(blob, name);
      if (global.parent && global.parent !== global) global.parent.postMessage({ pollyVideo: blob, name: name }, '*');
      else {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
      }
    };
    var cancelled = false;
    var handle = {
      get recording() { return rec.state === 'recording'; },
      stop: function () {
        cancelled = true;
        if (rec.state !== 'inactive') return rec.stop();
        live = false; view.minPixels = 0; if (view.fit) view.fit();
      }
    };
    // Start a beat after the streams exist: a recorder started in the same
    // moment as a fresh canvas/audio stream sometimes captures nothing at all.
    // onStart() is where to (re)start whatever should be filmed from frame one.
    setTimeout(function () {
      if (cancelled) return;
      rec.start(250);
      if (o.onStart) o.onStart();
      if (o.seconds) setTimeout(handle.stop, o.seconds * 1000);
    }, 300);
    return handle;
  };

  // The page around a film (Polly's studio) can hand it a voiceover:
  // { pollyVoice: [{ scene, data: ArrayBuffer }] }, or [] to remove it.
  global.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || !d.pollyVoice || !Kit._film) return;
    Kit._film.setVoice(d.pollyVoice, function (film) {
      if (global.parent && global.parent !== global) global.parent.postMessage({ pollyVoiceReady: true, duration: film.duration }, '*');
    });
  });

  // The page around a game (Polly's studio) can ask for a recording: a film
  // restarts and is recorded start to finish; a game records `seconds`.
  global.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || !d.pollyRecord) return;
    var film = Kit._film;
    // a film plays by itself while recording: clear its title screen
    if (film) document.querySelectorAll('[data-kit-overlay]').forEach(function (el) { el.remove(); });
    var rec = Kit.record({
      // a film stops when it ends (the timer is only a safety net)
      seconds: film ? film.duration * 3 + 5 : (d.seconds || 15),
      onStart: function () { if (film) { film.onceEnded(function () { setTimeout(rec.stop, 400); }); film.restart(); } }
    });
  });

  // -------------------------------------------------------------------------
  // Kit.ui: tiny DOM helpers for HUDs and overlays (title, pause, end screens)
  // -------------------------------------------------------------------------
  Kit.ui = {
    el: function (tag, attrs, html) {
      var e = document.createElement(tag);
      for (var k in attrs || {}) { if (k === 'style') e.style.cssText = attrs[k]; else e.setAttribute(k, attrs[k]); }
      if (html !== undefined) e.innerHTML = html;
      return e;
    },
    // overlay({ title, body, button, onClick }) -> removes itself on click
    overlay: function (o) {
      var wrap = Kit.ui.el('div', { 'data-kit-ui': '1', 'data-kit-overlay': '1', style: 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(6,4,12,.78);color:#fff;font:16px system-ui,sans-serif;text-align:center;padding:24px;z-index:10' });
      wrap.appendChild(Kit.ui.el('h1', { style: 'margin:0;font-size:40px;letter-spacing:.04em' }, o.title || ''));
      if (o.body) wrap.appendChild(Kit.ui.el('p', { style: 'margin:0;max-width:360px;opacity:.85;line-height:1.45' }, o.body));
      if (o.button) {
        var b = Kit.ui.el('button', { style: 'margin-top:8px;padding:14px 28px;font:bold 18px system-ui;border:0;border-radius:999px;background:#ff8a3a;color:#1a0d05;cursor:pointer' }, o.button);
        b.onclick = function () { Kit.audio._unlock(); wrap.remove(); if (o.onClick) o.onClick(); };
        wrap.appendChild(b);
      }
      document.body.appendChild(wrap);
      return wrap;
    }
  };

  global.Kit = Kit;
})(typeof window !== 'undefined' ? window : this);
