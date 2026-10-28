import { getRequestUser } from "@/lib/server/auth";
import { setComp } from "@/lib/server/admin";
import { readJson, route } from "@/lib/server/http";

// POST { on: boolean } -> 204. Admins only: give or take back free Pro.
export const POST = route(async (req: Request, ctx: { params: Promise<{ uid: string }> }) => {
  const { uid } = await ctx.params;
  const body = await readJson<{ on?: unknown }>(req);
  await setComp(await getRequestUser(req), uid, body.on === true);
  return new Response(null, { status: 204 });
});
