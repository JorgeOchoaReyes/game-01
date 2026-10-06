# EMBER — Agent Handoff Spec

## 0. One-line summary
Ember is a single-player, portrait, 3D survival/resource-management prototype (Three.js r128 + vanilla JS). The campfire is simultaneously your light, warmth, currency, and weapon. Gather wood in the dark -> feed the fire or buy upgrades -> survive escalating nightly enemy waves. Win = survive 5 nights; then optional endless mode. Built for an AI-native game competition with strict offline/packaging rules.

## 1. Repository & branch
- Repo: https://github.com/JorgeOchoaReyes/game-01
- Working/default branch: `claude/untitled-session-8nu944` — this is ALSO the repo's default branch. There is no separate base branch, so a PR cannot be opened (a branch can't PR against itself). Commit and push directly to this branch.
- Platform: Node.js project; game runs in-browser.

## 2. Directory layout (exact)
```
game-01/
  src/
    game3d.js      <- THE GAME. ~2050 lines. All logic + rendering. EDIT THIS.
    style3d.css    <- all game CSS / HUD styling. EDIT THIS.
    game.js        <- OLD 2D prototype. DEAD CODE. Do not edit; not shipped.
    style.css      <- OLD 2D styles. DEAD CODE. Not shipped.
  vendor/
    three.min.js   <- Three.js r128 (MIT). The ONLY third-party lib. Referenced by relative path.
    README.txt     <- vendor notes
  build.js         <- assembles src/style3d.css + src/game3d.js -> index.html (run: node build.js)
  index.html       <- GENERATED build output (do not hand-edit; regenerate with build.js)
  ember.zip        <- GENERATED submission package (node scripts/package.js)
  scripts/         <- build/verify/screenshot/balance tooling (see section 7)
  DESIGN_INTENT.docx + scripts/make-docx.js  <- design-intent doc (<=500 words, generated)
  PROMPTS.md       <- the competition "Build Log" (prompts used). KEEP THIS the prompts file.
  BUILD_LOG.md     <- narrative dev log (NOT the submission build-log field)
  SUBMISSION.md, SUBMISSION_WRITEUP.md, README.md  <- submission docs
  logo/            <- ember-logo-3x2.png (3:2 submission logo) + icons/wordmark
```

CRITICAL: `src/game.js` and `src/style.css` are the abandoned 2D version. The live game is `src/game3d.js` + `src/style3d.css` ONLY.

## 3. Build & run
- Build the single-file game: `node build.js` -> writes `index.html` (inlines style3d.css + game3d.js; keeps `<script src="vendor/three.min.js">` as a relative path).
- Package for submission: `node scripts/package.js` -> `ember.zip` (index.html at zip root + vendor/ folder). ~184 KB.
- Serve locally to play: any static server from repo root, e.g. `python3 -m http.server 8080` then open `index.html`. (Headless verifiers spin up their own local server.)
- There is NO bundler/transpiler. Plain ES5-style JS (`var`, function declarations). Keep that style.

## 4. Competition constraints — DO NOT BREAK THESE
1. Fully offline: zero external network requests at runtime. No CDNs, no fetch to remote hosts, no remote fonts/images/audio. Everything procedural or bundled.
2. Packaging: single `.zip` <=35 MB, `index.html` at the TOP LEVEL (not in a folder). Third-party libs live in `vendor/` referenced by relative path, NOT embedded in index.html.
3. Readable code: index.html game code must be unminified and readable.
4. All assets bundled: no asset files exist today — every 3D model is procedural geometry, every sound is Web Audio synthesis, including the chiptune track. Keep it that way (adding binary assets is allowed only if bundled in the zip + referenced relatively, but procedural is preferred to stay tiny).
5. Single-player, portrait, no multiplayer.
6. Genre: Survival & Resource Management.
7. Design-Intent doc: <=500 words, .docx, text-only, English, NO name/identifying info. Currently 488 words (counting title+headings). Regenerate via `node scripts/make-docx.js`.
8. No em dashes anywhere in the shipped docs (house style the owner enforced). Use commas/periods.

