# Ember

A single-player, portrait **survival & resource management** prototype.

Your campfire is your light, your warmth, your currency, and your only weapon.
Gather wood in the dark, feed the fire (or spend the wood on upgrades), and
survive five escalating nights. If the fire dies or you freeze, the dark wins.

Vanilla JavaScript + HTML5 Canvas. No libraries, no assets, no network — every
pixel is drawn procedurally and every sound is synthesized. Runs fully offline.

## Play

Open the built `index.html` from a local web server (not `file://`), in portrait:

```bash
node build.js            # assemble src/ -> index.html
python3 -m http.server 8000
# open http://localhost:8000 in a phone-shaped / portrait window
```

Drag anywhere to move (or WASD / arrow keys). Walk into trees to chop wood; return
to the fire to bank it; then **FEED** the fire or buy upgrades from the bottom dock.

## Project layout

```
src/            source files (developed here)
  game.js       all game logic + rendering
  style.css     layout & UI
build.js        assembles src/ into a single readable, unminified index.html
index.html      the built game (generated)
vendor/         third-party libraries (none used — see vendor/README.txt)
scripts/        headless verification + packaging harness
BUILD_LOG.md    how it was built, pass by pass
DESIGN_INTENT.md ~430-word design brief (for the submission template)
```

## Build & verify

```bash
node build.js                 # build index.html
node scripts/verify.js        # drive real play; assert feed/upgrade work
node scripts/verify-ends.js   # assert win / lose / reset screens
node scripts/balance.js       # sensible-vs-careless bot win rates
node scripts/offline-check.js # assert zero external network requests
node scripts/package.js       # produce ember.zip (index.html at top level)
```

## Submission

`node scripts/package.js` produces **`ember.zip`** (~15 KB, well under the 35 MB
limit) with `index.html` at the top level and a `vendor/` folder — ready to submit.
