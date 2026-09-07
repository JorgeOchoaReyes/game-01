# Ember — Build Log

A single-player, portrait **survival & resource management** prototype, built by
prompting an AI coding agent and verifying every pass in a real headless browser.

- **Genre:** Survival & Resource Management
- **Pitch:** Your campfire is your light, your warmth, your currency, and your only
  weapon — one resource that does everything. Gather wood in the dark, feed the
  fire, and survive five escalating nights.
- **Tech:** Vanilla JS + **Three.js** (WebGL) for 3D rendering, Web Audio for
  synthesized SFX. Three.js is the only third-party library (bundled in `vendor/`);
  every model is built procedurally in code, no external assets, no network
  requests. Started as HTML5 Canvas 2D, then converted to 3D (see passes 8–9).

---

## Design north star

The brief rewards a fun, playable **core loop** and **depth on a focused core**
over breadth. So the whole game is built around one tension:

> To keep the fire strong you must leave it — and leaving it is what puts it (and
> you) in danger.

Everything ties back to the single "fire" resource:
- **Fuel = light radius** (how far you can safely gather),
- **Fuel = burn power** (a hot fire kills shades before they reach it),
- **Fuel = survival** (0 fuel = game over),
- **Wood = fuel AND upgrade currency** (feed now vs. invest for later).

That satisfies the genre floor cleanly: **gather** (wood in the dark) → **convert**
(feed the fire / craft permanent upgrades) → **survive** an **escalating threat**
(nightly shade waves).

## Constraints locked up front

Told the agent the non-negotiables in the first prompt, per the guidance:
- **Single-player**, **portrait only**, never rotates.
- **Fully self-contained / offline**: everything bundled, procedural art,
  synthesized audio, zero external requests.
- **Readable single `index.html`** produced by a build step; libraries (none here)
  would go in `vendor/`.

## Build passes (small, verified steps)

Each pass ended with a real browser check — screenshots for layout/legibility and
a headless driver for behaviour. "Done" was never trusted without playing it.

1. **Scaffold + build pipeline.** `src/` → `build.js` inlines CSS + JS into one
   readable, unminified `index.html`. Portrait 9:16 stage, fixed 540×960 virtual
   canvas scaled to device pixels; DOM overlays share the same box.
2. **Core loop.** Fire with fuel-driven light radius; virtual-joystick + keyboard
   movement; wood nodes you chop by contact; banking wood at the fire; a **FEED**
   action that converts wood → fuel with a flare burst. Top HUD meters.
3. **Threat + survival.** Shades spawn from the dark and drain the fire; a lit fire
   burns them (scales with fuel); a **warmth** meter drains in the dark and refills
   in the light — a second, spatial lose condition that makes gathering a real risk.
4. **Escalation + states.** Night/dawn phases, five nights, per-night scaling of
   spawn rate / HP / decay. Win at the end of Night 5; lose on fire-death or
   freezing. Title, game-over, and win screens with a score and **Play Again**.
5. **Upgrades.** Four tracks bought with banked wood — Stoke (radius), Ashheart
   (burn), Satchel (carry), Coat (warmth) — the "invest vs. feed now" decision.
6. **Feedback & juice.** Particles, screen shake, feed flash, flicker, cold-blue
   vignette, phase banners, a "fire is dying" warning, and synthesized SFX for
   every action.
7. **Art + fire-scaling pass (still 2D).** Made the flame scale hard with fuel — a
   white-hot tower with an ember shower when fed, collapsing to a dim nub over
   glowing coals as it dies — and redrew the survivor (hooded torch-bearer with a
   walk cycle), trees (layered pines), and shades (wispy wraiths).
8. **3D conversion (Three.js).** Swapped the presentation layer to a WebGL scene:
   the fire became a real flickering point light casting **dynamic shadows** from
   low-poly pines and a torch-bearing survivor. Crucially, the game logic was left
   byte-identical — logic still runs in the 2D top-down field and is mapped onto the
   ground plane (x→x, y→z), so every tuned distance/radius/speed carried over. All
   HUD moved to DOM (meters, banners, joystick, dock, screens) since the canvas is
   now WebGL. Three.js is bundled in `vendor/` and referenced by relative path in
   `index.html`; the Artifact preview inlines it (CSP forbids external hosts).
9. **3D readability fix.** Shades first read as dark rocks, so I made them
   self-glowing purple wraiths with a soft halo and bright eyes — threats now read
   at a glance even outside the firelight.
10. **Feel + clarity pass (from playtests).** Smooth eased turning, a walk cycle,
    and an overhead chop/attack swing; harvestable pines wear a ground ring and a
    progress bar and visibly shrink as they're felled; the fire's *light* now
    scales hard with fuel (a dying fire throws a small, dark pool); enemies glow
    orange and show HP bars as the fire burns them; a "pack full" nudge explains
    the gather dead-zone.
