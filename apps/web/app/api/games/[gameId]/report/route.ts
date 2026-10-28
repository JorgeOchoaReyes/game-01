import { getRequestUser } from "@/lib/server/auth";
import { findGame } from "@/lib/server/games";
import { badRequest, clientIp, notFound, rateLimit, readJson, route } from "@/lib/server/http";
import { logEvent } from "@/lib/server/activity";

const REASONS = ["sexual", "hateful", "vulgar", "broken", "other"] as const;

// POST { reason } -> 204: someone flags a public game for the admins, who see it
// in the /admin activity feed. Not part of the agent API.
export const POST = route(async (req: Request, ctx: { params: Promise<{ gameId: string }> }) => {
  const { gameId } = await ctx.params;
  rateLimit(`report:${clientIp(req)}`, 10, 60 * 60 * 1000);
  const body = await readJson<{ reason?: unknown }>(req);
  const reason = REASONS.find((r) => r === body.reason);
  if (!reason) throw badRequest(`reason must be one of ${REASONS.join(", ")}.`);
  const game = await findGame(gameId);
  if (!game || game.visibility !== "public") throw notFound("No such public game.");
  await logEvent("game.report", await getRequestUser(req), { ownerId: game.ownerId, gameId, title: game.title, detail: reason });
  return new Response(null, { status: 204 });
});
