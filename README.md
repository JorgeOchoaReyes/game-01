# 🦜 Polly

Polly is a tiny game engine and a home for browser games. People sign in and build games
in the studio with **Frankie**, the AI chat that plugs in as a React SDK
(`@frankieai/react`, from the Frankie repo). They play each game live while it changes,
and can share it publicly, play online with friends, or download it as a zip that runs
anywhere.

Every Polly game follows the practices behind **Ember**, the reference game in
`games/ember`: one readable `index.html`, a `vendor/` folder beside it, no network,
procedural art and synthesized sound.

## What's in the repo

A [Turborepo](https://turbo.build) with pnpm workspaces:

```
apps/
  web/        Next.js site + API: accounts, studio (with Frankie embedded), play pages, game API
  relay/      WebSocket relay for online multiplayer (Kit.net rooms)
packages/
  game-kit/   vendor/game-kit.js, the runtime every game loads: loop, input, synth audio, juice, storage, Kit.net
  practices/  how Polly games are built: house rules, game-kit reference, agent workflow
  templates/  starter games (2D arcade, 3D survival, multiplayer)
games/
  ember/      Ember, the reference game (its own build, verify and package scripts)
docs/
  FRANKIE.md  connecting a Frankie workspace to Polly
```

## How it fits together

- **Accounts.** Email and password (scrypt), with sessions in an httpOnly cookie. Login
  also returns a Bearer token, so any client can call the API.
- **Game API** (`/api/v1`, documented at `/api/v1/openapi.json`):
  - list, create (from a starter or from html), read, save, delete
  - version history and restore
  - download as a zip
  - the game guide
- **Frankie.** `POST /api/frankie/token` turns the signed-in user into a short-lived JWT for
  the SDK. Frankie forwards that JWT back on its API calls, so it builds games *as the
  user*. Setup: [docs/FRANKIE.md](docs/FRANKIE.md).
- **Studio** (`/studio/<id>`). Frankie's chat sits beside a sandboxed preview, which
  reloads whenever a new version is saved. If the game throws, **Ask Frankie to fix it**
  sends the error to the chat. The toolbar has version history, a public/private switch,
  a room code for multiplayer games, and download.
- **Playing.** `/g/<id>` is a game's play page: anyone can open public games, and only the
  owner can open private ones. Public games are listed on `/games`, and starters and Ember
  are at `/play/<id>`.
- **Multiplayer.** `Kit.input.setPlayers(2)` gives two players on one keyboard.
  `Kit.net.connect()` joins an online room on the relay. The first player in is the host,
  and invite links carry `?room=CODE`.
- **Database.** Postgres when `DATABASE_URL` is set. Otherwise an embedded PGlite database
  in `apps/web/.data/`, so local dev needs no setup.

## Run it

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # optional locally; see the table below
pnpm dev                                       # web on :3000, relay on :8787
```

Other tasks:

```bash
pnpm build        # builds game-kit, templates, Ember, then the site
pnpm test         # game-kit, relay and web (API, auth, games) tests
pnpm --filter @polly/ember package   # Ember's original submission zip
```

### Environment (`apps/web`)

| Variable | What |
| --- | --- |
| `POLLY_AUTH_SECRET` | signs session cookies and API tokens (required in production) |
| `DATABASE_URL` | Postgres (required in production; empty locally means PGlite) |
| `POLLY_PUBLIC_URL` | public origin for links and the OpenAPI `servers` URL (defaults to the request origin) |
| `FRANKIE_JWT_SECRET` | shared with the Frankie workspace; signs the user tokens Frankie verifies |
| `NEXT_PUBLIC_FRANKIE_PUBLISHABLE_KEY` | the Frankie workspace key; without it the studio shows a setup note instead of the chat |
| `NEXT_PUBLIC_FRANKIE_URL` | only when self-hosting Frankie |
| `NEXT_PUBLIC_RELAY_URL` | relay address for previews and downloads (default `ws://localhost:8787`) |

The relay reads `PORT` and `MAX_ROOM`.

### Deploying

- `apps/web` deploys to Vercel. In the Vercel project settings, set **Root Directory** to
  `apps/web`. `apps/web/vercel.json` then builds the workspace packages through Turbo
  before `next build`. Set `DATABASE_URL` (any Postgres: Neon, Supabase, RDS…).
- `apps/relay` needs a host that keeps WebSockets open (Fly.io, Render, Railway or a small
  VM). Set `NEXT_PUBLIC_RELAY_URL=wss://your-relay` on the web app.

## Adding a starter

Drop an `index.html`-style file in `packages/templates/templates/`, give it a title and
blurb in `packages/templates/scripts/build.js`, and follow
[the practices](packages/practices/src/index.ts). It then shows up in the gallery, in the
studio, and in the API's `listStarters`.
