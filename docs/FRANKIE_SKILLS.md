# Frankie skills for Polly

Skills are playbooks the Product agent follows for common tasks. They are set in
Frankie's dashboard (polly workspace → Product agent → Skills → New skill), not in
code, so this file is the source: when the API or the starters change, update the
skill here first, then paste it into the dashboard.

Every skill relies on what Frankie already has: `getGameGuide` (rules and the
game-kit API, served live from Polly) and the open game's `gameId` in page context.
Two limits shape all of them: a turn runs for at most **2 minutes**, and every tool
result is cut at **8,000 characters**. So: read narrowly, save early, save small.

---

## 1. Build a new video

**When:** the person asks for a video, a short, an animation or an explainer, or the
open game is a film with a `// @next-scene` marker.

1. Call `getGameGuide` if you haven't in this conversation.
2. Read the open file once (`readGameCode` from line 1). A new video is the blank
   film: about 130 lines, with a `// @helpers` marker and a `// @next-scene` marker.
3. Plan 6 to 8 scenes in your head: one short spoken caption each, *starred* key
   words, 4 to 9 seconds each.
4. Save step 1 with `editGame`: the `<title>`, the overlay `title:`, and
   `plannedScenes: N`. Keep `format:` as it is.
5. If scenes share drawing code (a ship, a planet), save it in one `editGame` at
   `// @helpers`, putting the marker back after it.
6. Save each scene as its own `editGame`: find `  // @next-scene`, replace with the
   scene object, a comma, a newline and `  // @next-scene`. Use the version the last
   save returned as `baseVersion`.
7. Never send the whole film with `updateGame`. If a save is refused, fix that one
   step and carry on.
8. When the turn is running long, stop after a save. The studio asks you to keep
   going with the next scene.

## 2. Change a game

**When:** the person asks for a change to the open game ("make it harder", "add a
boss", "the player should be a cat").

1. `getGame` for the outline (sections, functions, line numbers). Don't read the
   whole file.
2. `searchGameCode` for the names involved (`CFG`, `function update`, the thing to
   change), then `readGameCode` only around those lines.
3. Make the change in one `editGame` call with the fewest, smallest edits. Each
   `find` is copied exactly from what you read, without line numbers, and long
   enough to match once.
4. If the result has `warnings` (an unknown `Kit.*` name), fix them with another
   edit right away.
5. Reply in one to three plain sentences: what changed, and one idea to try next.

## 3. Fix an error

**When:** the person says something is broken, or the message quotes a preview error
("The game preview shows this error: … (line N)").

1. `readGameCode` around the line in the error (20 lines either side).
2. If the error names a function or variable, `searchGameCode` for it to find where
   it is defined.
3. Fix the cause with `editGame`, not the symptom: a missing function gets written,
   an unknown `Kit.*` call is swapped for a real one from the guide.
4. Say what was wrong in one sentence.

## 4. Make a mobile game

**When:** the person picked Mobile, or asks for a phone, touch or portrait game, or
asks to turn a desktop game into a mobile one.

1. Portrait canvas: `Kit.canvas({ width: 540, height: 960 })`.
2. Touch only: `Kit.input.axis()` for drag-to-move, `Kit.input.tap()` for actions.
   No keyboard or mouse needed to play.
3. On-screen buttons are DOM over the canvas, at least 56px tall, with `data-kit-ui`
   so taps on them aren't read as game input.
4. Keep the HUD and important things out of the bottom 80px and the top 40px,
   where thumbs and the notch sit.
5. Converting a desktop game: change the canvas size and controls in small edits
   (canvas, then input, then HUD), saving after each.

## 5. Start something new

**When:** the person asks for a different game than the one open ("make me a racing
game instead").

1. `listStarters` and pick the closest one. Never write a game from nothing when a
   starter is close.
2. `createGame` with that `starterId` (and `format` for a video). The studio switches
   to the new game by itself.
3. Then change it as in skill 2, or build it as in skill 1 for a video.
