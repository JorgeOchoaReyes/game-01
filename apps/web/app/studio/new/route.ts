import { getRequestUser } from "@/lib/server/auth";
import { createGame, getReadableGame } from "@/lib/server/games";
import { HttpError, originOf } from "@/lib/server/http";
import { listStarters, starterHtml } from "@/lib/server/starters";

// <form method="post" action="/studio/new"> with a `starter` field (a starter
// id) or a `remix` field (a public game's id): make the game, then go straight
// to it in the studio. POST so prefetching never creates games.
export async function POST(req: Request) {
  const origin = originOf(req);
  const form = await req.formData();
  const starter = String(form.get("starter") || "");
  const remix = String(form.get("remix") || "");
  const user = await getRequestUser(req);
  if (!user || user.anonymous) {
    const back = remix ? `/g/${remix}` : starter ? `/play/${starter}` : "/studio";
    return Response.redirect(`${origin}/${user ? "signup" : "login"}?next=${encodeURIComponent(back)}`, 303);
  }

  try {
    if (remix) {
      const source = await getReadableGame(remix, user).catch(() => null);
      if (!source) return Response.redirect(`${origin}/games`, 303);
      const game = await createGame(user, { html: source.html, starterId: source.starterId, title: `${source.title} (remix)`.slice(0, 80) });
      return Response.redirect(`${origin}/studio/${game.id}`, 303);
    }

    const meta = listStarters().find((s) => s.id === starter);
    if (!meta) return Response.redirect(`${origin}/studio`, 303);
    const game = await createGame(user, { html: await starterHtml(starter, origin), starterId: starter, title: meta.title });
    return Response.redirect(`${origin}/studio/${game.id}`, 303);
  } catch (err) {
    // over the free plan's limit: show the plans
    if (err instanceof HttpError && err.code === "payment_required") return Response.redirect(`${origin}/pricing?limit=1`, 303);
    throw err;
  }
}
