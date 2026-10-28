// The house rules every Polly game follows. They come straight from how Ember
// (games/ember) was built, and they are what makes a game playable in the
// browser preview AND downloadable as a zip that runs anywhere.
//
// Shown on the site (/practices) and returned by GET /api/v1/guide, which is
// what Frankie reads before it writes or edits a game. Keep it short,
// concrete and true.
export const GAME_PRACTICES = `# How Polly games are built

These are the practices Ember was built with. Every Polly game follows them.

## 1. One readable file
- The whole game is a single \`index.html\`: inline \`<style>\` plus one inline \`<script>\`.
- Code stays unminified and readable, with a header comment that says what the game is and how to play it.
- Plain browser JavaScript (\`"use strict"\`, \`var\`, functions). No build step, no modules, no frameworks.

## 2. Runtime lives in vendor/
- Load the Polly runtime with \`<script src="vendor/game-kit.js"></script>\`.
- For 3D, load \`<script src="vendor/three.min.js"></script>\` first (Three.js r128). Nothing else is available.
- Always reference vendor files by **relative path**. The downloaded zip has \`index.html\` at the top level and a \`vendor/\` folder next to it.

## 3. Zero network, zero asset files
- No CDNs, no web fonts, no fetch, no images, no audio files.
- Draw everything procedurally (canvas shapes, low-poly Three.js geometry, emoji are fine).
- Every sound is synthesized: \`Kit.audio.sfx.*\` or \`Kit.audio.tone()\` / \`Kit.audio.noise()\`.
- The only exception is online multiplayer, which goes through \`Kit.net\` (the Polly relay).

## 4. Tuning in one place
- Put every number that changes how the game feels in a \`CFG\` object at the top (speeds, timers, costs, sizes).
- Game logic runs in fixed logical units (landscape 1280 x 720 by default via \`Kit.canvas()\`), never in screen pixels.

## 5. A clear loop and clear phases
- Use \`Kit.loop(update, render)\`: \`update(dt)\` changes state, \`render()\` only draws.
- Track a phase: title, play, win / lose. Every game can be won or lost and restarted without reloading.
- Show the goal on the title overlay. First-time players get a one-line tutorial (remember it with \`Kit.store\`).

## 6. Desktop first, phone friendly
- Landscape, made for keyboard and mouse: WASD / arrows to move (\`Kit.input.axis()\`), Space to act, the mouse to aim and click (\`Kit.input.mouse()\`).
- Show the controls on the title overlay. Touch still works: "drag anywhere to move" comes free with \`Kit.input.axis()\`, and taps through \`Kit.input.tap()\`.
- Go portrait (\`Kit.canvas({ width: 540, height: 960 })\`) only when the person asks for a phone game.
- HUD is DOM over the canvas. Buttons get \`data-kit-ui\` so clicks on them are not read as game input.
- Include a sound toggle (\`Kit.audio.toggle()\`); the choice is saved.

## 7. Juice
- Feedback on everything that matters: particles (\`Kit.fx.burst\`), floating text (\`Kit.fx.text\`), screen shake (\`Kit.fx.shake\`), a sound.
- Difficulty escalates over time (waves, speed-ups, nights) so the game has an arc.

## 8. Animations and explainer videos
- A file can be a short video instead of a game: \`Kit.film(scenes)\`, each scene a \`caption\` and a \`draw(ctx, t, p)\`. A new video starts from \`blank-film\` and is built in steps, one editGame save each: the title, helpers at \`// @helpers\`, then one scene at a time at \`// @next-scene\` (keep the markers). Never rewrite a film in one save. \`ancient-cooking\` is a finished 3D example (Three.js drawn into the canvas).
- Draw everything on the canvas; Kit.film adds captions. Animate from \`t\`/\`p\` only. Scenes 4 to 9 s.
- Captions: one short spoken sentence each (also the voiceover script); *star* key words.
- Shorts first: \`CFG.format\` 'portrait' (9:16), 'landscape' or 'square'. Subject big, centred, close up.

## 9. Multiplayer when asked
- Local: \`Kit.input.setPlayers(2)\` gives player 1 WASD and player 2 the arrow keys (\`Kit.input.axis(1)\`).
- Online: \`Kit.net.connect()\`, then \`Kit.net.on(type, fn(data, fromId))\` and \`Kit.net.send(type, data)\`.
  The relay only forwards messages. The host (\`Kit.net.isHost()\`, first to join) owns shared state and broadcasts it; others send intents.
  Share \`Kit.net.inviteLink()\` so friends land in the same room.
`;

