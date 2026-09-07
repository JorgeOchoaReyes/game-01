# Ember Build Log

A single-player, portrait **survival & resource management** prototype. I built it by
prompting an AI coding agent and checking every pass in a real headless browser before
trusting it.

- **Genre:** Survival & Resource Management
- **Pitch:** Your campfire is your light, your warmth, your money, and your only weapon.
  One resource that does everything. Gather wood in the dark, feed the fire, and survive
  five nights that keep getting harder.
- **Tech:** Vanilla JS plus **Three.js** (WebGL) for the 3D, and Web Audio for
  synthesized sound. Three.js is the only third-party library and it lives in `vendor/`.
  Every model is built in code, there are no external assets, and nothing loads over the
  network. It started as an HTML5 Canvas 2D game and then moved to 3D (see passes 8 and 9).

---

## Design north star

The brief rewards a fun, playable **core loop** and **depth on one focused idea** over
breadth, so the whole game is built around a single tension:

> To keep the fire strong you have to leave it, and leaving it is exactly what puts the
> fire (and you) in danger.

Everything ties back to the one "fire" resource:
- **Fuel is your light radius** (how far you can safely gather).
- **Fuel is your burn power** (a hot fire kills shades before they reach it).
- **Fuel is your survival** (zero fuel is game over).
- **Wood is both fuel and upgrade currency** (feed it now, or invest for later).

That covers the genre cleanly. You **gather** wood in the dark, **convert** it by feeding
the fire or crafting upgrades, and **survive** an escalating threat as the nightly shade
waves grow.

## Constraints locked up front

I told the agent the non-negotiables in the very first prompt:
- **Single-player** and **portrait only**, never rotates.
- **Fully self-contained and offline.** Everything is bundled, the art is procedural, the
  audio is synthesized, and there are zero external requests.
- **One readable `index.html`** produced by a build step, with any libraries kept in
  `vendor/`.

## Build passes (small, verified steps)

Every pass ended with a real browser check. Screenshots for layout and legibility, and a
headless driver for behavior. I never trusted "done" without actually playing it.

1. **Scaffold and build pipeline.** A `build.js` step inlines the CSS and JS from `src/`
   into one readable, unminified `index.html`. Portrait 9:16 stage, a fixed 540x960 virtual
   canvas scaled to the device, and DOM overlays sharing the same box.
2. **Core loop.** A fire with a fuel-driven light radius, virtual-joystick and keyboard
   movement, wood you chop by walking into it, banking wood at the fire, and a feed action
   that turns wood into fuel with a flare. Top HUD meters.
3. **Threat and survival.** Shades spawn from the dark and drain the fire. A lit fire burns
   them, and it scales with fuel. A warmth meter drains in the dark and refills in the
   light, which is a second, spatial way to lose and makes gathering a real risk.
4. **Escalation and states.** Night and dawn phases, five nights, and per-night scaling of
   spawn rate, HP, and decay. You win at the end of Night 5 and lose if the fire dies or you
   freeze. Title, game-over, and win screens with a score and a play-again button.
5. **Upgrades.** Four tracks bought with wood: Stoke (reach), Ashheart (burn), Satchel
   (carry), and Coat (warmth). This is the "invest versus feed now" decision.
6. **Feedback and juice.** Particles, screen shake, a feed flash, flicker, a cold-blue
   vignette, phase banners, a "fire is dying" warning, and a synthesized sound for every
   action.
7. **Art and fire-scaling pass (still 2D).** Made the flame scale hard with fuel, from a
   white-hot tower with an ember shower when fed down to a dim nub over glowing coals as it
   dies. Also redrew the survivor (a hooded torch-bearer with a walk cycle), the trees, and
   the shades.
8. **3D conversion (Three.js).** Swapped the presentation layer to a WebGL scene. The fire
   became a real flickering point light casting moving shadows from low-poly pines and a
   torch-bearing survivor. The important part is that the game logic stayed identical. It
   still runs in the 2D top-down field and maps onto the ground plane, so every tuned
   distance, radius, and speed carried straight over. All the HUD moved to DOM since the
   canvas is now WebGL. Three.js sits in `vendor/` and loads from a local path.
