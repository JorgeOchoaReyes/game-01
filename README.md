# 🐶 Polly Studio

Polly Studio (named after Polly, a black, gold and white chihuahua) is where people make
**games** and **short videos** by describing them. They sign in, say what they want, and
build it in the studio with **Frankie**, the AI chat that plugs in as a React SDK
(`@frankieai/react`). They watch it change live, then publish it, remix other people's
work, download a game as a zip, or record a video as an MP4 for Shorts, TikTok and Reels.

- **Games** are desktop first (landscape, keyboard and mouse) and still work on a phone.
- **Videos** are built on `Kit.film`: 3D (Three.js) or 2D scenes with pop captions,
  recorded in the browser at 720p as 9:16, 16:9 or 1:1. With an ElevenLabs key (each user
  adds their own in Settings), **🎙 Voiceover** narrates each scene's caption.
- **Streaks** count the days in a row someone plays or builds (🔥 in the top bar).

Every game and video follows the practices behind **Ember**, the reference game in
`games/ember`: one readable `index.html`, a `vendor/` folder beside it, no network,
procedural art and synthesized sound.

Live: https://game-01-eta.vercel.app

## What's in the repo

A [Turborepo](https://turbo.build) with pnpm workspaces:

```
apps/
  web/        Next.js site + API: accounts, studio (Frankie embedded), game and video pages, game API
    firebase.json, firestore.rules, firestore.indexes.json   Firebase config, emulators, rules, indexes
  relay/      WebSocket relay for online multiplayer (Kit.net rooms)
packages/
  game-kit/   vendor/game-kit.js, the runtime every game and video loads
  practices/  the house rules, game-kit reference and agent workflow (what Frankie reads)
  templates/  starters: Slime Arena, Star Catcher, Campfire 3D, Coin Rush, How Did the Ancients Cook? (video)
games/
  ember/      Ember, the reference game (its own build, verify and package scripts)
docs/
  FRANKIE.md  connecting a Frankie workspace to Polly Studio
.github/workflows/
  ci.yml          build + all tests (Firebase emulators included) on every push
  firestore.yml   deploys Firestore rules and indexes when they change (keyless)
```

## How it fits together

### Making things

- **Create** (`/` and `/studio`). Pick 🎮 Game or 🎬 Video, describe it, and Polly Studio
  makes it from the closest starter and opens the studio with that idea already sent to
  Frankie. Videos also pick a format: Short 9:16 (default), Landscape 16:9 or Square 1:1.
  Signed-out visitors go through sign-up and land back in the studio with their idea.
- **Studio** (`/studio/<id>`). Frankie's chat sits beside a sandboxed preview that reloads
  whenever a new version is saved. Frankie edits without approval cards (`approvals="auto"`;
  deleting games isn't an allowed action). If a game throws, **Ask Frankie to fix it** sends
  the error to the chat. The toolbar has version history, Restart, public/private, download,
  a room code for multiplayer games, and for videos: the format switch, **🎙 Voiceover** and
  **⏺ Record video**.
- **Starters.** Slime Arena (desktop arena shooter: WASD, mouse aim, dash; the default for
  game ideas), Star Catcher (portrait, for phone games), Campfire 3D, Coin Rush
  (multiplayer), Ember (the reference game) and How Did the Ancients Cook? (a 3D short;
  the base for every new video).

### Videos

- A video is a game file built on `Kit.film(scenes)`: each scene has a duration, a caption
  and a `draw(ctx, t, p)`. Kit.film keeps to the real clock, crossfades between scenes, adds
  a vignette and film grain, and draws **pop captions** a few words at a time
  (`*starred*` words are highlighted in gold).
- The video starter renders Three.js off screen and draws it into the frame, so captions,
  recording and everything else work the same for 2D and 3D. `CFG.format` sets the shape;
  the camera keeps the subject big, centred and a little above the captions.
- **⏺ Record video** asks the preview to restart the film and record it with
  `Kit.record`: the canvas plus every Kit sound, as MP4 where the browser supports it (else
  WebM), at 720×1280 / 1280×720 whatever the window size. The studio downloads the file.
- **🎙 Voiceover** (`POST /api/games/<id>/narration`) reads each scene's caption with the
  owner's ElevenLabs key and voice. Clips are cached in `games/{id}/voice` by voice and
  text, so unchanged lines aren't paid for twice. The studio hands them to the film, which
  plays each clip as its scene starts and stretches the scene to fit; recordings include it.

### Accounts, data and API

- **Accounts.** Firebase Auth with email + password or Google; an account is required to
  make things (guest sign-in is off and refused by the server). The browser signs in with
  the Firebase SDK and trades its ID token at `POST /api/auth/session` for a 14-day session
  cookie, sending its timezone for streaks. API clients can send a Firebase ID token as
  `Authorization: Bearer`.
- **Settings** (`/settings`). Connect ElevenLabs with your own API key and pick a voice.
  The key is checked with ElevenLabs, stored in `users/{uid}/private/elevenlabs`, and
  never sent back to the browser (the page shows its last 4 characters).
- **Streaks.** A day counts when you save a game or video, or press Play while signed in,
  in your own timezone. Stored on `users/{uid}.streak`.
- **Database.** Firestore, written only by the server through the Admin SDK;
  `firestore.rules` denies browsers everything.
  - `users/{uid}`: name, email, timezone, streak; `users/{uid}/private/elevenlabs`
  - `games/{id}`: the current file, version, visibility, play count;
    `games/{id}/versions/{n}` (every save) and `games/{id}/voice/{hash}` (voiceover clips)
- **Game API** (`/api/v1`, documented at `/api/v1/openapi.json`), built for an AI agent and
  kept inside Frankie's limits (every response under 8,000 characters):
  - the game guide and starters
  - list, create (from a starter, with an optional video `format`), rename/publish, delete
  - read code as an outline, search it, read it in line ranges
  - change it with exact find/replace edits, checked for syntax errors on every save
  - version history and restore, plus download as a zip
- **Site routes** (not part of the agent API): `/api/auth/session`, `/api/auth/logout`,
  `/api/auth/me`, `/api/frankie/token`, `/api/me/voice` (GET/PUT/DELETE ElevenLabs
  settings), `/api/games/<id>/narration`, `/api/games/<id>/play` (play count + streak).
- **Frankie.** `POST /api/frankie/token` turns the signed-in user into a short-lived JWT for
  the SDK. Frankie's tool calls run in the user's browser against `/api/v1` of whichever
  site the studio is on, with that site's cookie, so it builds *as the user*, locally or in
  production. Setup: [docs/FRANKIE.md](docs/FRANKIE.md).

### Playing and sharing

- `/g/<id>` is a game or video's page: cover art, a big ▶ Play, **■ Stop playing**, full
  screen, play count, Remix and Download. Anyone can open public ones; only the owner can
  open private ones. `/play/<id>` does the same for the starters.
- `/games` (Discover) lists public work, New or Popular, with search.
- **Multiplayer.** `Kit.input.setPlayers(2)` gives two players on one keyboard.
  `Kit.net.connect()` joins an online room on the relay; the first player in is the host,
  and invite links carry `?room=CODE`.

### Game kit highlights

`Kit.canvas` (landscape 1280×720 by default, letterboxed, DPR aware), `Kit.loop`,
`Kit.input` (keys, `axis`, touch drag, `tap`, `mouse()` for aiming and clicking),
`Kit.audio` (synthesized tones, noise and sfx), `Kit.fx` (particles, text, shake),
`Kit.store`, `Kit.ui`, `Kit.net`, `Kit.film` and `Kit.record`. The full list Frankie works
from is in [packages/practices/src/index.ts](packages/practices/src/index.ts) and at
`/practices`; saves warn about any `Kit.*` name that doesn't exist.

## Run it

```bash
pnpm install
pnpm --filter @polly/web emulators   # Firebase Auth + Firestore emulators (needs Java 21), UI on :4000
pnpm dev                             # web on :3000, relay on :8787
```

Locally the web app talks to the Firebase emulators (project `demo-polly`) whenever no
Firebase variables are set, so you don't need a Firebase project. If port 3000 is busy,
run `pnpm build` once, then `pnpm --filter @polly/web dev --port 3100`.

For Frankie in local dev, copy `apps/web/.env.example` to `apps/web/.env.local`
(git-ignored) and fill in `NEXT_PUBLIC_FRANKIE_PUBLISHABLE_KEY` and `FRANKIE_JWT_SECRET`.
The Frankie workspace allows localhost, and the studio points Frankie's tool calls at the
site it runs on, so local edits change your local games. ElevenLabs needs no environment
variable: sign in and add your key in Settings.

Other tasks:

```bash
pnpm build                            # builds game-kit, templates, Ember, then the site
pnpm test                             # game-kit, relay and web tests (web starts the Firebase emulators itself)
pnpm --filter @polly/web deploy:firestore   # deploy Firestore rules and indexes by hand
pnpm --filter @polly/ember package    # Ember's original submission zip
```

If the emulators are already running (for `pnpm dev`), run the web tests against them
instead of letting the test script start its own:

```bash
cd apps/web
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-polly npx vitest run
```

### Environment (`apps/web`)

| Variable | What |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` | the Firebase web app config (empty locally means the emulators) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | an Admin SDK service account (required in production; the key's newlines may be written as `\n`) |
| `POLLY_PUBLIC_URL` | public origin for links and the OpenAPI `servers` URL (defaults to the request origin) |
| `FRANKIE_JWT_SECRET` | shared with the Frankie workspace; signs the user tokens Frankie verifies |
| `NEXT_PUBLIC_FRANKIE_PUBLISHABLE_KEY` | the Frankie workspace key; without it the studio shows a setup note instead of the chat |
| `NEXT_PUBLIC_FRANKIE_URL` | only when self-hosting Frankie |
| `NEXT_PUBLIC_RELAY_URL` | relay address for previews and downloads (default `ws://localhost:8787`) |

The relay reads `PORT` and `MAX_ROOM`.

### Deploying

- `apps/web` deploys to Vercel from the repo's default branch. In the Vercel project
  settings, set **Root Directory** to `apps/web`; `apps/web/vercel.json` builds the
  workspace packages through Turbo before `next build`. Set the variables above for
  Production and Preview, and redeploy after changing them.
- **Firebase setup** for a new project: enable Email/Password and Google sign-in (leave
  Anonymous off), create a Firestore database, add the site's domain to Auth's authorized
  domains, and create a service account key for the `FIREBASE_*` variables.
- Firestore rules and indexes live in `apps/web/firestore.rules` and
  `firestore.indexes.json`. `.github/workflows/firestore.yml` deploys them when they change,
  without a stored key: GitHub's OIDC token is exchanged for the `github-deploy` service
  account through Workload Identity Federation (pool `github`, limited to this repo).
- `apps/relay` needs a host that keeps WebSockets open (Fly.io, Render, Railway or a small
  VM). Set `NEXT_PUBLIC_RELAY_URL=wss://your-relay` on the web app.

### The live setup

| Piece | Where |
| --- | --- |
| Site | Vercel project `game-01` (team jorgeochoareyes-projects), https://game-01-eta.vercel.app |
| Firebase | project `polly-7140d`: Auth (email, Google) and Firestore in `nam5` |
| Frankie | workspace `ws-402c89bc689e`, OpenAPI from `/api/v1/openapi.json`, 11 of 12 actions allowed (not delete), localhost allowed |
| CI | GitHub Actions: `ci.yml` on every push, `firestore.yml` for rules and indexes |

## Adding a starter

Drop an `index.html`-style file in `packages/templates/templates/`, give it a title,
emoji, kind and blurb in `packages/templates/scripts/build.js`, and follow
[the practices](packages/practices/src/index.ts). It then shows up on Home, Discover, the
Create page and in the API's `listStarters`. A starter whose kind is `Animation` is listed
as a video. Games should be landscape unless they're meant for phones; videos should use
`Kit.film` and a `CFG.format`.

## Known gaps

- Online multiplayer needs the relay deployed somewhere; until then only same-keyboard
  multiplayer works on the live site.
- Recording runs in real time in the viewer's browser (a 45 s video takes 45 s). 720p is
  the default because 1080p can drop frames without a hardware video encoder.
- One test (`code.test.ts`, line numbering) fails on Windows checkouts because template
  files get CRLF line endings; it passes on Linux and in CI.
