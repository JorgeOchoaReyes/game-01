#!/usr/bin/env node
/*
 * build.js — assembles the game's source files into a single, readable index.html.
 *
 * Competition packaging rules this satisfies:
 *   - index.html lives at the top level of the build.
 *   - ALL game code ends up inside index.html (inlined, not minified, readable).
 *   - Third-party libraries live in vendor/ and are referenced by relative path.
 *     (Three.js -> vendor/three.min.js, loaded with a relative <script src>.)
 *   - No external network requests: everything is bundled or procedural.
 *
 * Run:  node build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');

const css = fs.readFileSync(path.join(SRC, 'style3d.css'), 'utf8');
const game = fs.readFileSync(path.join(SRC, 'game3d.js'), 'utf8');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#06040c" />
<title>Ember — a survival prototype</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E%F0%9F%94%A5%3C/text%3E%3C/svg%3E" />
<style>
${css}
</style>
</head>
<body>
<div id="stage">
  <canvas id="c"></canvas>
</div>

<!-- third-party library, bundled and referenced by relative path (no CDN) -->
<script src="vendor/three.min.js"></script>

<!-- the whole game, readable and unminified -->
<script>
"use strict";
${game}
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
console.log(`Built index.html (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} KB) + vendor/three.min.js`);
