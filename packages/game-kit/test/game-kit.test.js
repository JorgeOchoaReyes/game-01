'use strict';
// Loads the runtime into a minimal fake browser and checks the parts that do
// not need a real DOM: math helpers, storage fallback, input axes, host rule.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load() {
  const listeners = {};
  const window = {
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    location: { search: '?room=abcde', href: 'http://x/game?room=abcde' },
    localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } },
    requestAnimationFrame() {},
    URLSearchParams,
    URL,
    console,
  };
  window.window = window;
  const document = { addEventListener() {}, getElementById() { return null; } };
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'game-kit.js'), 'utf8');
  vm.runInNewContext(src, { window, document, URLSearchParams, URL, console });
  const fire = (t, e) => (listeners[t] || []).forEach((fn) => fn(e));
  return { Kit: window.Kit, fire };
}

test('math helpers', () => {
  const { Kit } = load();
  assert.strictEqual(Kit.clamp(5, 0, 3), 3);
  assert.strictEqual(Kit.lerp(0, 10, 0.5), 5);
  assert.ok(Kit.hit({ x: 0, y: 0, r: 5 }, { x: 6, y: 0, r: 2 }));
  assert.ok(!Kit.hit({ x: 0, y: 0, r: 1 }, { x: 6, y: 0, r: 2 }));
});

test('store falls back to memory when localStorage throws', () => {
  const { Kit } = load();
  assert.strictEqual(Kit.store.get('best', 0), 0);
  Kit.store.set('best', 42);
  assert.strictEqual(Kit.store.get('best', 0), 42);
});

test('keyboard axis is normalized and splits for 2 local players', () => {
  const { Kit, fire } = load();
  const key = (code) => fire('keydown', { code, preventDefault() {} });
  key('KeyD'); key('KeyS');
  const a = Kit.input.axis(0);
  assert.ok(Math.abs(Math.hypot(a.x, a.y) - 1) < 1e-9);
  Kit.input.setPlayers(2);
  key('ArrowLeft');
  const b = Kit.input.axis(1);
  assert.strictEqual(b.x, -1);
  assert.strictEqual(b.y, 0);
  assert.ok(Kit.input.axis(0).x > 0, 'player 1 ignores arrow keys in 2-player mode');
});

test('host is the lowest id in the room', () => {
  const { Kit } = load();
  Kit.net.id = 'b'; Kit.net.peers = ['c', 'd'];
  assert.ok(Kit.net.isHost());
  Kit.net.peers = ['a', 'c'];
  assert.ok(!Kit.net.isHost());
});

test('KIT_API in @polly/practices lists exactly the runtime surface', () => {
  const { kitSurface } = require('./surface');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'practices', 'src', 'index.ts'), 'utf8');
  const list = (name) => JSON.parse('[' + src.match(new RegExp(`export const ${name}: readonly string\\[\\] = \\[([\\s\\S]*?)\\];`))[1].trim().replace(/,\s*$/, '') + ']');
  const surface = kitSurface();
  assert.deepStrictEqual(list('KIT_API').slice().sort(), surface.paths);
  assert.deepStrictEqual(list('KIT_NAMESPACES').slice().sort(), surface.namespaces);
});
