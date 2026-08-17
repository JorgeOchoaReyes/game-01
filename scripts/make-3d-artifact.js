// Assemble the 3D look-test into a single self-contained Artifact page:
// inlines vendor/three.min.js + the scene CSS/JS (no external requests at runtime).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const three = fs.readFileSync(path.join(ROOT, 'vendor', 'three.min.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src-3d', 'style.css'), 'utf8');
const scene = fs.readFileSync(path.join(ROOT, 'src-3d', 'scene.js'), 'utf8');
const out = process.argv[2];
const html = `<style>
${css}
</style>

<div id="stage">
  <canvas id="c"></canvas>
  <div id="hud">
    <span class="badge">3D LOOK TEST</span>
    <h1>EMBER</h1>
    <p>Drag to move &middot; tap STOKE to feed the fire</p>
  </div>
  <button id="stoke">🔥 STOKE</button>
</div>

<script>
${three}
</script>

<script>
${scene}
</script>
`;
fs.writeFileSync(out, html, 'utf8');
console.log('wrote', out, (Buffer.byteLength(html) / 1024).toFixed(0), 'KB');
