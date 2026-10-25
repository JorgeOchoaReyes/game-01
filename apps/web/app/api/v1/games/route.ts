import { getRequestUser } from "@/lib/server/auth";
import { checkGame } from "@/lib/server/code";
import { createGame, gameJson, listGames } from "@/lib/server/games";
import { badRequest, originOf, readJson, route, unauthorized } from "@/lib/server/http";
import { starterHtml } from "@/lib/server/starters";
import { FILM_FORMATS, withFilmFormat, type FilmFormat } from "@/lib/game-html";

export const GET = route(async (req: Request) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  const origin = originOf(req);
  return Response.json({ games: (await listGames(user)).map((g) => gameJson(g, origin)) });
});

export const POST = route(async (req: Request) => {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  const body = await readJson<{ title?: unknown; html?: unknown; starterId?: unknown; format?: unknown }>(req);
  const origin = originOf(req);
  let html = body.html;
  let starterId: string | null = null;
  let warnings: string[] = [];
  if (html === undefined) {
    if (typeof body.starterId !== "string") throw badRequest("Send a starterId from listStarters (or html for a complete new game).");
    starterId = body.starterId;
    html = await starterHtml(starterId, origin);
    // a video starter can begin as a short, landscape or square
    if (FILM_FORMATS.some((f) => f.id === body.format)) html = withFilmFormat(html as string, body.format as FilmFormat) ?? html;
  } else {
    if (typeof html !== "string") throw badRequest("html must be the complete game file as a string.");
    warnings = checkGame(html).warnings;
  }
  const game = await createGame(user, { title: body.title, html, starterId });
  return Response.json({ ...gameJson(game, origin, { includeOutline: true }), warnings }, { status: 201 });
});
