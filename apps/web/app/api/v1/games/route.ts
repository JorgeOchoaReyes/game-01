import { getRequestUser } from "@/lib/server/auth";
import { createGame, gameJson, listGames } from "@/lib/server/games";
import { badRequest, originOf, readJson, route, unauthorized } from "@/lib/server/http";
import { starterHtml } from "@/lib/server/starters";

export const GET = route(async (req: Request) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  const origin = originOf(req);
  return Response.json({ games: (await listGames(user)).map((g) => gameJson(g, origin)) });
});

export const POST = route(async (req: Request) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  const body = await readJson<{ title?: unknown; html?: unknown; starterId?: unknown }>(req);
  const origin = originOf(req);
  let html = body.html;
  let starterId: string | null = null;
  if (html === undefined) {
    if (typeof body.starterId !== "string") throw badRequest("Send html, or a starterId from listStarters.");
    starterId = body.starterId;
    html = await starterHtml(starterId, origin);
  }
  const game = await createGame(user, { title: body.title, html, starterId });
  return Response.json(gameJson(game, origin, { includeHtml: true }), { status: 201 });
});
