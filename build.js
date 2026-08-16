#!/usr/bin/env node
/*
 * build.js — assembles the game's source files into a single, readable index.html.
 *
 * Competition packaging rules this satisfies:
 *   - index.html lives at the top level of the build.
 *   - ALL game code ends up inside index.html (inlined, not minified, fully readable).
 *   - Third-party libraries (if any) live in vendor/ and are referenced by relative path.
 *   - No external network requests: everything is bundled or procedurally generated.
 *
 * Run:  node build.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');

// Order matters: files are concatenated inside a single IIFE in this sequence.
const JS_FILES = ['game.js'];
const CSS_FILES = ['style.css'];

function read(rel) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const css = CSS_FILES.map(read).join('\n\n');
const js = JS_FILES.map((f) => `/* ===== src/${f} ===== */\n${read(f)}`).join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#0a0710" />
<title>Ember — a survival prototype</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E%F0%9F%94%A5%3C/text%3E%3C/svg%3E" />
<style>
${css}
</style>
</head>
<body>
<div id="stage">
  <canvas id="game"></canvas>
</div>
<script>
"use strict";
(function () {
${js}
})();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');

const bytes = Buffer.byteLength(html, 'utf8');
console.log(`Built index.html (${(bytes / 1024).toFixed(1)} KB)`);
