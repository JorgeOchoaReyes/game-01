#!/usr/bin/env node
// Copies the runtime files a game needs into dist/vendor/, exactly as they will
// sit next to index.html in a downloaded game: vendor/game-kit.js + vendor/three.min.js.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'vendor');
fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

fs.copyFileSync(path.join(ROOT, 'src', 'game-kit.js'), path.join(OUT, 'game-kit.js'));
fs.copyFileSync(require.resolve('three/build/three.min.js'), path.join(OUT, 'three.min.js'));
console.log('game-kit: wrote dist/vendor/game-kit.js + three.min.js');
