import { getRequestUser } from "@/lib/server/auth";
import { search } from "@/lib/server/code";
import { getReadableGame } from "@/lib/server/games";
import { route } from "@/lib/server/http";

// GET ?query= -> matching lines (case-insensitive, literal text).
export const GET = route(async (req: Request, ctx: { params: Promise<{ gameId: string }> }) => {
  const { gameId } = await ctx.params;
  const game = await getReadableGame(gameId, await getRequestUser(req));
  return Response.json({ gameId: game.id, version: game.version, ...search(game.html, new URL(req.url).searchParams.get("query") ?? "") });
});
