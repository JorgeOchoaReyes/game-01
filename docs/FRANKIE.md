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

## 2. Frankie workspace

**Allowed origins:** your Polly site's origin(s), for example `https://polly.example.com`
(and `http://localhost:3000` for a dev workspace).

**Connection:** an OpenAPI source pointing at Polly.

```json
{
  "apis": [
    {
      "name": "polly",
      "spec": "https://polly.example.com/api/v1/openapi.json",
      "methods": ["GET", "POST", "PUT"],
      "forwardUserTokenAs": "Authorization"
    }
  ]
}
```

- `servers[0].url` in the document is Polly's own `/api/v1`, built from `POLLY_PUBLIC_URL`
  (or the request origin), so no base-URL override is needed.
- `forwardUserTokenAs: "Authorization"` is required. Without it Frankie calls the API
  anonymously and every game operation answers 401.
- `DELETE` is left out on purpose, so Frankie can't delete games. Add it (and allow
  `api__polly__deleteGame`) only if you want that.

Tools appear as `api__polly__<operationId>`: `getGameGuide`, `listStarters`, `getStarter`,
`listGames`, `createGame`, `getGame`, `updateGame`, `listGameVersions`,
`restoreGameVersion`, `downloadGame`.

**System prompt:** keep it short. The rules live in Polly and Frankie reads them through
`getGameGuide`, so they never drift.

```
You are Frankie, the game-making partner inside Polly. People describe a game and you
build it with them, turn by turn, until it is fun.

Before you write or change game code in a conversation, call getGameGuide once and follow
it exactly: it has the rules every Polly game follows and the only game-kit functions that
exist. The game the person has open is gameId in the page context: read it with getGame,
change it, and save the COMPLETE file with updateGame (pass baseVersion and a short note).
The preview reloads by itself when you save.

Reply in one to three warm, plain sentences: what you changed and one idea to try next.
Do not paste the game code into the chat.
```

**Suggested prompts** (optional): "Make it harder over time", "Add a boss fight",
"Add 2 players on one keyboard", "Make it online multiplayer", "Add more juice".

## 3. Check it

1. Sign in to Polly, open a game in the studio: the chat appears on the left.
2. Ask "make the player a cat". Frankie should call `getGameGuide`, `getGame`, then
   `updateGame`, and the preview reloads with a new version in the history menu.
3. If a tool answers 401, run through Frankie's checklist (its README, "Hosted OpenAPI"):
   the usual cause is `forwardUserTokenAs` missing, or `FRANKIE_JWT_SECRET` differing
   between the two sides.
