// Generate a self-contained Artifact page from the same src/ files (kept in sync
// with the game). The Artifact CSP blocks external hosts, so Three.js is inlined
// here (in the shipped build it lives in vendor/ and is referenced by path).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const three = fs.readFileSync(path.join(ROOT, 'vendor', 'three.min.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src', 'style3d.css'), 'utf8');
const game = fs.readFileSync(path.join(ROOT, 'src', 'game3d.js'), 'utf8');
const out = process.argv[2];
const html = `<style>
${css}
</style>

<div id="stage">
  <canvas id="c"></canvas>
</div>

<script>
${three}
</script>

<script>
${game}
</script>
`;
fs.writeFileSync(out, html, 'utf8');
console.log('wrote', out, (Buffer.byteLength(html) / 1024).toFixed(0), 'KB');
