# 🧟‍♂️ Frankie

Make games by chatting. You describe a game and **Frankie** (the AI chat) builds it. You play it next to the
chat, keep asking for changes, invite a friend to play online, and download it as a zip that runs anywhere.

Every Frankie game follows the practices behind **Ember**, the reference game in `games/ember`: one readable
`index.html`, a `vendor/` folder beside it, no network, procedural art and synthesized sound.

## What's in the repo

A [Turborepo](https://turbo.build) with pnpm workspaces:

```
apps/
  web/        Next.js site: landing, gallery, /play/<game>, /practices and the /create studio
  relay/      WebSocket relay for online multiplayer (Kit.net rooms)
packages/
  game-kit/   vendor/game-kit.js, the runtime every game loads: loop, input, synth audio, juice, storage, Kit.net
  frankie/    Frankie's system prompt, the game practices, and the Claude call that writes games
  templates/  starter games Frankie builds from (2D arcade, 3D survival, multiplayer)
games/
  ember/      Ember, the reference game (its own build, verify and package scripts)
```

## How it works

1. **Start from a starter.** A new game begins as a working template (or a remix of Ember), so there is
   always something playable on screen.
2. **Chat with Frankie.** `/api/frankie` sends your message plus the current `index.html` to Claude with
   Frankie's system prompt (`packages/frankie`). Frankie replies with a short note and the complete updated
   file. The reply streams in, and the preview reloads when the file is complete.
3. **Play in a sandbox.** Games run in an `iframe` with `sandbox="allow-scripts"`, so generated code can't
   reach the site's cookies or storage. A `<base href="/runtime/">` makes `vendor/...` paths resolve to the
   site's copy of the runtime. If the game throws, a bar shows the error with an **Ask Frankie to fix it** button.
4. **Download.** The zip has the same layout as Ember's: `index.html` at the top level, plus
   `vendor/game-kit.js` (and `vendor/three.min.js` for 3D games) and a README.
5. **Multiplayer.**
   - *Local:* `Kit.input.setPlayers(2)`. Player 1 uses WASD and player 2 uses the arrow keys.
   - *Online:* `Kit.net.connect()` joins a room on the relay. The first player to join is the host
     (`Kit.net.isHost()`). The host owns shared state, and everyone else sends their inputs. Invite links
     carry `?room=CODE`. In the studio, type the same room code on two screens to play together.

Projects are saved in your browser (localStorage).

## Run it

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # add your ANTHROPIC_API_KEY
pnpm dev                                       # web on :3000, relay on :8787
```

Other tasks:

```bash
pnpm build        # builds game-kit, templates, Ember, then the site
pnpm test         # game-kit, relay and frankie unit tests
pnpm --filter @frankie/ember package   # Ember's original submission zip
```

### Environment

| Variable | Where | What |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | `apps/web` (server only) | Frankie's Claude calls |
| `NEXT_PUBLIC_RELAY_URL` | `apps/web` | relay address for previews and downloads (default `ws://localhost:8787`) |
| `PORT`, `MAX_ROOM` | `apps/relay` | relay port and players per room |

### Deploying

- `apps/web` deploys to Vercel. In the Vercel project settings, set **Root Directory** to `apps/web`.
  `apps/web/vercel.json` then builds the workspace packages through Turbo before `next build`.
- `apps/relay` needs a host that keeps WebSockets open (Fly.io, Render, Railway or a small VM). Set
  `NEXT_PUBLIC_RELAY_URL=wss://your-relay` on the web app.

## Adding a starter

Drop an `index.html`-style file in `packages/templates/templates/`, give it a title and blurb in
`packages/templates/scripts/build.js`, and follow [the practices](packages/frankie/src/practices.ts). The
starter then shows up in the gallery, in the studio picker, and as something Frankie can build on.
