import { publicUser, sessionCookie, signSessionToken } from "@/lib/server/auth";
import { authenticate } from "@/lib/server/accounts";
import { clientIp, rateLimit, readJson, route } from "@/lib/server/http";

// POST { email, password } -> { user, token } and sets the session cookie.
// `token` is a Bearer token for clients that don't use cookies.
export const POST = route(async (req: Request) => {
  rateLimit(`login:${clientIp(req)}`, 20, 15 * 60 * 1000);
  const user = await authenticate(await readJson(req));
  const token = await signSessionToken(user);
  return Response.json({ user: publicUser(user), token }, { headers: { "set-cookie": sessionCookie(token) } });
});
