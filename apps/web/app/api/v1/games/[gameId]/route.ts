import { getRequestUser } from "@/lib/server/auth";
import { deleteGame, gameJson, getReadableGame, updateGame, type GameUpdate } from "@/lib/server/games";
import { originOf, readJson, route, unauthorized } from "@/lib/server/http";

type Ctx = { params: Promise<{ gameId: string }> };

// ETag is the version, so the studio can poll cheaply for saves made by Frankie.
export const GET = route(async (req: Request, ctx: Ctx) => {
  const { gameId } = await ctx.params;
  const game = await getReadableGame(gameId, await getRequestUser(req));
  const etag = `"v${game.version}-${game.visibility}-${encodeURIComponent(game.title)}"`;
  const headers = { etag, "cache-control": "private, no-cache" };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return Response.json(gameJson(game, originOf(req), { includeHtml: true }), { headers });
});

export const PUT = route(async (req: Request, ctx: Ctx) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  const { gameId } = await ctx.params;
  const game = await updateGame(gameId, user, await readJson<GameUpdate>(req));
  return Response.json(gameJson(game, originOf(req)));
});

export const DELETE = route(async (req: Request, ctx: Ctx) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  const { gameId } = await ctx.params;
  await deleteGame(gameId, user);
  return new Response(null, { status: 204 });
});
