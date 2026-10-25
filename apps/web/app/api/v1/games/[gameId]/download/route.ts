import { getRequestUser } from "@/lib/server/auth";
import { getReadableGame } from "@/lib/server/games";
import { originOf, route } from "@/lib/server/http";
import { packageGame } from "@/lib/server/package-game";
import { RELAY_URL } from "@/lib/game-html";

export const GET = route(async (req: Request, ctx: { params: Promise<{ gameId: string }> }) => {
  const { gameId } = await ctx.params;
  const game = await getReadableGame(gameId, await getRequestUser(req));
  const { filename, body } = await packageGame(game, originOf(req), RELAY_URL);
  return new Response(body as BodyInit, {
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${filename}"` },
  });
});
