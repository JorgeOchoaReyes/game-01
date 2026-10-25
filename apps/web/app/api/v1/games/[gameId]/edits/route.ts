import { getRequestUser } from "@/lib/server/auth";
import { editGame, gameJson } from "@/lib/server/games";
import { originOf, readJson, route, unauthorized } from "@/lib/server/http";

// POST { baseVersion, edits: [{ find, replace }], note? } -> the new version.
export const POST = route(async (req: Request, ctx: { params: Promise<{ gameId: string }> }) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  const { gameId } = await ctx.params;
  const { game, changed, warnings } = await editGame(gameId, user, await readJson(req));
  return Response.json({ ...gameJson(game, originOf(req)), changed, warnings });
});
