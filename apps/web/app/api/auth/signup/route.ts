import { publicUser, sessionCookie, signSessionToken } from "@/lib/server/auth";
import { createAccount } from "@/lib/server/accounts";
import { clientIp, rateLimit, readJson, route } from "@/lib/server/http";

// POST { email, password, name? } -> { user, token } and sets the session cookie.
export const POST = route(async (req: Request) => {
  rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60 * 1000);
  const user = await createAccount(await readJson(req));
  const token = await signSessionToken(user);
  return Response.json({ user: publicUser(user), token }, { status: 201, headers: { "set-cookie": sessionCookie(token) } });
});
