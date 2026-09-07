# Ember — Submission Writeup

## Inspiration

Survival games usually hand you a dozen meters — health, hunger, warmth, light, ammo, currency — and ask you to juggle them all. We wanted the opposite: **one resource that is everything at once.** In Ember your campfire is your light, your warmth, your currency, and your only weapon. That single idea creates constant, legible tension — *to keep the fire strong you have to leave it, and leaving it is exactly what puts you (and the fire) in danger.* We were drawn to short, tense, replayable mobile runs — the "one more go" feeling — and to seeing how much depth we could wring out of one focused loop instead of ten shallow ones.

## What it does

Ember is a single-player, portrait, 3D survival game. You leave the safety of the firelight to chop wood, haul it back, and feed the flames — a fed fire burns brighter, reaches farther, and keeps you warm. At night, shades crawl out of the dark to drain the fire; a strong fire burns them, and you can swing your torch or sling wood at the ones that slip through. You spend the fire's own fuel on upgrades, pick a permanent boon between nights, and chase glowing power-up drops that appear far out in the dark (grabbing one is a real gamble). Survive five escalating nights for a triumphant dawn — then choose to **keep the fire burning** into endless, ever-hotter nights while your score climbs. The whole thing runs entirely offline from a single readable `index.html`.

## How we built it

- **Vanilla JavaScript + Three.js (WebGL)** for the presentation, so the fire is a *real* flickering point light that casts dynamic shadows and shifts from orange to blue-white the deeper you go.
- **All art is procedural** (built in code) and **all audio is synthesized** with the Web Audio API — including an 8-bit chiptune. No image, model, or sound files, which is what keeps the build ~179 KB and fully offline.
- A **build step** assembles our `src/` files into one unminified, readable `index.html`; the only third-party library (Three.js) lives in `vendor/` and is referenced by relative path — never a CDN at runtime.
- The game **logic runs in a 2D top-down field** and is mapped onto the 3D ground plane, so every tuned distance, radius, and speed carried over exactly when we swapped the renderer.
- We **verified every change in a real headless browser** (Playwright + SwiftShader) — confirming WebGL renders, the loop plays start-to-finish, and there are zero external requests — and **balanced difficulty with bot cohorts** running whole games at logic speed rather than guessing.

## Challenges we ran into

- **Converting 2D → 3D without breaking the balance.** We kept the logic byte-identical and only changed how it's drawn, which meant tuned distances survived the switch — but it took careful mapping to get there.
- **The fully-offline constraint.** No CDN, no asset files. Everything had to be procedural geometry and synthesized sound, which shaped a lot of our decisions (and kept the build tiny).
- **Balancing is noisy.** Small economy tweaks rippled everywhere; a five-game bot sample swung wildly. We learned to aggregate 30–40 game cohorts and to give the bot realistic behavior (like detouring for reachable drops) so the signal reflected real play.
- **Game feel from playtests.** A black-screen-on-respawn bug (the loss darkening wasn't reset), a fire whose light didn't reach the top of the screen, unclear "am I even hitting this?" moments, and hits that didn't *feel* like hits — each needed a targeted fix (red damage flash, clearer death, reactive lighting, floating reward numbers).
- **Making the economy read intuitively.** Our first design hid wood in a bank with a separate FEED button; players didn't connect "more wood" with "stronger fire." Reworking it so wood feeds the fire *directly* — and upgrades cost the fire's own strength — made the core trade-off click.

## Accomplishments that we're proud of

- A **complete, tuned core loop** that's genuinely fun and playable start-to-finish, with a real skill gradient (good play wins ~80%, reckless play loses most of the time — bot-validated).
- A **reactive 3D fire** that is the whole game in one object: it scales with fuel, throws dynamic shadows, dims when dying, and burns blue-white when it runs hot.
- **Depth on a single resource** — momentum combos, two progression layers, three enemy types, eleven ability drops (from a slingshot that fires your wood to a screen-clearing Super Nova), and an endless mode — all hanging off one fire.
- Shipping it as a **179 KB, fully offline, readable single `index.html`** with a triumphant win and a bleak, visceral death.

## What we learned

- **Collapsing systems onto one resource** is a powerful design lever — it makes every decision immediate and every trade-off felt, and it's easier to make deep than ten separate systems.
- **Feedback is the game feel.** Floating numbers, a red damage flash, screen shake, a combo counter, a clear death — the loop didn't *feel* good until every action visibly paid off.
- **"Done" isn't done until you've played it.** Driving the real build in a browser (and with bots) caught bugs and balance problems that reading the code never would.
- **Constraints breed clarity.** The offline, single-file, tiny-build rules pushed us toward procedural art and synthesized audio — and the game is better and more portable for it.

## What's next for Ember

The core is a foundation for a deep survival roguelite:
- More **environments** and longer night arcs, with distinct **biomes** that change the strategy.
- A **varied enemy roster** with real behaviors and **boss nights**.
- **Deeper boon trees** with synergies and build identity.
- **Meta-progression** and unlocks between runs, plus **daily seeds and leaderboards** to fuel the score-chase.
- More abilities, hazards, and cosmetics.

The pillar stays fixed — **one fire that is light, warmth, wealth, and weapon** — with everything new deepening that single, legible tension.