// The Kit API surface, terse, so an agent never invents functions that do not exist.
export const GAME_KIT_REFERENCE = `# vendor/game-kit.js API (window.Kit)
Kit.clamp(v,a,b) Kit.lerp(a,b,t) Kit.rand(a,b) Kit.randInt(a,b) Kit.pick(arr) Kit.dist(ax,ay,bx,by) Kit.dist2(...) Kit.hit(a,b)  // a,b: {x,y,r}
Kit.canvas({width=1280,height=720,id='c',webgl=false,onResize}) -> view {canvas, ctx, width, height, scale, toGame(clientX,clientY)}  // letterboxed, DPR aware; ctx already scaled to logical units
Kit.loop(update(dt), render(dt)) -> loop {time, paused, pause(), resume(), toggle(), stop()}  // dt clamped to 1/20s, pauses when tab hidden
Kit.input.axis(player=0) -> {x,y} (length<=1; P1 = WASD + arrows + touch drag; with setPlayers(2): P1 = WASD+touch, P2 = arrows)
Kit.input.action(player=0) -> bool this frame (P1 Space/E, P2 Enter/RightShift)
Kit.input.key(code) Kit.input.pressed(code)  // KeyboardEvent.code, pressed = this frame only
Kit.input.tap() -> {x,y} in game units or null  // a tap without dragging, this frame
Kit.input.mouse() -> {x,y,down,clicked}  // game units; down = left button held, clicked = this frame. First call makes the mouse aim instead of drag-to-move
Kit.input.setPlayers(1|2)
Kit.audio.sfx.blip() .pickup() .hit() .jump() .shoot() .boom() .win() .lose()
Kit.audio.tone({freq,to,dur,type:'square'|'sine'|'triangle'|'sawtooth',vol,delay}) Kit.audio.noise({dur,cutoff,vol,delay})
Kit.audio.toggle() -> muted  Kit.audio.muted  Kit.audio.setMuted(bool)
Kit.fx.burst(x,y,n,color,speed,life,size) Kit.fx.text(x,y,str,color) Kit.fx.shake(mag,dur) Kit.fx.clear()
Kit.fx.applyShake(ctx) (call inside ctx.save()/restore() before drawing the world) Kit.fx.draw(ctx) (draws particles + floating text, 2D only)
Kit.store.get(key, fallback) Kit.store.set(key, value)  // JSON, never throws
Kit.ui.el(tag, attrs, html) Kit.ui.overlay({title, body(html), button, onClick}) -> element (removes itself on button click)
Kit.film(scenes, {loop, fade, captions:'pop'|'bar', onEnd}) -> film {time, duration, playing, play(), pause(), seek(t), restart()}
  // scenes: [{dur, caption, enter(film), draw(ctx, t, p)}]; t = s into scene, p = 0..1. Kit.loop(film.update, film.render)
Kit.record({seconds, onStart(), onDone(blob, name)}) -> {stop()}  // canvas + Kit sounds to MP4/WebM
Kit.net.connect({room?, game?}) Kit.net.on('open'|'join'|'leave'|'close'|'error'|<type>, fn(data, fromId))
Kit.net.send(type, data, toId?) Kit.net.isHost() Kit.net.hasInvite() Kit.net.id Kit.net.peers Kit.net.room Kit.net.inviteLink() Kit.net.disconnect()
  // 'open' data: {id, peers, room}. Room comes from ?room= in the URL if present.
`;

// How an agent should work with the Polly API. Returned by GET /api/v1/guide
// next to the practices, and the basis of Frankie's system prompt for Polly.
export const AGENT_WORKFLOW = `# Building games through the Polly API

1. The open game's id is \`gameId\` in your page context. \`getGame\` returns its outline: sections and functions with line numbers.
2. Find code with \`searchGameCode\`, read it with \`readGameCode\` (numbered lines, a range at a time). Read before you change.
3. Change it with \`editGame\`: exact find/replace edits, \`baseVersion\` = the version you read. Copy \`find\` text exactly from readGameCode,
   without the "12| " line numbers, with enough lines to be unique. Several edits in one call apply together or not at all.
4. Only for a whole new game or a total rewrite, send the complete file as \`html\` to \`updateGame\`.
5. Every save is checked: a JavaScript syntax error is refused with its line (nothing is lost), and unknown Kit names come back as warnings.
   Fix warnings with another edit. Each save is a new version; \`restoreGameVersion\` undoes one.
6. No game open: \`listStarters\`, then \`createGame\` with the closest \`starterId\` and a title, then edit it.
7. Share: \`updateGame\` with \`visibility: "public"\`. Give the person \`playUrl\` or \`downloadUrl\`; never paste game code into the chat.
`;

// Every public name on window.Kit, used to warn when a saved game calls one
// that does not exist. packages/game-kit/test checks this against the runtime.
export const KIT_API: readonly string[] = [
  "Kit.audio", "Kit.audio.muted", "Kit.audio.noise", "Kit.audio.setMuted", "Kit.audio.sfx", "Kit.audio.stream",
  "Kit.audio.sfx.blip", "Kit.audio.sfx.boom", "Kit.audio.sfx.hit", "Kit.audio.sfx.jump", "Kit.audio.sfx.lose",
  "Kit.audio.sfx.pickup", "Kit.audio.sfx.shoot", "Kit.audio.sfx.win", "Kit.audio.toggle", "Kit.audio.tone",
  "Kit.canvas", "Kit.clamp", "Kit.dist", "Kit.dist2",
  "Kit.film", "Kit.fx", "Kit.fx.applyShake", "Kit.fx.burst", "Kit.fx.clear", "Kit.fx.draw", "Kit.fx.shake", "Kit.fx.text",
  "Kit.hit",
  "Kit.input", "Kit.input.action", "Kit.input.axis", "Kit.input.key", "Kit.input.mouse", "Kit.input.pressed", "Kit.input.setPlayers", "Kit.input.stick", "Kit.input.tap",
  "Kit.lerp", "Kit.loop",
  "Kit.net", "Kit.net.connect", "Kit.net.connected", "Kit.net.disconnect", "Kit.net.hasInvite", "Kit.net.id", "Kit.net.inviteLink",
  "Kit.net.isHost", "Kit.net.on", "Kit.net.peers", "Kit.net.room", "Kit.net.send",
  "Kit.pick", "Kit.rand", "Kit.randInt", "Kit.record",
  "Kit.store", "Kit.store.get", "Kit.store.set",
  "Kit.ui", "Kit.ui.el", "Kit.ui.overlay",
  "Kit.version", "Kit.view",
];

// The objects that only group functions: Kit.audio.play is a typo, while
// Kit.view.ctx is a property of a real value.
export const KIT_NAMESPACES: readonly string[] = ["Kit.audio", "Kit.audio.sfx", "Kit.fx", "Kit.input", "Kit.net", "Kit.store", "Kit.ui"];
