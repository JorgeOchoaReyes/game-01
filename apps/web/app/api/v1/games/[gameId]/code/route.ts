import { getRequestUser } from "@/lib/server/auth";
import { readRange } from "@/lib/server/code";
import { getReadableGame } from "@/lib/server/games";
import { badRequest, route } from "@/lib/server/http";

function lineParam(value: string | null, name: string): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw badRequest(`${name} must be a whole number of at least 1.`);
  return n;
}

// GET ?startLine=&endLine= -> numbered lines, as many as fit the response budget.
export const GET = route(async (req: Request, ctx: { params: Promise<{ gameId: string }> }) => {
  const { gameId } = await ctx.params;
  const game = await getReadableGame(gameId, await getRequestUser(req));
  const q = new URL(req.url).searchParams;
  const range = readRange(game.html, lineParam(q.get("startLine"), "startLine") ?? 1, lineParam(q.get("endLine"), "endLine"));
  return Response.json({ gameId: game.id, version: game.version, ...range });
});