After ANY game change, re-verify offline + playability (see section 7) before pushing.

## 5. Architecture of src/game3d.js
The game logic runs in a 2D top-down field `(x, y)` and is rendered by mapping that field onto the 3D ground plane: `x -> world x`, `y -> world z`, via scale `K = 0.03`. All tuned distances/speeds are in 2D game units.

Field / world constants (top of file):
- `VW=540, VH=960` (portrait field). `K=0.03` (game->world). `ARENA=250` (play radius in game units).
- `CFG.fireX = 270` (VW/2), `CFG.fireY = 576` (VH*0.60) — fire position in game units.
- Field bounds: `FIELD_UP=600, FIELD_DOWN=95, FIELD_HALFW=235`; `BOUND = {x0:35, x1:505, y0:-24, y1:671}`. The field is TALLER than one screen; the fire sits near the bottom, forest stretches "north" (up, decreasing y).
- `wx(gx), wz(gy), wr(gr)` convert game units -> world units.

Camera: PerspectiveCamera fov 56. FOLLOWS the player up/down the field. `camZ` lerps toward `wz(survivor.y)`. Tunables: `LOOK_BIAS=-4.95`, `DOLLY_Z=16.8`. `CAM=(0,13.5,10.2)`, `CAM_LOOK=(0,0.2,-6.6)`. `computeBounds()` is intentionally a no-op (field is fixed, camera scrolls).

Lights: `ambient` HemisphereLight (0x38406a/0x0a0812, 0.5); `fireLight` PointLight (0xff8a3a, intensity 6, distance 46, decay 1.25, casts shadows, 1024^2 shadow map); `moonLight` DirectionalLight (0x4a5a86, 0.38). Scene background 0x06040c, FogExp2 density 0.05. Renderer: PCFSoftShadowMap, sRGBEncoding, pixelRatio capped at 2.

CFG (core tuning object):
```
fuelMax:100, warmthMax:100, survivorSpeed:215, carryBase:6, gatherTime:0.65,
feedPerLog:4.1, fuelCap:130, nights:5, nightLen:26, dawnLen:10, bankRadius:92, treeCount:11
```

## 6. Game systems (where to find each)

Resource economy (the pillar): Wood you carry feeds the fire DIRECTLY (`feedPerLog=4.1` fuel per log) when you enter the bank radius. Fuel drives `fireRadius()` (light + protection + burn reach) and `fireIntensity()`. Upgrades cost the fire's own fuel (real sacrifice). Key fns: `fireRadius()` (L559), `fireIntensity()` (L560), `carryCap()` (L561), `burnDps()` (L562), `moveSpeed()` (L563), `gatherTime()` (L564).

Fire decay / warmth: `var decay = 1.45 + night*0.4 + (phase==='night'?1.9:0)` (L822). Cold drain `coldBase = 5.5 + night*0.8 + (night?2.2:0)` when outside fire radius (L860). Fire is intentionally hard to keep alive; combos are short.

Permanent upgrades `UPGRADES` (L462), bought with fuel:
- `stoke` (fire radius, +14 each), `ashheart` (burn dps, +12), `satchel` (carry +3), `coat` (cold resist). Each max 5. Cost = `base + step*lvl`.

Power-ups `BUFFS` (L471) — 11 total. Timed ones have `dur`; instant ones `dur:0`:
`inferno` (12s, fire x), `swift` (12s, speed x1.6), `ward` (12s), `harvest` (14s, chop x0.5), `chainsaw` (10s, one-shot trees), `sling` (14s, auto-fling carried wood at shades), `telekinesis` (10s, wood flies to fire), `nova` (instant screen-clear blast), `humantorch` (instant: kills near shades + burns near trees into fire, costs your whole pack), `supernova` (instant: burns ALL trees+shades, turns fire blue-hot), `toolbelt` (instant permanent +2 carry).

Power-up level gating `randomDropType()` (L488): tier1 (inferno/swift/harvest/ward) always; night>=2 adds sling x2 + nova; night>=3 adds telekinesis x2 + toolbelt + humantorch; night>=4 adds chainsaw; night>=5 adds supernova.

