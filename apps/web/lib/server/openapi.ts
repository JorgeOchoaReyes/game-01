// The OpenAPI document for Polly's game API, served at /api/v1/openapi.json.
// Frankie builds its tools from it (tool names: api__polly__<operationId>).
//
// Written for an agent, inside Frankie's limits:
//   - summary + description of an operation: 600 characters (test enforces)
//   - each input's description: ~100 characters are kept
//   - every response: under 8,000 characters (Frankie's default tool-result
//     limit), which is why code is read in line ranges and changed with edits.

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ "application/json": { schema } });
const ok = (description: string, schema: object) => ({ description, content: json(schema) });
const err = (description: string) => ({ description, content: json(ref("Error")) });
const body = (schema: object) => ({ required: true, content: json(schema) });

const gameId = {
  name: "gameId",
  in: "path",
  required: true,
  description: "The game's id: gameId from page context, or from listGames / createGame.",
  schema: { type: "string", example: "rOcvfDTflk3a" },
};

const E401 = err("Not signed in, or the token expired.");
const E404 = err("No such game in this user's account.");

export function openApiDocument(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Polly game API",
      version: "1.1.0",
      description:
        "Make and change browser games for the signed-in Polly user. A game is one index.html that loads vendor/game-kit.js. " +
        "Read getGameGuide once per conversation before writing code. Read code with getGame/searchGameCode/readGameCode; change it with editGame.",
    },
    servers: [{ url: `${origin}/api/v1` }],
    security: [{ bearer: [] }],
    tags: [
      { name: "guide", description: "How to write Polly games" },
      { name: "games", description: "The user's games" },
      { name: "code", description: "Reading and editing a game's code" },
      { name: "history", description: "Saved versions" },
    ],
    paths: {
      "/guide": {
        get: {
          operationId: "getGameGuide",
          tags: ["guide"],
          summary: "Rules for writing Polly games",
          description:
            "Returns the workflow for this API, the rules every game follows (one file, offline, CFG block, win/lose, touch + keys) and kitApi: the only game-kit functions that exist. Call once per conversation, before writing or changing any game code.",
          security: [],
          responses: { "200": ok("The guide", ref("Guide")) },
        },
      },
      "/starters": {
        get: {
          operationId: "listStarters",
          tags: ["guide"],
          summary: "List starter games",
          description: "Working games to begin from (2D arcade, 3D, multiplayer, Ember). Pass the closest one's id to createGame instead of writing a game from nothing.",
          security: [],
          responses: { "200": ok("Starters", { type: "object", properties: { starters: { type: "array", items: ref("Starter") } }, required: ["starters"] }) },
        },
      },
      "/games": {
        get: {
          operationId: "listGames",
          tags: ["games"],
          summary: "List the user's games",
          description: "The signed-in user's games, newest first: id, title, version, visibility and links. No code.",
          responses: { "200": ok("Games", { type: "object", properties: { games: { type: "array", items: ref("Game") } }, required: ["games"] }), "401": E401 },
        },
        post: {
          operationId: "createGame",
          tags: ["games"],
          summary: "Create a game",
          description:
            "Creates a game for the user from a starter (starterId, preferred) or from a complete html file. Returns the game with its outline; then change it with editGame. The user can open it at studioUrl.",
          requestBody: body({
            type: "object",
            additionalProperties: false,
            properties: {
              starterId: { type: "string", description: "A starter id from listStarters.", example: "star-catcher" },
              title: { type: "string", maxLength: 80, description: "The game's name.", example: "Fish Rocket" },
              html: { type: "string", description: "A complete index.html. Only when no starter fits; overrides starterId." },
            },
          }),
          responses: { "201": ok("The new game", ref("GameWithOutline")), "400": err("Missing starterId/html, or html is not a game file."), "401": E401, "422": err("html has a JavaScript syntax error.") },
        },
      },
      "/games/{gameId}": {
        get: {
          operationId: "getGame",
          tags: ["games"],
          summary: "Get a game and its outline",
          description:
            "Returns the game's details, version, size and an outline: its sections, CFG block and functions with line numbers. Use it to decide which lines to read with readGameCode. Does not return the code itself.",
          parameters: [gameId],
          responses: { "200": ok("The game with its outline", ref("GameWithOutline")), "404": E404 },
        },
        put: {
          operationId: "updateGame",
          tags: ["games"],
          summary: "Rename, publish, or replace the whole file",
          description:
            "Changes title and/or visibility (public gives the game a shareable play page). html replaces the ENTIRE file: use it only for a brand-new game or full rewrite; for changes use editGame. A file with a JavaScript syntax error is refused.",
          parameters: [gameId],
          requestBody: body({
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string", maxLength: 80, description: "New name.", example: "Fish Rocket" },
              visibility: { type: "string", enum: ["private", "public"], description: "public = anyone with playUrl can play it." },
              html: { type: "string", description: "The COMPLETE new index.html. Only for full rewrites." },
              baseVersion: { type: "integer", description: "The version you read. Required with html to avoid overwriting newer saves.", example: 3 },
              note: { type: "string", maxLength: 200, description: "What changed, shown in version history.", example: "New space theme" },
            },
          }),
          responses: { "200": ok("The saved game", ref("SaveResult")), "400": err("Invalid input"), "404": E404, "409": err("The game changed since baseVersion."), "422": err("html has a JavaScript syntax error; nothing was saved.") },
        },
        delete: {
          operationId: "deleteGame",
          tags: ["games"],
          summary: "Delete a game permanently",
          description: "Deletes the game and all its versions. Cannot be undone. Only when the user clearly asks to delete it.",
          parameters: [gameId],
          responses: { "204": { description: "Deleted" }, "404": E404 },
        },
      },
      "/games/{gameId}/code": {
        get: {
          operationId: "readGameCode",
          tags: ["code"],
          summary: "Read a game's code by line range",
          description:
            'Returns numbered lines ("12| code") from startLine, as many as fit (about 4,800 characters), and nextStartLine to continue. Read the lines you will change before editGame. The "12| " prefix is not part of the code.',
          parameters: [
            gameId,
            { name: "startLine", in: "query", required: false, description: "First line to read (default 1). Take it from getGame's outline or searchGameCode.", schema: { type: "integer", minimum: 1, example: 40 } },
            { name: "endLine", in: "query", required: false, description: "Last line to read. The response may stop earlier to stay small.", schema: { type: "integer", minimum: 1, example: 120 } },
          ],
          responses: { "200": ok("Numbered lines", ref("CodeRange")), "400": err("Line out of range"), "404": E404 },
        },
      },
      "/games/{gameId}/search": {
        get: {
          operationId: "searchGameCode",
          tags: ["code"],
          summary: "Find text in a game's code",
          description: "Case-insensitive search for literal text; returns matching line numbers and lines (up to 30). Use it to locate code to read or edit, e.g. \"CFG\", \"function update\", \"Kit.audio\".",
          parameters: [gameId, { name: "query", in: "query", required: true, description: "Text to find (literal, not a regex).", schema: { type: "string", maxLength: 200, example: "function render" } }],
          responses: { "200": ok("Matches", ref("SearchResult")), "400": err("Empty query"), "404": E404 },
        },
      },
      "/games/{gameId}/edits": {
        post: {
          operationId: "editGame",
          tags: ["code"],
          summary: "Change a game with find/replace edits",
          description:
            "Applies exact find/replace edits to the version you read, all or none, and saves a new version (the preview reloads). Each find must match exactly once: copy it from readGameCode without line numbers. A syntax error is refused. Check warnings in the result.",
          parameters: [gameId],
          requestBody: body({
            type: "object",
            additionalProperties: false,
            required: ["baseVersion", "edits"],
            properties: {
              baseVersion: { type: "integer", description: "The version you read the code from.", example: 3 },
              edits: {
                type: "array",
                minItems: 1,
                maxItems: 20,
                description: "Changes in order. Each find must appear exactly once in the current code.",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["find", "replace"],
                  properties: {
                    find: { type: "string", description: "Exact existing text, whitespace included; enough lines to be unique.", example: "  playerSpeed: 340, playerR: 18," },
                    replace: { type: "string", description: "The new text. Empty string deletes find.", example: "  playerSpeed: 420, playerR: 18," },
                  },
                },
              },
              note: { type: "string", maxLength: 200, description: "What changed, shown in version history.", example: "Faster player" },
            },
          }),
          responses: {
            "200": ok("Saved: the new version, where each edit landed, and warnings", ref("SaveResult")),
            "400": err("Malformed edits"),
            "404": E404,
            "409": err("The game changed since baseVersion: re-read and retry."),
            "422": err("A find matched 0 or several times, or the result has a syntax error. Nothing was saved."),
          },
        },
      },
      "/games/{gameId}/versions": {
        get: {
          operationId: "listGameVersions",
          tags: ["history"],
          summary: "List a game's saved versions",
          description: "Every saved version, newest first, with its note. Use with restoreGameVersion to undo.",
          parameters: [gameId],
          responses: { "200": ok("Versions", { type: "object", properties: { versions: { type: "array", items: ref("Version") } }, required: ["versions"] }), "404": E404 },
        },
      },
      "/games/{gameId}/versions/{version}/restore": {
        post: {
          operationId: "restoreGameVersion",
          tags: ["history"],
          summary: "Undo: bring back an earlier version",
          description: "Copies an earlier version forward as the newest version, so nothing is lost. Use when the user wants to undo a change.",
          parameters: [gameId, { name: "version", in: "path", required: true, description: "The version number to bring back (from listGameVersions).", schema: { type: "integer", minimum: 1, example: 2 } }],
          responses: { "200": ok("The restored game", ref("SaveResult")), "404": err("No such game or version") },
        },
      },
    },
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "The signed-in user's token: Frankie forwards it; other clients send a Firebase ID token." } },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string", description: "Stable code, e.g. edit_not_found, version_conflict, script_syntax_error." },
                message: { type: "string", description: "What went wrong and how to fix it." },
              },
              required: ["code", "message"],
            },
          },
          required: ["error"],
        },
        Guide: {
          type: "object",
          properties: {
            workflow: { type: "string", description: "How to use this API step by step." },
            rules: { type: "string", description: "The rules every Polly game follows." },
            kitApi: { type: "string", description: "Every vendor/game-kit.js function. Use no others." },
          },
          required: ["workflow", "rules", "kitApi"],
        },
        Starter: {
          type: "object",
          properties: { id: { type: "string" }, title: { type: "string" }, emoji: { type: "string" }, kind: { type: "string" }, blurb: { type: "string" } },
          required: ["id", "title", "kind", "blurb"],
        },
        Game: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            version: { type: "integer", description: "Increases with every code change. Pass it as baseVersion." },
            visibility: { type: "string", enum: ["private", "public"] },
            starterId: { type: ["string", "null"] },
            ownerId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            studioUrl: { type: "string", description: "Where the user edits and plays it." },
            playUrl: { type: "string", description: "Shareable play page; works for others only when public." },
            downloadUrl: { type: "string", description: "A zip that runs on any static web server." },
          },
          required: ["id", "title", "version", "visibility", "studioUrl", "playUrl", "downloadUrl"],
        },
        GameWithOutline: {
          allOf: [
            ref("Game"),
            {
              type: "object",
              properties: {
                totalLines: { type: "integer" },
                sizeBytes: { type: "integer" },
                outline: {
                  type: "array",
                  description: "Landmarks in the file: sections, CFG, functions, with line numbers.",
                  items: { type: "object", properties: { line: { type: "integer" }, label: { type: "string" } }, required: ["line", "label"] },
                },
                outlineOmitted: { type: "integer", description: "Landmarks left out to keep the response small; use searchGameCode." },
              },
              required: ["totalLines", "sizeBytes", "outline"],
            },
          ],
        },
        SaveResult: {
          allOf: [
            ref("Game"),
            {
              type: "object",
              properties: {
                warnings: { type: "array", items: { type: "string" }, description: "Likely problems in the saved game (e.g. unknown Kit functions). Fix them with another edit." },
                changed: {
                  type: "array",
                  description: "editGame only: the line where each edit landed.",
                  items: { type: "object", properties: { edit: { type: "integer" }, line: { type: "integer" } }, required: ["edit", "line"] },
                },
              },
            },
          ],
        },
        CodeRange: {
          type: "object",
          properties: {
            gameId: { type: "string" },
            version: { type: "integer" },
            totalLines: { type: "integer" },
            startLine: { type: "integer" },
            endLine: { type: "integer", description: "Last line included." },
            nextStartLine: { type: ["integer", "null"], description: "Pass as startLine to keep reading; null at end of file." },
            code: { type: "string", description: 'Numbered lines, "12| code". The prefix is not part of the code.' },
          },
          required: ["gameId", "version", "totalLines", "startLine", "endLine", "nextStartLine", "code"],
        },
        SearchResult: {
          type: "object",
          properties: {
            gameId: { type: "string" },
            version: { type: "integer" },
            query: { type: "string" },
            totalMatches: { type: "integer" },
            matches: { type: "array", items: { type: "object", properties: { line: { type: "integer" }, text: { type: "string" } }, required: ["line", "text"] } },
            truncated: { type: "boolean" },
          },
          required: ["gameId", "version", "query", "totalMatches", "matches"],
        },
        Version: {
          type: "object",
          properties: { version: { type: "integer" }, title: { type: "string" }, note: { type: ["string", "null"] }, createdAt: { type: "string", format: "date-time" } },
          required: ["version", "title", "createdAt"],
        },
      },
    },
  };
}
