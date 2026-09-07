# EMBER Submission Sheet

> Everything needed to submit the prototype, in one place.

---

## At a glance

| Field | Value |
|---|---|
| **Title** | Ember |
| **Tagline** | One fire. Your light, your warmth, your wealth, your weapon. |
| **Genre** | Survival & Resource Management |
| **Players** | Single-player |
| **Orientation** | Portrait (9:16), never rotates |
| **Platform** | Mobile web (touch), also plays with mouse / WASD / arrows |
| **Session length** | ~3 to 5 minutes per run; endless mode for longer sessions |
| **Tech** | Vanilla JS + Three.js (WebGL 3D), Web Audio (synthesized SFX + chiptune) |
| **Offline** | Fully self-contained, zero external/network requests |
| **Build size** | ~182 KB zipped (limit 35 MB) |

---

## Descriptions (copy-paste ready)

**One-liner**
Feed the one fire that is your light, warmth, currency, and only weapon, and survive the dark.

**Short (store blurb)**
Your campfire is everything at once: light to gather by, warmth to stay alive, currency for upgrades, and a weapon against the dark. Leave its glow to chop wood, bring it back to feed the flames, and survive five escalating nights, then keep the fire burning as long as you can in endless mode. Every run is a tense push-your-luck between a hotter fire and the shades closing in.

**Full**
Ember collapses the survival genre's gather → craft → defend loop onto a single resource. Wood is fuel *and* upgrade currency *and* slingshot ammo, so every choice is an immediate trade-off: feed the fire now for a wider, safer light, or spend its strength on lasting power. At night, shades crawl from the dark to drain the fire; a well-fed fire burns them, and you can swing your torch or sling wood to beat back any that slip through. Ability drops appear far out in the dark, grabbing one is a real gamble. Survive Night 5 for a triumphant dawn, then choose to keep the fire burning into endless, ever-hotter nights while your score climbs. Rendered in 3D so the fire is a real, flickering light that casts dynamic shadows and burns from orange to blue-white the deeper you go.

---

## How to play

- **Move:** drag anywhere on screen (virtual joystick), or WASD / arrow keys.
- **Gather:** walk into a pine to chop it, wood loads into your pack (watch the PACK pips).
- **Feed:** return to the fire; your wood is thrown in and the fire burns brighter, wider, hotter.
- **Upgrade:** spend the fire's own fuel on Stoke (reach), Ashheart (burn), Satchel (carry), Coat (warmth).
- **Survive the night:** a fed fire burns shades; swing your torch to bash any that get close.
- **Grab drops:** glowing pickups appear far from the fire, brave the dark for powers.
- **Between nights:** pick one of three permanent boons (the "level up").
- **Win:** survive 5 nights. **Then:** "Keep the fire burning" for endless mode. **Lose:** the fire dies or you freeze.

---

## Key features

- **One-resource design**: fuel = light radius = burn power = survival = currency = ammo.
- **Momentum combo**: chops, crits and kills feed a streak that multiplies a style-bonus score.
- **Constant reward feedback**: floating numbers on every chop, kill and feed.
- **Two-layer progression**: four fuel-bought upgrades + between-nights boon picks.
- **Ability drops (unlock by depth):** Inferno, Swift, Ward, Harvest, Nova, Slingshot, Telekinesis, Human Torch, a screen-wide Super Nova, Chainsaw, and Toolbelt.
- **Three enemy types**: shades (drain the fire), tanky Brutes, and player-hunting Irregulars (killable only by slingshot or fire).
- **Endless mode** after the Night-5 win, with escalating waves and a persistent best score.
- **Reactive 3D fire**: scales with fuel, throws dynamic shadows, and shifts to intense blue-white on deep nights or a Nova.
- **Clear game feel**: red damage flash on hits, a hard flash on death, win sunrise + confetti.
- **8-bit chiptune** and fully synthesized SFX; **fully offline**.

---

## Deliverables

| File | What it is |
|---|---|
| `ember.zip` | The build. `index.html` at top level + `vendor/three.min.js`. Unzip and open `index.html`. |
| `DESIGN_INTENT.docx` | Design-Intent document (text-only, ≤500 words). |
| `BUILD_LOG.md` | Full build log, every pass, verification, and balancing note. |
| `logo/ember-icon-1024.png` | App icon, 1024×1024. |
| `logo/ember-icon-512.png` | App icon, 512×512. |
| `logo/ember-wordmark.png` | Wordmark logo (transparent background). |
| `README.md` | Repo overview + how to build/run. |

**Playable preview:** https://claude.ai/code/artifact/8f4e1c4f-cf0a-4706-9b99-839e5978d6e1
**Source branch:** `claude/untitled-session-8nu944`

---

## Compliance checklist

- [x] **Single-player** only.
- [x] **Portrait** only; never rotates.
- [x] **Fully self-contained / offline**: verified 0 external requests (`scripts/offline-check.js`).
- [x] **`index.html` at the top level** of the zip.
- [x] **Under 35 MB**: build is ~182 KB.
- [x] **Readable, unminified** code produced by a build step (`build.js`).
- [x] **Third-party libraries in `vendor/`**: only Three.js, referenced by relative path (never a CDN at runtime).
- [x] **No runtime external requests**: procedural art, synthesized audio, no external assets.
- [x] **Design-Intent document**: text-only, ≤500 words.
- [x] **Build log** included.

---

## Tech notes

- Presentation is 3D (Three.js r128, WebGL, soft shadows); game logic runs in a 2D top-down field mapped onto the ground plane, so tuned distances/speeds carry over exactly.
- All art is built procedurally in code, no image or model files. All audio is synthesized with the Web Audio API, no sound files. This is what keeps the build tiny and fully offline.
- Verified in a real headless browser: WebGL renders, the core loop plays start-to-finish, and balance was tuned with bot cohorts (good play wins around two-thirds of runs, reckless play almost always loses).

## Credits

Built with Claude Code. Three.js © its authors (MIT), bundled in `vendor/`.
