import { getRequestUser } from "@/lib/server/auth";
import { recordPlay } from "@/lib/server/games";
import { clientIp, rateLimit, route } from "@/lib/server/http";

// The play page calls this when someone presses Play. Not part of the agent API.
export const POST = route(async (req: Request, ctx: { params: Promise<{ gameId: string }> }) => {
  const { gameId } = await ctx.params;
  rateLimit(`play:${clientIp(req)}:${gameId}`, 5, 10 * 60 * 1000);
  await recordPlay(gameId, await getRequestUser(req));
  return new Response(null, { status: 204 });
});
