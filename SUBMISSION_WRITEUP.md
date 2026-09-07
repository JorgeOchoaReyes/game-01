# Ember Submission Writeup

## Inspiration

Most survival games make you juggle a dozen meters at once. Health, hunger, warmth, light, ammo, money. We wanted to go the other way and build a game around a single resource that does everything. In Ember your campfire is your light, your warmth, your money, and your only weapon. That one idea gave us all the tension we needed. To keep the fire strong you have to leave it, and leaving it is exactly what gets you into trouble. We also just wanted something you could pick up for a few minutes on your phone and immediately want to replay.

## What it does

Ember is a single player, portrait, 3D survival game. You step out of the firelight to chop wood, carry it back, and feed the flames. A well fed fire burns brighter, reaches farther, and keeps you warm. At night, shades crawl out of the dark and start draining the fire. A strong fire burns them, and you can swing your torch or sling wood at the ones that get close. You spend the fire's own fuel on upgrades, pick a permanent boon between nights, and chase glowing power ups that spawn way out in the dark, so grabbing one is always a bit of a gamble. Survive five nights and you get a proper sunrise, then you can keep the fire burning into endless nights while your score climbs. The whole thing runs offline from one readable index.html.

## How we built it

We used plain JavaScript with Three.js for the 3D. That was the big payoff: the fire is a real flickering light that casts moving shadows and even turns blue white when it gets hot late in a run. There are no image, model, or sound files anywhere. Every model is built in code and every sound is generated with the Web Audio API, including an 8 bit music loop. That is what keeps the whole game around 179 KB and fully offline.

A small build step stitches our source files into one readable, unminified index.html. The only outside library is Three.js, and it sits in a vendor folder that loads from a local path, never a CDN. The game logic actually runs in a simple 2D top down world and gets mapped onto the 3D ground, so all our tuned distances and speeds carried straight over when we switched to 3D.

We checked every change in a real headless browser to make sure the game rendered, played from start to finish, and made zero network requests. We also tuned the difficulty by letting bots play full games over and over instead of guessing.

## Challenges we ran into

Going from 2D to 3D without wrecking the balance was the first big one. We kept the logic exactly the same and only changed how it draws, so the numbers we had tuned still held up.

The offline rule shaped a lot of decisions. No CDN and no asset files meant everything had to be procedural geometry and synthesized sound. It was more work up front but the game is tiny and portable because of it.

Balancing turned out to be really noisy. A handful of bot games would swing all over the place, so we started running 30 to 40 game batches and taught the bot to actually go grab nearby power ups so the numbers reflected how a real person plays.

A lot of the polish came straight from playtests. We hit a bug where the screen stayed black after respawning, a fire whose light did not reach the top of the screen, hits that were hard to read, and deaths that did not feel like anything. Each one got its own fix, like a red flash when you get hurt, a clearer death, brighter reactive lighting, and floating numbers on every action.

The economy also confused people at first. Early on wood went into a hidden bank with a separate feed button, and nobody connected "more wood" with "stronger fire." Once we made wood feed the fire directly, and made upgrades cost the fire's own strength, the whole trade off finally clicked.

## Accomplishments that we're proud of

We got a full, tuned loop that is actually fun and plays start to finish, with a real skill curve. Good play wins most of the time and reckless play usually dies, and we could prove it with the bots.

The fire is the part we love most. It is basically the whole game in one object. It grows with fuel, casts real shadows, dims when it is dying, and goes blue white when it runs hot.

We packed a surprising amount of depth onto that one resource. There are combos, two layers of progression, three enemy types, eleven different power ups (everything from a slingshot that fires your own wood to a screen clearing Super Nova), and an endless mode, and it all hangs off the same fire.

And we shipped it as a 179 KB, fully offline, readable single file, with a win that feels great and a death that feels bad.

## What we learned

Building around one resource is a genuinely strong design move. It makes every choice immediate, and it is easier to make deep than a pile of separate systems.

Feedback is the game feel. The loop did not actually feel good until every single action gave you something to see, whether that was a number, a flash, some shake, or the combo counter ticking up.

Nothing is really done until you play it. Driving the real build in a browser, and letting bots hammer on it, caught problems we never would have spotted just reading the code.

And the constraints helped more than they hurt. The offline, single file, tiny build rules pushed us toward procedural art and generated audio, and the game is better for it.

## What's next for Ember

We think the core is a great base for a bigger survival roguelite. We would love to add more environments and biomes that change how you play, a wider cast of enemies with real behaviors and boss nights, deeper boon trees with synergies and build identity, meta progression and unlocks between runs, and daily seeds with leaderboards to feed the score chase. Plus more abilities, hazards, and cosmetics.

Whatever we add, the pillar stays the same. One fire that is your light, warmth, money, and weapon, with everything new making that one idea richer.
