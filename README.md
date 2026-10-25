# 🐶 Polly Studio

Polly Studio (named after Polly, a black-and-gold chihuahua) is where people make
**games** and **short videos** by describing them. They sign in, say what they want, and
build it in the studio with **Frankie**, the AI chat that plugs in as a React SDK
(`@frankieai/react`). They watch it change live, then publish it, remix others', download
a game as a zip, or record a video as an MP4 for Shorts, TikTok and Reels.

- **Games** are desktop first (landscape, keyboard and mouse), phone friendly.
- **Videos** are built on `Kit.film`: 3D (Three.js) or 2D scenes with pop captions,
  recorded in the browser at 720p in 9:16, 16:9 or 1:1. With an ElevenLabs key (each user
  adds their own in Settings), **🎙 Voiceover** narrates each scene's caption.
- **Streaks** count the days in a row someone plays or builds.

Every game and video follows the practices behind **Ember**, the reference game in
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
- **Game API** (`/api/v1`, documented at `/api/v1/openapi.json`), built for an AI agent:
  - the game guide and starters
  - list, create, rename/publish, delete
  - read code as an outline, search it, read it in line ranges
  - change it with exact find/replace edits, checked for syntax errors on every save
  - version history and restore, plus download as a zip
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
- **Accounts.** Firebase Auth: email + password, Google, or jump in as a guest. The browser
  signs in with the Firebase SDK and trades its ID token at `POST /api/auth/session` for a
  session cookie. A guest who later signs up keeps their games. API clients can also send a
  Firebase ID token as `Authorization: Bearer`.
- **Database.** Firestore (`users`, `games`, `games/{id}/versions`), written only by the
  server through the Admin SDK; `firestore.rules` denies browsers. Locally everything runs on
  the Firebase Emulators, so dev needs no Firebase project.

## Run it

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # optional locally; see the table below
pnpm --filter @polly/web emulators            # Firebase Auth + Firestore emulators (needs Java), UI on :4000
pnpm dev                                       # web on :3000, relay on :8787
```

Other tasks:

```bash
pnpm build        # builds game-kit, templates, Ember, then the site
pnpm test         # game-kit, relay and web tests (web starts the Firebase emulators itself)
```

For Frankie in local dev, put `NEXT_PUBLIC_FRANKIE_PUBLISHABLE_KEY` and `FRANKIE_JWT_SECRET`
in `apps/web/.env.local` (git-ignored). The workspace allows localhost, and the studio
points Frankie's tool calls at the site it runs on, so local edits hit your local API.

```bash
pnpm --filter @polly/ember package   # Ember's original submission zip
```

### Environment (`apps/web`)

| Variable | What |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` | the Firebase web app config (empty locally means the emulators) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | an Admin SDK service account (required in production) |
| `POLLY_PUBLIC_URL` | public origin for links and the OpenAPI `servers` URL (defaults to the request origin) |
| `FRANKIE_JWT_SECRET` | shared with the Frankie workspace; signs the user tokens Frankie verifies |
| `NEXT_PUBLIC_FRANKIE_PUBLISHABLE_KEY` | the Frankie workspace key; without it the studio shows a setup note instead of the chat |
| `NEXT_PUBLIC_FRANKIE_URL` | only when self-hosting Frankie |
| `NEXT_PUBLIC_RELAY_URL` | relay address for previews and downloads (default `ws://localhost:8787`) |

The relay reads `PORT` and `MAX_ROOM`.

### Deploying

- `apps/web` deploys to Vercel. In the Vercel project settings, set **Root Directory** to
  `apps/web`. `apps/web/vercel.json` then builds the workspace packages through Turbo
  before `next build`. Set the Firebase variables above, and add the site's domain to
  Firebase Auth's authorized domains.
- Firestore rules and indexes live in `apps/web/firestore.rules` and
  `firestore.indexes.json`. `.github/workflows/firestore.yml` deploys them on push (keyless,
  via Workload Identity Federation), or run `pnpm --filter @polly/web deploy:firestore`.
- `apps/relay` needs a host that keeps WebSockets open (Fly.io, Render, Railway or a small
  VM). Set `NEXT_PUBLIC_RELAY_URL=wss://your-relay` on the web app.

## Adding a starter

Drop an `index.html`-style file in `packages/templates/templates/`, give it a title and
blurb in `packages/templates/scripts/build.js`, and follow
[the practices](packages/practices/src/index.ts). It then shows up in the gallery, in the
studio, and in the API's `listStarters`.
