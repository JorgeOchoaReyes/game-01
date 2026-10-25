'use strict';
// Loads game-kit.js in a fake browser and lists every public Kit path.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function kitSurface() {
  const window = {
    addEventListener() {}, location: { search: '', href: 'http://x/' },
    localStorage: { getItem() { return null; }, setItem() {} },
    requestAnimationFrame() {}, URLSearchParams, URL, console,
  };
  window.window = window;
  const document = { addEventListener() {}, getElementById() { return null; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'game-kit.js'), 'utf8'), { window, document, URLSearchParams, URL, console });
  const paths = [];
  const namespaces = [];
  (function walk(obj, prefix, depth) {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('_')) continue;
      const p = `${prefix}.${key}`;
      paths.push(p);
      const desc = Object.getOwnPropertyDescriptor(obj, key);
      const v = desc.get ? undefined : obj[key];
      if (v && typeof v === 'object' && !Array.isArray(v) && depth < 3 && Object.keys(v).some((k) => typeof v[k] === 'function')) {
        namespaces.push(p);
        walk(v, p, depth + 1);
      }
    }
  })(window.Kit, 'Kit', 0);
  // Kit.view is set by Kit.canvas() at runtime
  paths.push('Kit.view');
  return { paths: paths.sort(), namespaces: namespaces.sort() };
}

module.exports = { kitSurface };
if (require.main === module) console.log(JSON.stringify(kitSurface()));