9. **3D readability fix.** The shades first read as dark rocks, so I made them self-glowing
   purple wraiths with a soft halo and bright eyes. Now threats read at a glance even
   outside the firelight.
10. **Feel and clarity pass (from playtests).** Smooth eased turning, a walk cycle, and an
    overhead chop swing. Harvestable pines wear a ground ring and a progress bar and shrink
    as they are felled. The fire's light now scales hard with fuel, so a dying fire throws a
    small, dark pool. Enemies glow orange and show HP bars as the fire burns them, and a
    "pack full" nudge explains the gather dead-zone.
11. **Depth pass (progression and difficulty).** Ability drops arrived. Shades drop (and each
    dawn grants) glowing pickups: Inferno (fire burns twice as hard and wider), Swift (move
    faster), Ward (immune to cold), Harvest (chop twice as fast for bonus logs), and Nova (an
    instant screen-clearing blast), shown as timed HUD chips. A tanky Brute shade from night
    3 on, steeper per-night escalation, critical chops for bonus wood, and solid tree
    collision so you cannot walk through trunks.
12. **Readability pass (from playtests).** Carry is shown as a PACK pip meter plus a floating
    meter above the avatar, with a "pack full" nudge. A fire strength ring grows and
    brightens with fuel, and a bank drop-zone ring shows where to deposit. I also fixed a
    tree-respawn dry-out with a deterministic top-up that always keeps a full set of reachable
    trees and refills fast.
13. **Retention and game-feel pass.** A between-nights level-up where you pick one of three
    permanent boons. A persistent best score (localStorage) with a "new best" chase. A
    triumphant win (sunrise bloom, roaring fire, confetti, count-up) and a bleak loss (the
    world darkens and the fire gutters out). Felled trees topple with a reward burst, and a
    full pack auto-dumps from a generous range with wood arcing into the fire.
14. **Active defense.** The torch swing that chops wood now also bashes shades back (burn plus
    knockback) when no tree is in reach. Nights become an active gather-versus-defend choice
    instead of passive fire-tending.
15. **Fixes and economy rework (from playtests).** Fixed a black-screen-on-replay bug where
    the loss darkening was never reset for a fresh game, which also hid the trees. Then I
    reworked the economy so it reads intuitively. Wood now feeds the fire directly when you
    dump it (no more hidden bank and separate feed button), and upgrades cost the fire's own
    fuel, so every purchase is a real sacrifice.
16. **Rare tools and free roam (from playtests).** Two new drops: a chainsaw (rare and
    temporary) that fells a whole tree in one strike, and a toolbelt that permanently raises
    carry capacity. Movement changed from being stuck near the fire to free roam of the whole
    visible frame, with the bounds worked out by ray-casting the camera to the ground, so
    every tree is reachable and only the page edge stops you.
17. **Constant-reward and engagement pass.** Every action now pays out on screen. Floating
    text (a plus number, "CRIT", the fuel gained, a buff name, "Lv up") rises from each chop,
    kill, feed, upgrade, and pickup. A momentum combo ties it together. Chops, crits, and
    kills all feed one streak that multiplies a style-bonus score, drives a heating combo
    readout, and fires a flourish every tenth hit. A hot streak also nudges drop luck, so
    aggressive play earns more powers. Best combo and the bonus feed the persistent score
    chase on the end screen.
18. **Endless mode.** Surviving Night 5 is still a real, celebrated win, but the win screen
    now offers "keep the fire burning." The nights stop ending, the escalation keeps climbing
    (with caps so the late waves stay renderable), and the run only ends in death while the
    score climbs the whole way. Upgrades, boons, and the best score all carry through. Checked
    headless: a competent bot wins Night 5, continues, and is eventually overwhelmed well into
    the teens. The five-night arc is unchanged because the caps only bite much later.
