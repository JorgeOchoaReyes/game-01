# Ember — Design Intent

> Draft copy for the official design-intent template (.docx). ~430 words, under the
> 500-word limit. Paste into the template's sections; headings map to typical
> template fields.

**Genre:** Survival & Resource Management
**Platform:** Mobile, portrait, single-player, fully offline. Rendered in 3D
(Three.js), so the campfire is a real light that flickers and casts dynamic
shadows across a low-poly world.

## Concept

Your campfire is the only thing keeping the dark out — and it is *everything at
once*: your light, your warmth, your currency, and your only weapon. Ember takes
the survival genre's gather-craft-survive loop and collapses it onto a single
resource, so every decision is legible and every trade-off is felt.

## Core loop

1. **Gather** — leave the safe ring of firelight to chop wood in the dark. Out
   there you have no defence and your **warmth** drains.
2. **Bank** — carry wood back to the fire.
3. **Decide** — **feed** the fire (fuel raises your light radius *and* burn power)
   or spend the same wood on **permanent upgrades**. Feeding keeps you alive now;
   upgrading pays off later. You never have enough wood for both.
4. **Survive** — each night, shades crawl from the dark to drain the fire. A
   well-fed fire burns them before they arrive; a starving one gets eaten.

## Why it's a survival game

The genre floor is met directly: you **gather** a resource, **convert** it (into
fuel or into crafted upgrades), and manage it against an **escalating threat**. The
twist is the single-resource economy — light, heat, money, and defence are one
number, so the classic "gather vs. defend" tension is constant and immediate.

## Progression within one session

A full run is five escalating nights (~3–4 minutes). Each night raises shade
count, speed, toughness, and fuel decay. Four upgrade tracks — Stoke (radius),
Ashheart (burn), Satchel (carry), Coat (warmth cost) — let the player shape a
build across the run. Win by surviving to dawn on Night 5; lose if the fire dies or
you freeze. Bot-tested balance: sensible play usually wins with the final night a
genuine threat, while neglect loses around Night 3–4.

## Controls & readability

Drag anywhere for a floating virtual joystick (thumb-friendly, portrait);
keyboard supported for desktop. A fixed, gently-swaying overhead camera keeps the
fire centred. Distinct shapes and colours keep the state readable: a torch-bearing
survivor, an orange fire with a visible warm light pool, green pines to harvest,
and purple wraith-shades that self-glow with bright eyes so threats read even in
the dark. Two clear meters (Fire, Warmth) and big phase banners frame each round.

## Feel

Real-time feedback throughout: the flame — and the light it throws — scales with
fuel, collapsing to embers as it dies and roaring back when fed; feeding sends out
a flare that knocks shades back; a cold-blue tint creeps in as warmth falls; and a
pulsing warning fires when the flame is about to die. Every action has a synthesized
sound. Clear first, fun second, pretty third.
