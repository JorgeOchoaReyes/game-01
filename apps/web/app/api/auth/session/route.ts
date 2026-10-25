import { createSession, publicUser, sessionCookie, tokenFromRequest, verifyToken } from "@/lib/server/auth";
import { adoptGuest, ensureUser } from "@/lib/server/accounts";
import { HttpError, badRequest, clientIp, rateLimit, readJson, route } from "@/lib/server/http";

// Only a sign-in from the last few minutes may start a session, so an old,
// leaked ID token cannot be turned into a 14-day cookie.
const RECENT_SIGN_IN_SECONDS = 5 * 60;

// POST { idToken, name?, tz? } -> { user } and sets the session cookie.
// The browser signs in with the Firebase SDK (email or Google) and sends the ID
// token here. Making games needs an account, so guest (anonymous) sign-ins are
// refused; someone who was a guest before brings their games when they sign in.
export const POST = route(async (req: Request) => {
  rateLimit(`session:${clientIp(req)}`, 30, 15 * 60 * 1000);
  const body = await readJson<{ idToken?: unknown; name?: unknown; tz?: unknown }>(req);
  if (typeof body.idToken !== "string" || !body.idToken) throw badRequest("idToken is required: the Firebase ID token from user.getIdToken().");

  const before = await verifyToken(tokenFromRequest(req) ?? "").catch(() => null);
  let session: Awaited<ReturnType<typeof createSession>>;
  try {
    session = await createSession(body.idToken);
  } catch {
    throw new HttpError(401, "invalid_token", "That sign-in didn't work. Try again.");
  }
  if (session.claims.firebase?.sign_in_provider === "anonymous") {
    throw new HttpError(403, "account_required", "Make an account (or log in) to start making games.");
  }
  if (Date.now() / 1000 - session.claims.auth_time > RECENT_SIGN_IN_SECONDS) {
    throw new HttpError(401, "stale_sign_in", "Sign in again to continue.");
  }

  const user = await ensureUser(session.claims, { name: body.name, tz: body.tz });
  if (before && before.uid !== user.id) await adoptGuest(before.uid, user);
  return Response.json({ user: publicUser(user) }, { headers: { "set-cookie": sessionCookie(session.cookie), "cache-control": "no-store" } });
});
