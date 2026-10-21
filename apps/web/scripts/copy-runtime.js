#!/usr/bin/env node
// Serves the game runtime and the Ember reference game as static files:
//   public/runtime/vendor/{game-kit.js,three.min.js}  <- preview + download
//   public/games/ember/{index.html,vendor/three.min.js} <- play Ember on the site
// Turbo builds @frankie/game-kit and @frankie/ember first (dependsOn ^build).
'use strict';
const fs = require('fs');
const path = require('path');
const { VENDOR_FILES } = require('@frankie/game-kit');

const PUBLIC = path.join(__dirname, '..', 'public');
const runtime = path.join(PUBLIC, 'runtime', 'vendor');
fs.mkdirSync(runtime, { recursive: true });
for (const [published, src] of Object.entries(VENDOR_FILES)) {
  fs.copyFileSync(src, path.join(PUBLIC, 'runtime', published));
}

const emberRoot = path.dirname(require.resolve('@frankie/ember/package.json'));
const emberOut = path.join(PUBLIC, 'games', 'ember');
fs.mkdirSync(path.join(emberOut, 'vendor'), { recursive: true });
fs.copyFileSync(path.join(emberRoot, 'index.html'), path.join(emberOut, 'index.html'));
fs.copyFileSync(path.join(emberRoot, 'vendor', 'three.min.js'), path.join(emberOut, 'vendor', 'three.min.js'));
console.log('web: copied game runtime + Ember into public/');
