# Ember — Build Log

A single-player, portrait **survival & resource management** prototype, built by
prompting an AI coding agent and verifying every pass in a real headless browser.

- **Genre:** Survival & Resource Management
- **Pitch:** Your campfire is your light, your warmth, your currency, and your only
  weapon — one resource that does everything. Gather wood in the dark, feed the
  fire, and survive five escalating nights.
- **Tech:** Vanilla JS + HTML5 Canvas 2D, Web Audio for synthesized SFX. No
  third-party libraries, no external assets, no network requests.

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

- `verify.js` — drives real play, asserts feed raises fuel / spends wood and that
  all four upgrades apply; screenshots key states.
- `verify-ends.js` — asserts lose, win, and reset-to-play screens all render.
- `balance.js` — sensible-vs-careless bot cohorts, reports win rates + margins.
- `offline-check.js` — records every network request; passes only if nothing is
  external. Also re-run against the **unzipped `.zip`** (1 request total, the HTML
  document itself; 0 external; 0 page errors).

## Packaging

`scripts/package.js` rebuilds, stages `index.html` at the **top level** plus a
`vendor/` folder, and zips it. Final `ember.zip` ≈ **15 KB** (limit 35 MB),
unminified and readable. No libraries to vendor (documented in `vendor/README.txt`).

## What I deliberately did not build

Per "where not to spend your time": no multiplayer, no physics, no day/night
*lighting* simulation (phases are a gameplay cadence, not a rendering system), no
detailed animation. Depth went into the one loop instead.

## Known trade-offs / next steps

- Balance is first-pass but bot-validated; a human playtest is the next step.
- Could add a couple of distinct shade types (e.g. a fast darter, an armored
  brute) for more mid-session variety without widening the core.
- A local best-score (localStorage) would add a "one more run" hook.
