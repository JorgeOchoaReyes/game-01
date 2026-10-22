// The OpenAPI document for Polly's game API, served at /api/v1/openapi.json.
// Frankie builds its tools from it (tool names: api__polly__<operationId>), so
// every description here is written for an agent deciding which call to make.

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = (schema: object, required = true) => ({ required, content: { "application/json": { schema } } });
const ok = (description: string, schema: object) => ({ description, content: { "application/json": { schema } } });
const errors = {
  "400": { description: "Invalid input", content: { "application/json": { schema: ref("Error") } } },
  "401": { description: "Not signed in", content: { "application/json": { schema: ref("Error") } } },
  "404": { description: "No such game in this account", content: { "application/json": { schema: ref("Error") } } },
};
const gameId = { name: "gameId", in: "path", required: true, schema: { type: "string" }, description: "The game's id (from page context `gameId`, listGames, or createGame)." };

export function openApiDocument(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Polly game API",
      version: "1.0.0",
      description:
        "Create, read and change browser games for the signed-in Polly user. Every game is one complete index.html that loads vendor/game-kit.js. Read getGameGuide before writing game code.",
    },
    servers: [{ url: `${origin}/api/v1` }],
    security: [{ bearer: [] }],
    paths: {
      "/guide": {
        get: {
          operationId: "getGameGuide",
          summary: "How to write a Polly game",
          description: "The house rules every game follows, the exact game-kit API (never call functions not listed), and the workflow for editing games through this API. Read this before writing or changing game code.",
          security: [],
          responses: { "200": ok("The guide", ref("Guide")) },
        },
      },
      "/starters": {
        get: {
          operationId: "listStarters",
          summary: "List starter games",
          description: "Working games to build a new game from. Pick the closest one and pass its id to createGame.",
          security: [],
          responses: { "200": ok("Starters", { type: "object", properties: { starters: { type: "array", items: ref("Starter") } }, required: ["starters"] }) },
        },
      },
      "/starters/{starterId}": {
        get: {
          operationId: "getStarter",
          summary: "Read a starter's code",
          security: [],
          parameters: [{ name: "starterId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": ok("The starter with its html", { allOf: [ref("Starter"), { type: "object", properties: { html: { type: "string" } }, required: ["html"] }] }), "400": errors["400"] },
        },
      },
      "/games": {
        get: {
          operationId: "listGames",
          summary: "List the user's games",
          description: "The signed-in user's games, newest first, without their code.",
          responses: { "200": ok("Games", { type: "object", properties: { games: { type: "array", items: ref("Game") } }, required: ["games"] }), "401": errors["401"] },
        },
        post: {
          operationId: "createGame",
          summary: "Create a game",
          description: "Make a new game for the user, either from a starter (starterId) or from complete html. Returns the game with its studioUrl, playUrl and downloadUrl.",
          requestBody: jsonBody({
            type: "object",
            properties: {
              title: { type: "string", maxLength: 80 },
              starterId: { type: "string", description: "A starter id from listStarters. Used when html is not given." },
              html: { type: "string", description: "The complete index.html. Overrides starterId." },
            },
          }),
          responses: { "201": ok("The new game, with html", ref("GameWithHtml")), "400": errors["400"], "401": errors["401"] },
        },
      },
      "/games/{gameId}": {
        get: {
          operationId: "getGame",
          summary: "Read a game, including its code",
          description: "Returns the game and its complete current html. Always read before changing a game.",
          parameters: [gameId],
          responses: { "200": ok("The game, with html", ref("GameWithHtml")), "404": errors["404"] },
        },
        put: {
          operationId: "updateGame",
          summary: "Save a game",
          description:
            "Save changes. To change the game itself, send the COMPLETE new html (never a diff); each html change becomes a new version the user sees in their preview right away. title and visibility can change on their own. Pass baseVersion (the version you read) to avoid overwriting a newer save.",
          parameters: [gameId],
          requestBody: jsonBody({
            type: "object",
            properties: {
              html: { type: "string", description: "The complete new index.html." },
              title: { type: "string", maxLength: 80 },
              visibility: { type: "string", enum: ["private", "public"], description: "public gives the game a shareable play page." },
              note: { type: "string", maxLength: 200, description: "A short summary of what changed, shown in version history." },
              baseVersion: { type: "integer", description: "The version this change was made from." },
            },
          }),
          responses: { "200": ok("The saved game", ref("Game")), "400": errors["400"], "404": errors["404"], "409": { description: "The game changed since baseVersion", content: { "application/json": { schema: ref("Error") } } } },
        },
        delete: {
          operationId: "deleteGame",
          summary: "Delete a game",
          description: "Permanently deletes the game and its history. Only when the user explicitly asks.",
          parameters: [gameId],
          responses: { "204": { description: "Deleted" }, "404": errors["404"] },
        },
      },
      "/games/{gameId}/versions": {
        get: {
          operationId: "listGameVersions",
          summary: "List a game's saved versions",
          parameters: [gameId],
          responses: { "200": ok("Versions, newest first", { type: "object", properties: { versions: { type: "array", items: ref("Version") } }, required: ["versions"] }), "404": errors["404"] },
        },
      },
      "/games/{gameId}/versions/{version}/restore": {
        post: {
          operationId: "restoreGameVersion",
          summary: "Undo to an earlier version",
          description: "Copies an earlier version forward as the newest version. Nothing is lost.",
          parameters: [gameId, { name: "version", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": ok("The restored game", ref("Game")), "404": errors["404"] },
        },
      },
      "/games/{gameId}/download": {
        get: {
          operationId: "downloadGame",
          summary: "Download a game as a zip",
          description: "A zip with index.html at the top level and vendor/ beside it. Usually you just give the user the game's downloadUrl.",
          parameters: [gameId],
          responses: { "200": { description: "application/zip" }, "404": errors["404"] },
        },
      },
    },
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
      schemas: {
        Error: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } }, required: ["code", "message"] } }, required: ["error"] },
        Guide: { type: "object", properties: { practices: { type: "string" }, kitReference: { type: "string" }, workflow: { type: "string" } }, required: ["practices", "kitReference", "workflow"] },
        Starter: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, emoji: { type: "string" }, kind: { type: "string" }, blurb: { type: "string" } }, required: ["id", "title", "kind", "blurb"] },
        Game: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            version: { type: "integer" },
            visibility: { type: "string", enum: ["private", "public"] },
            starterId: { type: ["string", "null"] },
            ownerId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            studioUrl: { type: "string" },
            playUrl: { type: "string", description: "Works for others only when visibility is public." },
            downloadUrl: { type: "string" },
          },
          required: ["id", "title", "version", "visibility", "studioUrl", "playUrl", "downloadUrl"],
        },
        GameWithHtml: { allOf: [ref("Game"), { type: "object", properties: { html: { type: "string" } }, required: ["html"] }] },
        Version: { type: "object", properties: { version: { type: "integer" }, title: { type: "string" }, note: { type: ["string", "null"] }, createdAt: { type: "string", format: "date-time" } }, required: ["version", "title", "createdAt"] },
      },
    },
  };
}
