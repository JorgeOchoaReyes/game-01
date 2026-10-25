import { getRequestUser } from "@/lib/server/auth";
import { deleteGame, gameJson, getReadableGame, saveGame, type GameUpdate } from "@/lib/server/games";
import { originOf, readJson, route, unauthorized } from "@/lib/server/http";

type Ctx = { params: Promise<{ gameId: string }> };

// Agents get the outline (code is read in ranges via /code). The studio asks
// for ?include=html to run the game. ETag is the version, so polling is cheap.
export const GET = route(async (req: Request, ctx: Ctx) => {
  const { gameId } = await ctx.params;
  const game = await getReadableGame(gameId, await getRequestUser(req));
  const includeHtml = new URL(req.url).searchParams.get("include") === "html";
  const etag = `"v${game.version}-${game.visibility}-${encodeURIComponent(game.title)}${includeHtml ? "-h" : ""}"`;
  const headers = { etag, "cache-control": "private, no-cache" };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  const body = includeHtml ? gameJson(game, originOf(req), { includeHtml: true }) : gameJson(game, originOf(req), { includeOutline: true });
  return Response.json(body, { headers });
});

export const PUT = route(async (req: Request, ctx: Ctx) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  const { gameId } = await ctx.params;
  const { game, warnings } = await saveGame(gameId, user, await readJson<GameUpdate>(req));
  return Response.json({ ...gameJson(game, originOf(req)), warnings });
});

export const DELETE = route(async (req: Request, ctx: Ctx) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  const { gameId } = await ctx.params;
  await deleteGame(gameId, user);
  return new Response(null, { status: 204 });
});