11. **Depth pass (progression + difficulty).** Ability drops — shades drop (and
    each dawn grants) glowing pickups: Inferno (fire burns 2× and wider), Swift
    (move faster), Ward (immune to cold), Harvest (chop twice as fast, bonus logs),
    and Nova (instant screen-clearing blast), shown as timed HUD chips. A tanky
    Brute shade from night 3+, steeper per-night escalation, critical chops for
    bonus wood, and solid tree collision (no walking through trunks). Re-balanced:
    sensible 5/5, careless 5/5 on the razor's edge, reckless ~3/5.
12. **Readability pass (from playtests).** Carry shown as a PACK pip meter (and a
    floating meter above the avatar), plus a "pack full" nudge; a fire strength/
    range ring that grows and brightens with fuel; a bank drop-zone ring. Fixed a
    tree-respawn dry-out with a deterministic top-up that always keeps 6 reachable
    trees and refills fast.
13. **Retention + game-feel pass.** Between-nights level-up: pick 1 of 3 permanent
    run boons. Persistent best score (localStorage) with a NEW BEST chase. A
    triumphant win (sunrise bloom, roaring fire, confetti, count-up) and a bleak
    loss (world darkens, fire gutters out). Fell trees now topple with a reward
    burst; a full pack auto-dumps from a generous range with wood arcing into the
    fire and a flare-up. Submission-checked: readable single index.html, Three.js
    in vendor/, zero external requests, portrait, single-player.
14. **Active defense.** The torch swing that chops wood now also bashes shades
    back (burn + knockback) when no tree is in reach — nights become an active
    gather-vs-defend choice, not passive fire-tending.
15. **Fixes + economy rework (from playtests).** Fixed a black-screen-on-replay
    bug (the loss darkening wasn't reset for a fresh game, which also hid the
    trees). Then reworked the economy so it reads intuitively: wood **feeds the
    fire directly** on dump (no more hidden bank + FEED button), and **upgrades
    cost the fire's own fuel** — a real sacrifice. Re-tuned: sensible 5/5,
    careless 5/5, reckless ~1/5.
16. **Rare tools + free roam (from playtests).** Two new ability drops: a
    **chainsaw** (rare, temporary) that one-shots any tree — grabbing all its
    wood in a single strike, with a chainsaw model in hand and a buzz — and a
    **toolbelt** that permanently raises carry capacity. Movement changed from
    fire-radius confinement to **free roam of the whole visible frame** (bounds
    derived by ray-casting the camera to the ground), so every tree is
    reachable; only the page edge stops you. Trees now spawn across the frame
    and shades enter from its edges. Re-tuned for the larger arena: sensible
    5/5, careless 3/5, reckless 0/5.
17. **Constant-reward / engagement pass.** Every action now pays out visibly:
    floating reward text (`+2`, `CRIT +2`, `🔥 +18`, buff names, `Lv up`) rises
    from the point of each chop, kill, feed, upgrade and pickup. A **momentum
    combo** ties it together — chops, crits and kills all feed one streak that
    multiplies a style-bonus score, drives a heating `×N COMBO` HUD readout, and
    fires a flourish every tenth hit; a hot streak also nudges drop luck, so
    aggressive play earns more powers. Best-combo and the bonus feed the
    persistent score chase (shown on the end screen). Re-tuned to keep the
    gradient: sensible 5/5, careless ~3–5/5, reckless 0/5.
18. **Endless mode.** Surviving Night 5 is still a real, celebrated win — but the
    win screen now offers **KEEP THE FIRE BURNING**: the nights no longer end,
    escalation continues forever (spawn rate, HP, decay and cold keep climbing,
    with caps so late waves stay renderable), and the run ends only in death,
    the score climbing the whole way. Upgrades, boons and best-score carry
    through. Verified headless: a competent bot wins Night 5, continues, and is
    eventually overwhelmed around Night 15 — the intended "how far can you get"
    curve. The 5-night arc's balance is unchanged (the escalation caps only bite
    from Night 7+).
