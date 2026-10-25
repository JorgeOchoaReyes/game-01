import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { signFrankieToken } from "@/lib/server/auth";
import { openApiDocument } from "@/lib/server/openapi";
import * as gamesRoute from "@/app/api/v1/games/route";
import * as gameRoute from "@/app/api/v1/games/[gameId]/route";
import * as tokenRoute from "@/app/api/frankie/token/route";
import * as codeRoute from "@/app/api/v1/games/[gameId]/code/route";
import * as searchRoute from "@/app/api/v1/games/[gameId]/search/route";
import * as editsRoute from "@/app/api/v1/games/[gameId]/edits/route";
import * as guideRoute from "@/app/api/v1/guide/route";
import { account } from "./firebase-helpers";

const ORIGIN = "http://polly.test";
const params = <T>(p: T) => ({ params: Promise.resolve(p) });

describe("game API as Frankie calls it", () => {
  it("creates a game, reads it in pieces, edits it, and stays within Frankie's limits", async () => {
    const user = await account();
    const auth = { authorization: `Bearer ${await signFrankieToken(user)}` };
    const send = async (res: Response) => ({ status: res.status, text: await res.text() });

    expect((await gamesRoute.GET(new Request(`${ORIGIN}/api/v1/games`))).status).toBe(401);

    const guide = await send(await guideRoute.GET());
    expect(guide.text.length).toBeLessThan(8000);

    const created = await send(await gamesRoute.POST(new Request(`${ORIGIN}/api/v1/games`, {
      method: "POST", headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ starterId: "star-catcher", title: "Fish Rocket" }),
    })));
    expect(created.status).toBe(201);
    const game = JSON.parse(created.text);
    expect(game).toMatchObject({ title: "Fish Rocket", version: 1, playUrl: `${ORIGIN}/g/${game.id}` });
    expect(game.html).toBeUndefined();
    expect(game.outline.length).toBeGreaterThan(3);
    const p = params({ gameId: game.id });

    const outline = await send(await gameRoute.GET(new Request(`${ORIGIN}/api/v1/games/${game.id}`, { headers: auth }), p));
    expect(outline.text.length).toBeLessThan(8000);
    expect(JSON.parse(outline.text).totalLines).toBeGreaterThan(100);

    const found = JSON.parse((await send(await searchRoute.GET(new Request(`${ORIGIN}/api/v1/games/${game.id}/search?query=playerSpeed`, { headers: auth }), p))).text);
    const line = found.matches[0].line;
    const page = JSON.parse((await send(await codeRoute.GET(new Request(`${ORIGIN}/api/v1/games/${game.id}/code?startLine=${line}&endLine=${line}`, { headers: auth }), p))).text);
    const original = page.code.replace(/^\d+\| /, "");
    expect(original).toContain("playerSpeed");

    const edit = (b: object) => editsRoute.POST(new Request(`${ORIGIN}/api/v1/games/${game.id}/edits`, {
      method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify(b),
    }), p);
    const saved = await send(await edit({ baseVersion: 1, edits: [{ find: original, replace: original.replace(/playerSpeed: \d+/, "playerSpeed: 500") }], note: "faster" }));
    expect(saved.status).toBe(200);
    expect(JSON.parse(saved.text)).toMatchObject({ version: 2, warnings: [], changed: [{ edit: 1, line }] });

    // a retry of the same call is refused instead of applied twice
    expect((await edit({ baseVersion: 1, edits: [{ find: original, replace: "x" }] })).status).toBe(409);
    // a syntax error never reaches the user's game
    const bad = await send(await edit({ baseVersion: 2, edits: [{ find: "function update(dt) {", replace: "function update(dt) {{" }] }));
    expect(bad.status).toBe(422);
    expect(JSON.parse(bad.text).error.code).toBe("script_syntax_error");

    // the studio still gets the whole file, and cheap polling via ETag
    const full = await gameRoute.GET(new Request(`${ORIGIN}/api/v1/games/${game.id}?include=html`, { headers: auth }), p);
    expect((await full.json()).html).toContain("playerSpeed: 500");
    const etag = full.headers.get("etag")!;
    expect((await gameRoute.GET(new Request(`${ORIGIN}/api/v1/games/${game.id}?include=html`, { headers: { ...auth, "if-none-match": etag } }), p)).status).toBe(304);

    // whole-file saves need baseVersion
    const html = (await (await gameRoute.GET(new Request(`${ORIGIN}/api/v1/games/${game.id}?include=html`, { headers: auth }), p)).json()).html;
    const put = (b: object) => gameRoute.PUT(new Request(`${ORIGIN}/api/v1/games/${game.id}`, { method: "PUT", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify(b) }), p);
    expect((await put({ html })).status).toBe(400);
    expect((await put({ html: html.replace("Fish", "Cat"), baseVersion: 2 })).status).toBe(200);
  });

  it("token endpoint answers null when signed out", async () => {
    const res = await tokenRoute.POST(new Request(`${ORIGIN}/api/frankie/token`, { method: "POST" }));
    expect(await res.json()).toEqual({ token: null });
  });
});

describe("OpenAPI document", () => {
  const doc = openApiDocument(ORIGIN);
  const ops = Object.entries(doc.paths).flatMap(([p, methods]) => Object.entries(methods).map(([m, op]) => ({ p, m, op: op as { operationId: string } })));

  it("fits Frankie's description limits", () => {
    for (const { op, p, m } of ops) {
      const o = op as unknown as { summary?: string; description?: string; parameters?: { description?: string }[] };
      const text = [o.summary, o.description].filter(Boolean).join(" - ");
      expect(text.length, `${m.toUpperCase()} ${p}`).toBeLessThanOrEqual(600);
      expect(o.summary, `${m} ${p} summary`).toBeTruthy();
      for (const param of o.parameters ?? []) expect((param.description ?? "").length, `${p} ${JSON.stringify(param)}`).toBeLessThanOrEqual(100);
    }
  });

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
