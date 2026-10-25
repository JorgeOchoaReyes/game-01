import { getRequestUser } from "@/lib/server/auth";
import { listVersions } from "@/lib/server/games";
import { route, unauthorized } from "@/lib/server/http";

export const GET = route(async (req: Request, ctx: { params: Promise<{ gameId: string }> }) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  const { gameId } = await ctx.params;
  const versions = await listVersions(gameId, user);
  return Response.json({ versions: versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })) });
});
