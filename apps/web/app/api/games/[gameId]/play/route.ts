import { getRequestUser } from "@/lib/server/auth";
import { recordPlay } from "@/lib/server/games";
import { clientIp, rateLimit, route } from "@/lib/server/http";
import { listStarters } from "@/lib/server/starters";
import { streakStatus, touchStreak } from "@/lib/server/streaks";

// A game page calls this when someone presses Play: it counts the play on a
// public game and, for a signed-in player, today's streak. gameId may also be
// a starter's id. Not part of the agent API.
export const POST = route(async (req: Request, ctx: { params: Promise<{ gameId: string }> }) => {
  const { gameId } = await ctx.params;
  rateLimit(`play:${clientIp(req)}:${gameId}`, 20, 10 * 60 * 1000);
  const user = await getRequestUser(req);
  if (!listStarters().some((s) => s.id === gameId)) await recordPlay(gameId, user);
  if (!user) return Response.json({ streak: null });
  const streak = await touchStreak(user.id);
  return Response.json({ streak: streak ? streakStatus({ streak, tz: user.tz }) : null });
});