Slingshot: `SLING_RANGE=235, SLING_SPEED=540, SLING_DMG=8, SLING_CD=0.4`. Projectiles in `projs[]`.

Enemies `spawnShade(hpMul,spdMul,kind)` (L583): three kinds —
- `shade` (basic): hp 3, r 12, spd 26-40, bite 4.
- `brute`: hp 10, r 19, slow (spd 15-22), bite 7 (hits fire hard), guaranteed drop.
- `irregular`: hp 6, r 13, fast (spd 44-58), bite 0 — HUNTS THE PLAYER, torch CANNOT kill it (only slingshot or the fire can), steals 1 wood on contact.
Spawn on a ring around the fire (radius 300-380). Scaling: `hpMul = 1+(night-1)*0.85`, `spdMul = 1+(night-1)*0.13`. Wave rate `ratePerSec = min(0.8+night*0.55, 6.5)`. Brutes from night 3, irregulars from night 2. Soft cap 100 shades. Shades that reach the fire drain its fuel (shows "fire -N" floater).

Combo / score: `COMBO_HOLD=1.5` (short window). `comboMult()=1+min(combo,40)*0.05` (up to 3x). Any reward action (chop/crit/kill/feed) calls `bumpCombo(n)`. Style bonus accumulates in `game.bonus`; `computeScore()` (L543). Floating reward numbers via `addFloater()` (L555) rendered in `#floaters`.

Nights / phases: dawn (`dawnLen=10`, shop + boon pick) -> night (`nightLen=26`, waves). `startLevelUp()` (L736) + celebration (confetti, "NIGHT X SURVIVED" banner, `Audio2.nightWin()`). Between-night boon pick: `pickBoon()` (L750), choose 1 of 3 run mods (`game.mods`).

Trees: `treeTarget() = min(12+(night-1)*2, 26)` (L567). `spawnTree()` (L568) spreads across the field (~88% above the fire), min 95 units from fire, 60-unit spacing. Deterministic top-up each frame keeps the forest stocked. `game.carry < carryCap()` gates chopping; you cannot walk through trees.

Win/lose/endless: `endGame(win)` (L702). Win after night 5 -> win screen with "KEEP THE FIRE BURNING" (`continueEndless()`, L721) and "New run". Lose -> red fade + "TRY AGAIN". `continueEndless()` sets `game.endless`, night=6, keeps escalating.

Blue-hot fire: `heatTier = clamp((night-3)/10,0,1)`; `novaBlue` from `game.blueFire`; `blue` factor tints flame cones/coals/embers/light at deep nights and during Nova/Super Nova (L1171).

Procedural 3D builders: `buildTree` (L251), `buildShade` (L280), `buildDrop` (L302), `buildProj` (L328), `buildGroundWood` (L336), `makePine` (L234), `flameCone` (L146), survivor built inline. Render loop: `renderScene(dt)` (L1166), `frame()` (L1734). `disposeGroup()` (L1459) frees geometry/materials (watch for leaks when adding objects).

Audio (`Audio2`): Web Audio API, fully synthesized SFX + 8-bit chiptune loop (scheduler w/ lookahead). `AUDIO_STATE` 0=all, 1=music off, 2=muted, persisted in localStorage `ember_audio`. `Audio2.cycleAudio()`, `Audio2.resume()` (call on first user gesture), `Audio2.nightWin()`, `Audio2.hurt()`, etc.

Input: virtual joystick via pointer/touch drag (`pDown/pMove/pUp`, `localPt`), plus keyboard WASD/arrows (`keyboardDir`, L1148). Mouse + touch + keys all wired (L1142-1147).

Persistence (localStorage keys): `ember_best` (best score), `ember_tut` (tutorial done), `ember_audio` (audio state).

First-load tutorial: `game.tut` (0 done, 1 chop, 2 deliver). `tutDone()/markTutDone()`. Bouncing pointer `#tutptr` + `#tuttext` guide first chop -> first drop-off, then hands-off forever.

