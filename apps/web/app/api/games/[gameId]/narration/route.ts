import { getRequestUser } from "@/lib/server/auth";
import { getOwnedGame } from "@/lib/server/games";
import { clientIp, rateLimit, route, unauthorized } from "@/lib/server/http";
import { narrate } from "@/lib/server/voice";

// POST -> { clips: [{ scene, text, audio (base64 mp3), mime }] }: a voiceover for
// the owner's video, read from its captions with the owner's ElevenLabs key.
// Not part of the agent API.
export const POST = route(async (req: Request, ctx: { params: Promise<{ gameId: string }> }) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  rateLimit(`narrate:${user.id}`, 20, 10 * 60 * 1000);
  const { gameId } = await ctx.params;
  const game = await getOwnedGame(gameId, user);
  return Response.json({ clips: await narrate(user.id, game.id, game.html) }, { headers: { "cache-control": "no-store" } });
});
