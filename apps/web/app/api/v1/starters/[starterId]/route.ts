import { listStarters, starterHtml } from "@/lib/server/starters";
import { notFound, originOf, route } from "@/lib/server/http";

export const GET = route(async (req: Request, ctx: { params: Promise<{ starterId: string }> }) => {
  const { starterId } = await ctx.params;
  const starter = listStarters().find((s) => s.id === starterId);
  if (!starter) throw notFound(`Unknown starter "${starterId}".`);
  return Response.json({ ...starter, html: await starterHtml(starterId, originOf(req)) });
});