HUD DOM (created/styled, ids): `#stage #c #hud #banner #buffs #cold #combo #controls #danger #flash #floaters #hurt #packhint #stick #tutptr #tuttext #vignette #warn`. CSS classes incl. `.dock .meter .boon .confetti .titleflame .bestbadge .nightbadge .ctrlbtn .floater`. `#danger` red-edge pulse when `fuel<22`; `#hurt` red flash on damage. NOTE: `[hidden]{display:none!important}` is in the CSS so `element.hidden` works on flex elements — keep it.

Controls UI: top-right `#controls` with pause (freezes via `game.paused`; `update()` early-returns) + mute cycle. Pause overlay has RESUME + Restart.

## 7. Verification & tooling (scripts/) — run after every change
Headless Playwright over a local server, using Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` with `--use-gl=angle --use-angle=swiftshader`. The game exposes a debug hook `window.__EMBER`:
```
__EMBER = { game, survivor, trees, shades, drops, projs, groundWood, input, cfg, upgrades, buffs,
            step(dt), start, endless, buy(key), pick(idx), cost(key), fireRadius, carryCap }
```
Key scripts:
- `node scripts/offline-check.js` — MUST show "OFFLINE-SAFE: no external requests" (only localhost requests allowed).
- `node scripts/verify-game3d.js` — core loop: WebGL renders, 0 external, 0 errors, feed/spend actions work. Must print `ALL OK: true`.
- `node scripts/verify-features.js`, `verify-endless.js` — feature/endless checks.
- `node scripts/balance.js` — runs a sensible-player BOT through full games (aggregate 35-40 for signal; bot detours for nearby drops). Target: sensible ~63% win, careless ~53%, reckless ~3%. Re-check balance after any difficulty/economy change.
- `node build.js` then `node scripts/package.js` — rebuild index.html + ember.zip.
- `node scripts/make-docx.js` — regenerate DESIGN_INTENT.docx (keep <=500 words, no dashes, no names).
- `node scripts/make-artifact.js <outpath>` — builds a CSP-safe single-file Artifact with Three.js INLINED (needs an output path arg or it errors). Only for the claude.ai artifact preview, not the submission.
- `scripts/shot-*.js` and `scripts/t-*.js` — screenshot helpers for visual QA of specific features.
- `scripts/logo-*.html` + `scripts/render-logo.js` — regenerate logos offline.

## 8. Git workflow for the new agent
- Develop on `claude/untitled-session-8nu944`; create it from latest if missing.
- `git push -u origin claude/untitled-session-8nu944` (retry on network error with backoff 2s/4s/8s/16s).
- Do NOT open a PR (branch is its own default; also only open PRs when the owner asks).
- The owner requires a commit-message footer on every commit identifying the AI author + session. A new agent/session should use its own session's attribution lines, not a prior session's verbatim.

## 9. Known gotchas
- `make-artifact.js` throws `ERR_INVALID_ARG_TYPE` if called without an output path arg.
- `element.hidden` needs the `[hidden]{display:none!important}` CSS rule (flex elements override UA default) — don't remove it.
- Tutorial test "step 2" can hit a one-frame race between manual `__EMBER.step()` and the rAF DOM update; use ~300 ms waits in tests.
- Balance is noisy per-game — ALWAYS aggregate 30-40 bot games; a few runs swing wildly.
- Editing lines with emoji/combining chars: grep the exact current text first; Edit "string not found" usually means an invisible char mismatch.
- Only edit `game3d.js`/`style3d.css`; `game.js`/`style.css` are dead.
- Always `node build.js` after editing src/ — `index.html` is generated, not hand-maintained.

## 10. Current status
Complete, tuned, compliant prototype. Verified: 0 external runtime requests, index.html at zip root + vendor/, ~184 KB, readable (1975 lines), 0 runtime errors, core loop plays start->finish, design doc 488 words/0 dashes/no identifying info. Balance ~63%/53%/3% (sensible/careless/reckless).
