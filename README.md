# Ember

A single-player, portrait **survival & resource management** prototype, in 3D.

Your campfire is your light, your warmth, your currency, and your only weapon.
Gather wood in the dark, feed the fire (or spend the wood on upgrades), and
survive five escalating nights. If the fire dies or you freeze, the dark wins.

Rendered with **Three.js** (WebGL): the fire is a real light that flickers and
casts dynamic shadows across a low-poly world. Three.js is the only library; every
model is built procedurally and every sound is synthesized. Runs fully offline.

## Play

Open the built `index.html` from a local web server (not `file://`), in portrait:

```bash
node build.js            # assemble src/ -> index.html (+ vendor/three.min.js)
python3 -m http.server 8000
# open http://localhost:8000 in a phone-shaped / portrait window
```

Drag anywhere to move (or WASD / arrow keys). Walk into pines to chop wood; return
to the fire to bank it; then **FEED** the fire or buy upgrades from the bottom dock.

## Project layout

```
src/
  game3d.js     the 3D game, logic + Three.js rendering + DOM HUD (primary)
  style3d.css   layout & DOM HUD styling
  game.js       original 2D Canvas build (kept as a fallback)
  style.css     2D build styling
vendor/
  three.min.js  Three.js r128 (only third-party lib; referenced by relative path)
build.js        assembles src/ into a single readable, unminified index.html
index.html      the built game (generated)
scripts/        headless verification + packaging harness
BUILD_LOG.md    how it was built, pass by pass
DESIGN_INTENT.md ~460-word design brief (for the submission template)
```

## Build & verify

```bash
node build.js                    # build index.html (references vendor/three.min.js)
node scripts/verify-game3d.js    # WebGL render + driven play + feed/upgrade asserts
node scripts/verify-ends.js      # assert win / lose / reset screens
node scripts/balance.js          # sensible-vs-careless bot win rates
node scripts/offline-check.js    # assert zero external network requests
node scripts/package.js          # produce ember.zip (index.html at top level)
```

Browser checks run headless Chromium with SwiftShader so WebGL renders offscreen.

## Submission

`node scripts/package.js` produces **`ember.zip`** (~161 KB, well under the 35 MB
limit) with `index.html` at the top level and a `vendor/` folder containing
`three.min.js`, ready to submit.
