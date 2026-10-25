# Connecting Frankie to Polly

Frankie is the AI chat in Polly's studio. It lives in its own repo and ships as the
`@frankieai/react` SDK. Polly's side of the deal is small:

1. **A token endpoint.** `POST /api/frankie/token` turns the signed-in Polly user into a
   5-minute JWT signed with `FRANKIE_JWT_SECRET` (`sub` = user id, plus `name` and `email`,
   `iss: polly`, `aud: frankie`). It answers `{ "token": null }` when nobody is signed in.
2. **A game API with an OpenAPI document.** `GET /api/v1/openapi.json` describes the
   operations Frankie may call. Frankie forwards the user's JWT back on every call, and the
   API accepts it, so Frankie can only touch that user's games.
3. **The embed.** `components/StudioWorkspace.tsx` renders `<FrankieProvider>` +
   `<FrankieInline>` next to the game preview. It sends the open game as page context
   (`gameId`, `gameTitle`, `gameVersion`) and uses one conversation per game
   (`polly-game-<id>`). The preview polls the game and reloads when Frankie saves.

```
Browser (Polly studio)          Polly (this repo)                 Frankie
────────────────────────────────────────────────────────────────────────────────
<FrankieInline/>
  │ POST /api/frankie/token ──► cookie → user → JWT (FRANKIE_JWT_SECRET)
  │ ◄── { token }
  │ ───────────────────────────────────────────────────────────►  session (verifies JWT)
  │ chat ──────────────────────────────────────────────────────►  agent loop
  │                                  ◄── PUT /api/v1/games/{id}     (Authorization: Bearer <user JWT>)
  │ poll GET /api/v1/games/{id} ─► new version → preview reloads
```

## 1. Polly environment

| Variable | Value |
| --- | --- |
| `FRANKIE_JWT_SECRET` | The secret your Frankie workspace verifies user tokens with (`openssl rand -base64 48`). Same value on both sides. |
| `NEXT_PUBLIC_FRANKIE_PUBLISHABLE_KEY` | The workspace's publishable key (`pk_…`). |
| `NEXT_PUBLIC_FRANKIE_URL` | Only when self-hosting Frankie; empty means Frankie Cloud. |

Without a publishable key the studio still works (play, history, publish, download) and
shows a "Connect Frankie" note where the chat would be.

## 2. Frankie workspace (all in Frankie's dashboard)

1. **Create workspace.** Product name "Polly". **Allowed origins**: your Polly origin(s), e.g.
   `https://polly.example.com, http://localhost:3000`. Save the **publishable key** and the
   **JWT secret** (shown once) into Polly's env above.
2. **Connect your product → OpenAPI by URL**: `https://<polly>/api/v1/openapi.json`
   - **Access level: write** (GET, POST, PUT, PATCH). Not *full*: that adds DELETE.
   - **Send the signed-in user's token**: on (the default).
   - New connections run **in the user's browser** by default: tool calls go from the studio
     page straight to Polly with the logged-in cookie. That works. Switching the connection
     to Frankie's server also works, using the forwarded token.
3. **Allowed tools** (a new connection starts with none). Tick:

   | Tool | What Frankie uses it for |
   | --- | --- |
   | `getGameGuide` | the rules and the exact game-kit API, once per conversation |
   | `listStarters`, `createGame` | starting a new game from a working starter |
   | `listGames`, `getGame` | finding a game and its outline (sections, functions, line numbers) |
   | `searchGameCode`, `readGameCode` | reading code in line ranges |
   | `editGame` | changing code with exact find/replace edits |
   | `updateGame` | renaming, publishing, or a full rewrite |
   | `listGameVersions`, `restoreGameVersion` | undo |

   Leave `deleteGame` off unless you want Frankie to delete games.
4. **Instructions** (the agent's system prompt). Keep it short; the details live in
   `getGameGuide`, so they never drift from Polly:

```
You are Frankie, the game-making partner inside Polly. People describe a game and you
build it with them, turn by turn, until it is fun.

Call getGameGuide once at the start of a conversation and follow it exactly: it has the
rules every Polly game follows and the only game-kit functions that exist.

The game the person has open is gameId in the page context. Work like a careful coder:
getGame for the outline, searchGameCode and readGameCode to read the exact lines, then
editGame with small find/replace edits (baseVersion = the version you read). If an edit
is refused or comes back with warnings, read the lines again and fix it. Only send a whole
file (updateGame html) for a brand-new game.

The preview reloads by itself when you save. Reply in one to three warm, plain sentences:
what you changed and one idea to try next. Never paste game code into the chat.
```

5. **Suggested prompts** (optional): "Make it harder over time", "Add a boss fight",
   "Add 2 players on one keyboard", "Make it online multiplayer", "Add more juice".

### Why reading and editing instead of whole files

Frankie cuts every API response to `maxResponseChars` (**8,000 characters** by default; it
can only be raised in Frankie's config, not the dashboard). Games are larger than that
(Ember is ~120 KB), so the API never sends a whole game to the agent:

- `getGame` returns an outline, not the code.
- `readGameCode` returns numbered lines, as many as fit, with `nextStartLine` to continue.
- `editGame` applies exact find/replace edits tied to `baseVersion`. All or nothing, each
  `find` must match exactly once, and a repeated call is refused (409), never applied twice.
- Every save is checked: a JavaScript syntax error is refused with its line (the game is
  untouched), and unknown `Kit.*` names, missing `vendor/` scripts or network use come back
  as `warnings`.

Tests in `apps/web/test` keep every response, including every page of Ember, under 8,000
characters and every operation description under Frankie's 600-character cap.

## 3. Check it

1. Sign in to Polly, open a game in the studio: the chat appears on the left.
2. Ask "make the player a cat". Frankie should call `getGameGuide`, `getGame`,
   `searchGameCode`/`readGameCode`, then `editGame`, and the preview reloads with a new
   version in the history menu.
3. If a tool answers 401, run through Frankie's checklist (its README, "Hosted OpenAPI"):
   the usual cause is `forwardUserTokenAs` missing, or `FRANKIE_JWT_SECRET` differing
   between the two sides.
