'use strict';
// Node-side entry: where the browser runtime files live, so apps can copy or
// serve them. The runtime itself is src/game-kit.js (plain browser script).
const path = require('path');

const VENDOR_DIR = path.join(__dirname, 'dist', 'vendor');

module.exports = {
  VENDOR_DIR,
  // published path (relative to a game's index.html) -> absolute file on disk
  VENDOR_FILES: {
    'vendor/game-kit.js': path.join(VENDOR_DIR, 'game-kit.js'),
    'vendor/three.min.js': path.join(VENDOR_DIR, 'three.min.js'),
  },
};
