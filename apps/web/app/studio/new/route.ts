import { getRequestUser } from "@/lib/server/auth";
import { createGame } from "@/lib/server/games";
import { originOf } from "@/lib/server/http";
import { listStarters, starterHtml } from "@/lib/server/starters";

// <form method="post" action="/studio/new"> with a `starter` field: make the
// game, then go straight to it in the studio. POST so prefetching never creates games.
export async function POST(req: Request) {
  const origin = originOf(req);
  const form = await req.formData();
  const starter = String(form.get("starter") || "");
  const user = await getRequestUser(req);
  if (!user) return Response.redirect(`${origin}/login?next=${encodeURIComponent("/studio")}`, 303);
  const meta = listStarters().find((s) => s.id === starter);
  if (!meta) return Response.redirect(`${origin}/studio`, 303);
  const game = await createGame(user, { html: await starterHtml(starter, origin), starterId: starter, title: meta.title });
  return Response.redirect(`${origin}/studio/${game.id}`, 303);
}