19. **Slingshot, irregulars, and a hotter fire (from playtests).** A Slingshot drop
    auto-flings your carried wood at the nearest shade, so wood is now ammo as well as fuel.
    A new teal irregular enemy hunts the player instead of the fire, shrugs off the torch (only
    the slingshot or the fire's burn can kill it), and knocks a log out of your pack on each
    hit, which drops as reclaimable ground wood. Shades draining the fire now show a clear
    minus popup so the threat reads. The fire also runs hotter the deeper you go, shifting to
    an intense blue-white, and the Nova drop flashes it blue-hot for a few seconds.
20. **Reach, readability, and density (from playtests).** A new Telekinesis drop flies your
    carried wood straight to the fire with no trip back. The fire's light now reaches the top
    of the frame (lower falloff and longer range) so the whole play area reads instead of a
    small pool. Deeper and endless nights spawn denser waves. The title screen was cut down to
    a short, three-line how-to.
21. **Super Nova, gated drops, music, and lighting (from playtests).** A rare Super Nova drop
    makes the survivor erupt in flame, felling every tree into the fire and killing every shade
    at once (it unlocks at night 5). Drops now unlock by depth, so early nights give the basics
    and the strongest powers only show up deeper in a run, which adds a progression hook. Added
    a looping 8-bit chiptune, made entirely with synthesis so it stays offline.
22. **Human Torch.** A player-centered counterpart to Super Nova (unlocks night 3). The
    survivor ignites and instantly kills every shade and fells every tree within a near radius,
    and the burned trees feed the fire. The cost is your whole pack, spent as ignition. It is a
    tactical panic button with a real price, distinct from the free, screen-wide Super Nova.
23. **Damage clarity, risk, and death feedback (from playtests).** Bumping any enemy now
    throws a red damage flash plus shake and a thud and drains warmth, so a hit is
    unmistakable. Death lands with a hard red flash and shake as the lose screen fades in.
    Trees spread across the whole frame again instead of clustering, and drops now spawn far
    from the fire, so grabbing a power means braving the dark.
24. **Layout: fire low, forest above (from playtests).** The camera now frames the fire near
    the bottom of the screen and opens a wide field above it. Trees spawn mostly above the
    fire, skewed close, so wood is quick to reach while the forest fills the screen, and the
    survivor starts in that field. Gathering reads as a clear "climb up to chop, drop back to
    feed" rhythm. I also thickened the forest so the field keeps around eleven trees (it was
    six) and refills faster, so the larger area looks like a real forest.
25. **Follow camera and a taller field (from playtests).** The play area is now a
    fixed, bounded field that is taller than one screen, with the fire near the
    bottom and the forest stretching up. The camera follows the player north and
    south through it, so you can walk up into the back trees and stay on screen
    while the fire scrolls behind you. Trees spread evenly across the field instead
    of clustering by the fire, and the field keeps more of them as the nights go on
    (about twelve on Night 1, rising with each night). Shades now spawn on a ring
    around the fire so their distance stays consistent no matter how tall the field
    is. I also fixed a confusing case where the background treeline sat inside the
    reachable area and looked choppable, by pushing it well past the field edge as a
    pure backdrop. Balance holds a clean gradient (sensible ~89%, careless ~66%,
    reckless ~20% over 35-game cohorts).
26. **Harder fire, tighter combos (from playtests).** The fire was too easy to keep
    alive, so the fuel drain is now meaningfully steeper (a higher base, a bigger
    per-night ramp, and a harsher night penalty), which makes keeping it lit a real
    struggle. The combo window also dropped from 2.6s to 1.5s, so you have to keep
    acting to hold a streak. Re-tuned to a harder but fair gradient: sensible ~63%,
    careless ~34%, reckless ~3% over 35-game cohorts.
27. **Celebrate every night survived (from playtests).** Surviving a night is now a
    real reward moment, not a quiet menu. When dawn breaks the fire roars up with a
    spark fountain and a bright flash, a triumphant fanfare plays, and the between
    nights screen greets you with a big animated "NIGHT X SURVIVED!" that pops in, a
    pulsing "dawn breaks" badge, and a confetti burst, before you pick your boon. It
    fires on every cleared night (and every night in endless), so progress always
    feels earned and celebrated.
