import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createAccount } from "@/lib/server/accounts";
import { signFrankieToken } from "@/lib/server/auth";
import { openApiDocument } from "@/lib/server/openapi";
import * as gamesRoute from "@/app/api/v1/games/route";
import * as gameRoute from "@/app/api/v1/games/[gameId]/route";
import * as tokenRoute from "@/app/api/frankie/token/route";

const ORIGIN = "http://polly.test";
const params = <T>(p: T) => ({ params: Promise.resolve(p) });

describe("game API as Frankie calls it", () => {
  it("creates, reads and saves a game with the token Frankie forwards", async () => {
    const user = await createAccount({ email: `api-${Date.now()}@example.com`, password: "password123" });
    const auth = { authorization: `Bearer ${await signFrankieToken(user)}` };

    const unauth = await gamesRoute.GET(new Request(`${ORIGIN}/api/v1/games`));
    expect(unauth.status).toBe(401);

    const created = await gamesRoute.POST(new Request(`${ORIGIN}/api/v1/games`, {
      method: "POST", headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ starterId: "star-catcher", title: "Fish Rocket" }),
    }));
    expect(created.status).toBe(201);
    const game = await created.json();
    expect(game).toMatchObject({ title: "Fish Rocket", version: 1, playUrl: `${ORIGIN}/g/${game.id}` });
    expect(game.html).toContain("vendor/game-kit.js");

    const read = await gameRoute.GET(new Request(`${ORIGIN}/api/v1/games/${game.id}`, { headers: auth }), params({ gameId: game.id }));
    const etag = read.headers.get("etag")!;
    const notModified = await gameRoute.GET(new Request(`${ORIGIN}/api/v1/games/${game.id}`, { headers: { ...auth, "if-none-match": etag } }), params({ gameId: game.id }));
    expect(notModified.status).toBe(304);

    const saved = await gameRoute.PUT(new Request(`${ORIGIN}/api/v1/games/${game.id}`, {
      method: "PUT", headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ html: game.html.replace("Star Catcher", "Fish Rocket"), baseVersion: 1, note: "renamed" }),
    }), params({ gameId: game.id }));
    expect((await saved.json()).version).toBe(2);

    const changed = await gameRoute.GET(new Request(`${ORIGIN}/api/v1/games/${game.id}`, { headers: { ...auth, "if-none-match": etag } }), params({ gameId: game.id }));
    expect(changed.status).toBe(200);
  });

  it("token endpoint answers null when signed out", async () => {
    const res = await tokenRoute.POST(new Request(`${ORIGIN}/api/frankie/token`, { method: "POST" }));
    expect(await res.json()).toEqual({ token: null });
  });
});

describe("OpenAPI document", () => {
  const doc = openApiDocument(ORIGIN);
  const ops = Object.entries(doc.paths).flatMap(([p, methods]) => Object.entries(methods).map(([m, op]) => ({ p, m, op: op as { operationId: string } })));

  it("has unique operation ids and points at this API", () => {
    const ids = ops.map((o) => o.op.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(doc.servers[0].url).toBe(`${ORIGIN}/api/v1`);
  });

  it("documents only routes that exist, with the method they export", () => {
    for (const { p, m } of ops) {
      const dir = path.join(__dirname, "..", "app", "api", "v1", ...p.split("/").filter(Boolean).map((s) => s.replace(/^\{(.+)\}$/, "[$1]")));
      const file = path.join(dir, "route.ts");
      expect(fs.existsSync(file), `${p} -> ${file}`).toBe(true);
      expect(fs.readFileSync(file, "utf8"), `${m.toUpperCase()} ${p}`).toMatch(new RegExp(`export (const|async function) ${m.toUpperCase()}\\b`));
    }
  });
});
