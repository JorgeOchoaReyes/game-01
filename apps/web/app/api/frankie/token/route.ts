import { AuthConfigError, getRequestUser, signFrankieToken } from "@/lib/server/auth";
import { HttpError, route } from "@/lib/server/http";

// The Frankie SDK's getUserToken calls this. It answers { token: null } when
// nobody is signed in (Frankie's documented "not signed in" reply), else a
// 5-minute JWT signed with FRANKIE_JWT_SECRET that Frankie exchanges for its own
// session and forwards back to /api/v1 as the user.
export const POST = route(async (req: Request) => {
  const user = await getRequestUser(req);
  if (!user) return Response.json({ token: null });
  try {
    return Response.json({ token: await signFrankieToken(user) }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof AuthConfigError) throw new HttpError(503, "frankie_not_configured", err.message);
    throw err;
  }
});
