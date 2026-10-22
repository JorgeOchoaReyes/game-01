import { getRequestUser } from "@/lib/server/auth";
import { gameJson, restoreVersion } from "@/lib/server/games";
import { badRequest, originOf, route, unauthorized } from "@/lib/server/http";

export const POST = route(async (req: Request, ctx: { params: Promise<{ gameId: string; version: string }> }) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  const { gameId, version } = await ctx.params;
  const n = Number(version);
  if (!Number.isInteger(n) || n < 1) throw badRequest("version must be a positive integer.");
  return Response.json(gameJson(await restoreVersion(gameId, user, n), originOf(req)));
});
