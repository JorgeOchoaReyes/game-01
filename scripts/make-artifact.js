// Generate a self-contained Artifact page from the same src/ files (kept in sync
// with the game). The Artifact host provides <!doctype>/<head>/<body>, so we emit
// only the page content: an inline <style>, the stage markup, and the game script.
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', 'src');
const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(SRC, 'game.js'), 'utf8');
const out = process.argv[2];
const html = `<style>
${css}
</style>

<div id="stage">
  <canvas id="game"></canvas>
</div>

<script>
"use strict";
(function () {
${js}
})();
</script>
`;
fs.writeFileSync(out, html, 'utf8');
console.log('wrote', out, (Buffer.byteLength(html) / 1024).toFixed(1), 'KB');
