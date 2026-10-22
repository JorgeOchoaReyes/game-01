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
- Game logic runs in fixed logical units (portrait 540 x 960 by default via \`Kit.canvas()\`), never in screen pixels.

## 5. A clear loop and clear phases
- Use \`Kit.loop(update, render)\`: \`update(dt)\` changes state, \`render()\` only draws.
- Track a phase: title, play, win / lose. Every game can be won or lost and restarted without reloading.
- Show the goal on the title overlay. First-time players get a one-line tutorial (remember it with \`Kit.store\`).

## 6. Works on a phone
- Portrait first. Touch "drag anywhere to move" and WASD / arrows both work through \`Kit.input.axis()\`.
- HUD is DOM over the canvas. Buttons get \`data-kit-ui\` so taps on them are not read as movement.
- Include a sound toggle (\`Kit.audio.toggle()\`); the choice is saved.

## 7. Juice
- Feedback on everything that matters: particles (\`Kit.fx.burst\`), floating text (\`Kit.fx.text\`), screen shake (\`Kit.fx.shake\`), a sound.
- Difficulty escalates over time (waves, speed-ups, nights) so the game has an arc.

## 8. Multiplayer when asked
- Local: \`Kit.input.setPlayers(2)\` gives player 1 WASD and player 2 the arrow keys (\`Kit.input.axis(1)\`).
- Online: \`Kit.net.connect()\`, then \`Kit.net.on(type, fn(data, fromId))\` and \`Kit.net.send(type, data)\`.
  The relay only forwards messages. The host (\`Kit.net.isHost()\`, first to join) owns shared state and broadcasts it; others send intents.
  Share \`Kit.net.inviteLink()\` so friends land in the same room.
`;

// The Kit API surface, terse, so an agent never invents functions that do not exist.
export const GAME_KIT_REFERENCE = `# vendor/game-kit.js API (window.Kit)
Kit.clamp(v,a,b) Kit.lerp(a,b,t) Kit.rand(a,b) Kit.randInt(a,b) Kit.pick(arr) Kit.dist(ax,ay,bx,by) Kit.dist2(...) Kit.hit(a,b)  // a,b: {x,y,r}
Kit.canvas({width=540,height=960,id='c',webgl=false,onResize}) -> view {canvas, ctx, width, height, scale, toGame(clientX,clientY)}  // letterboxed, DPR aware; ctx already scaled to logical units
Kit.loop(update(dt), render(dt)) -> loop {time, paused, pause(), resume(), toggle(), stop()}  // dt clamped to 1/20s, pauses when tab hidden
Kit.input.axis(player=0) -> {x,y} (length<=1; P1 = WASD + arrows + touch drag; with setPlayers(2): P1 = WASD+touch, P2 = arrows)
Kit.input.action(player=0) -> bool this frame (P1 Space/E, P2 Enter/RightShift)
Kit.input.key(code) Kit.input.pressed(code)  // KeyboardEvent.code, pressed = this frame only
Kit.input.tap() -> {x,y} in game units or null  // a tap without dragging, this frame
Kit.input.setPlayers(1|2)
Kit.audio.sfx.blip() .pickup() .hit() .jump() .shoot() .boom() .win() .lose()
Kit.audio.tone({freq,to,dur,type:'square'|'sine'|'triangle'|'sawtooth',vol,delay}) Kit.audio.noise({dur,cutoff,vol,delay})
Kit.audio.toggle() -> muted  Kit.audio.muted  Kit.audio.setMuted(bool)
Kit.fx.burst(x,y,n,color,speed,life,size) Kit.fx.text(x,y,str,color) Kit.fx.shake(mag,dur) Kit.fx.clear()
Kit.fx.applyShake(ctx) (call inside ctx.save()/restore() before drawing the world) Kit.fx.draw(ctx) (draws particles + floating text, 2D only)
Kit.store.get(key, fallback) Kit.store.set(key, value)  // JSON, never throws
Kit.ui.el(tag, attrs, html) Kit.ui.overlay({title, body(html), button, onClick}) -> element (removes itself on button click)
Kit.net.connect({room?, game?}) Kit.net.on('open'|'join'|'leave'|'close'|'error'|<type>, fn(data, fromId))
Kit.net.send(type, data, toId?) Kit.net.isHost() Kit.net.hasInvite() Kit.net.id Kit.net.peers Kit.net.room Kit.net.inviteLink() Kit.net.disconnect()
  // 'open' data: {id, peers, room}. Room comes from ?room= in the URL if present.
`;

// How an agent should work with the Polly API. Returned by GET /api/v1/guide
// next to the practices, and the basis of Frankie's system prompt for Polly.
export const AGENT_WORKFLOW = `# Building games through the Polly API

1. The person is usually looking at one game in the Polly studio; its id is in your page context as \`gameId\`.
   Call \`getGame\` to read its current \`html\` before changing anything.
2. To change the game, write the COMPLETE new file and call \`updateGame\` with it. Never send a diff or a fragment:
   the studio preview and the download use exactly what you save. Each save is a new version (\`listGameVersions\`), so
   nothing is lost and \`restoreGameVersion\` undoes a bad change.
3. A brand new idea with no game open: \`listStarters\`, pick the closest, then \`createGame\` with its \`starterId\`
   and a title. Build from the starter's working code instead of from nothing.
4. Keep what works, change what was asked. Before saving, re-read the file for undefined variables, typos in Kit calls,
   and missing win / lose / restart paths. A smaller game that runs beats a bigger one that might not.
5. If the person reports an error from the preview, read the game, fix the cause, and save the whole file again.
6. To share: \`updateGame\` with \`visibility: "public"\` gives the game a public play page. The download link is \`downloadUrl\`.
`;