28. **First-load tutorial (from playtests).** The very first time someone plays, a
    tiny guided moment teaches the loop: a bouncing pointer and a one-line prompt
    send them to the nearest tree ("walk into a tree to chop wood"), then to the
    fire ("carry the wood back to the fire"). The instant they deliver that first
    wood it finishes with a "nice, that's the loop" beat and never shows again
    (remembered in localStorage). It only guides the first tree and the first
    drop-off; after that the player is on their own.
29. **Bigger, escalating waves (from playtests).** Night 2 felt empty because the
    spawn trickle was slow and a fed fire vaporized it before anything built up.
    The spawn rate now starts higher and ramps hard each night, shades are tankier
    so more survive the burn to press the fire (which also keeps more of them on
    screen), and player-hunting irregulars now arrive from Night 2. Peak concurrent
    shades roughly doubled per night (about 8, 11, 13, 18 across nights 1, 2, 3, 5
    even against a full fire). Re-tuned to stay winnable: sensible ~66%, careless
    ~49%, reckless ~3% over 35-game cohorts.
30. **Finishing touches (from playtests).** Four polish passes at once. A sound
    control in the top-right cycles all on, music off, or fully muted (remembered
    in localStorage). A low-fire danger cue makes near-death visceral: the screen
    edges pulse red to a heartbeat that quickens as the fuel runs out. A pause
    button opens a modal that freezes the run without resetting it and shows the
    controls and legend, with resume and restart. And the title screen got a
    flickering flame over a glowing wordmark, a gold best-score badge, and the
    same control buttons.
31. **Final tune and compliance pass.** Eased the shade toughness a notch so the
    bigger waves stay winnable (good play about two thirds of runs, reckless play
    almost never), then ran the whole verification battery one more time: WebGL
    renders, the loop plays start to finish, all the power-ups and enemies behave,
    the tutorial and endless flow work, and there are zero external requests and
    zero runtime errors. Refreshed the docs so every figure matches the shipped
    build.

## Balancing with a bot

Instead of guessing at difficulty, I exposed a headless `step()` and drove bot policies
through whole games at logic speed.

- The first tuning was brutal. A near-optimal bot died on Night 1 every time because the
  fuel economy was negative and there were far too many shades.
- I retuned decay, cold, feed cost and gain, gather speed, spawn rate, and burn power, and
  kept re-running.
- To read the noise, I aggregate 30 to 40 game batches rather than trusting a handful of
  games, and I taught the bot to detour for reachable drops so the numbers reflect how a
  real person plays.
- The result is a clean, descending gradient. Good play wins most of the time, the final
  nights are a genuine threat, and reckless play loses far more often than it wins.

## Verification harness (`scripts/`)

All browser checks launch headless Chromium with SwiftShader so WebGL renders.

- `verify-game3d.js` is the main check. It confirms WebGL renders, drives real play, and
  asserts that feeding raises fuel and upgrades apply, with screenshots of key states.
- `verify-features.js` asserts the power-ups and enemies behave (slingshot, telekinesis,
  irregulars, Super Nova, and so on).
- `verify-endless.js` confirms the Night-5 win, the continue into endless, and death.
- `balance.js` runs bot cohorts (logic only, no rendering) and reports win rates.
- `offline-check.js` records every network request and only passes if nothing is external.
  On the current build there are two requests, both local (`index.html` and
  `vendor/three.min.js`), zero external, and zero errors.

## Packaging

`scripts/package.js` rebuilds, stages `index.html` at the top level plus the `vendor/`
folder, and zips it. The final `ember.zip` is about 182 KB (the limit is 35 MB), unminified
and readable. Three.js is the only vendored library and it loads from a local path, never a
CDN.

## What I deliberately did not build

I skipped the things the brief warns against spending time on. No multiplayer, no physics
engine, no full day/night lighting simulation (the phases are a gameplay cadence, not a
render system), and no detailed creature animation. The depth went into the one loop
instead. The 3D pass only changed how the game is drawn, not what it does.

## Known trade-offs and next steps

- Balance is bot-validated, so a longer round of human playtesting is the natural next step.
- A couple more distinct enemy types would add mid-run variety without widening the core.
- The obvious growth areas are more environments, boss nights, deeper boon synergies, and
  meta-progression, all still hanging off the one fire.