19. **Slingshot, irregulars & a hotter fire (from playtests).** A new **Slingshot**
    drop auto-flings your carried wood at the nearest shade — wood is now ammo as
    well as fuel, a real trade-off. A new teal **irregular** enemy hunts the
    *player* instead of the fire, shrugs off the torch (only the slingshot or the
    fire's own burn kills it), and knocks a log out of your pack on each hit — the
    log drops as reclaimable ground wood. Shades reaching the fire now show a
    clear "🔥 −N" drain popup so the threat reads. And the fire runs hotter the
    deeper you go: from ~night 4 it shifts toward an intense, faster-flickering
    **blue-white**, and the Nova drop flashes it blue-hot for a few seconds.
    Tuned so the new threat stays fair (irregulars from night 3, they burn faster
    in the fire): sensible ~4/5, careless a coin-flip, reckless 0/5.
20. **Reach, readability & density (from playtests).** Trees now spawn biased
    toward the fire so wood stays reachable at any night; a new **Telekinesis**
    drop flies your carried wood straight to the fire (no trip back). The fire's
    light now reaches the **top of the frame** (lower falloff + longer range) so
    the whole play area reads, not just a small pool. Higher/endless nights spawn
    **denser waves** (rate + shade caps raised). The title screen was cut down to
    a three-line how-to. Re-tuned around the easier gathering (closer trees), with
    cold as the lever that punishes neglect: over 40-game bot cohorts, **sensible
    88%, careless 75%, reckless 33%** — a clear gradient.
21. **Super Nova, gated drops, music & lighting (from playtests).** A rare
    **Super Nova** drop makes the survivor erupt in flame — every tree is felled
    into the fire and every shade dies at once (unlocks at night 5). Drops now
    **unlock by depth**: early nights give the basics, and the strongest powers
    only appear deeper in a run — a progression hook. Added a looping **8-bit
    chiptune** (pure synth, no audio files, stays offline). The fire's light now
    truly reaches the **top of the frame** (lower decay, longer range, higher
    ambient floor), and the player can roam nearly to the top and bottom edges.
    Balance stays a descending gradient (sensible ~80%, careless ~70%,
    reckless ~43% over 30-game cohorts) — forgiving up front, with endless as the
    real test.
22. **Human Torch.** A player-centered counterpart to Super Nova (unlocks night
    3): the survivor ignites, instantly killing every shade and felling every
    tree within a near radius — the burned trees feed the fire — **at the cost of
    the whole pack you're carrying** (spent as ignition). A tactical panic button
    with a real price, distinct from the free, screen-wide Super Nova.
23. **Damage clarity, risk & death feedback (from playtests).** Bumping any enemy
    now throws a **red damage flash** + shake + thud and drains warmth, so taking
    a hit is unmistakable; **death** lands with a hard red flash and shake as the
    lose screen fades in. Trees are **spread across the whole frame** again (not
    clustered), and **drops now spawn far from the fire** — grabbing a power means
    braving the dark. Re-tuned for the harder pace (eased fuel/cold, more fuel per
    log) and gave the balance bot a drop-chasing detour so the signal reflects the
    real risk/reward: **sensible ~77%, careless ~57%, reckless ~31%**.

## Balancing with a bot

Rather than guess difficulty, I exposed a headless `step()` and drove two policies
through **whole games at logic speed**:

- First tuning was brutal — a *near-optimal* bot died on **Night 1 every time**
  (negative fuel economy; ~28 shades per night).
- Retuned decay, cold, feed cost/gain, gather speed, spawn rate, and burn power.
- Result: **sensible play wins ~4/5** (the final night is a genuine threat) while
  **careless play loses 0/5**, dying around Nights 3–4 as escalation bites — a real
  skill gradient, winnable but tense.

## Verification harness (`scripts/`)

All browser checks launch headless Chromium with SwiftShader so WebGL renders.

- `verify-game3d.js` — the authoritative 3D check: confirms WebGL renders, drives
  real play, asserts feed raises fuel and upgrades apply; screenshots key states.
- `verify-ends.js` — asserts lose, win, and reset-to-play screens all render.
- `balance.js` — sensible-vs-careless bot cohorts (logic-only, no rendering),
  reports win rates + margins. Re-run on the 3D build: **sensible 5/5, careless 0/5**.
- `offline-check.js` — records every network request; passes only if nothing is
  external. On the 3D build: **2 requests, both local** (`index.html` +
  `vendor/three.min.js`), 0 external, 0 errors.
- `verify.js` — the original 2D driver (kept alongside the 2D fallback source).

## Packaging

`scripts/package.js` rebuilds, stages `index.html` at the **top level** plus the
`vendor/` folder (`three.min.js` + README), and zips it. Final `ember.zip` ≈
**161 KB** (limit 35 MB), unminified and readable. Three.js is the only vendored
library; it is referenced by relative path, never a CDN.

## What I deliberately did not build

Per "where not to spend your time": no multiplayer, no physics, no day/night
*lighting* simulation (phases are a gameplay cadence, not a rendering system), no
detailed creature animation (the survivor is an abstract low-poly figure). Depth
went into the one loop instead. The 3D pass changed only how the game is *drawn* —
it did not add systems or complexity to the core loop.

## Known trade-offs / next steps

- Balance is bot-validated; a human playtest of the 3D build is the next step
  (camera feel, movement speed, night readability).
- The 2D build is preserved (`src/game.js`, `src/style.css`) as a fallback in case
  the 3D version plays worse than it looks.
- Could add a couple of distinct shade types (e.g. a fast darter, an armored
  brute) for mid-session variety without widening the core.
- A local best-score (localStorage) would add a "one more run" hook.
