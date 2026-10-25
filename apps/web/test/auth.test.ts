import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { signFrankieToken, tokenFromRequest, verifyToken } from "@/lib/server/auth";
import { createGame, listGames } from "@/lib/server/games";
import { getUser } from "@/lib/server/accounts";
import * as sessionRoute from "@/app/api/auth/session/route";
import * as meRoute from "@/app/api/auth/me/route";
import { signInAsGuest, signInWithEmail, signUpWithEmail } from "./firebase-helpers";

const ORIGIN = "http://polly.test";
const html = `<!DOCTYPE html><html><head><title>Guest Game</title></head><body><script>var x=1;</script></body></html>`;

function startSession(idToken: string, extra: { cookie?: string; name?: string } = {}) {
  return sessionRoute.POST(new Request(`${ORIGIN}/api/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(extra.cookie ? { cookie: extra.cookie } : {}) },
    body: JSON.stringify({ idToken, name: extra.name }),
  }));
}

const cookieOf = (res: Response) => res.headers.get("set-cookie")!.split(";")[0];

describe("sessions", () => {
  it("trades a Firebase ID token for a session cookie that /me accepts", async () => {
    const email = `Ada${Date.now()}@Example.com`;
    const { idToken } = await signUpWithEmail(email);
    const res = await startSession(idToken, { name: "Ada" });
    expect(res.status).toBe(200);
    const { user } = await res.json();
    expect(user).toMatchObject({ name: "Ada", anonymous: false });
    expect(user.email).toBe(email.toLowerCase());

    // signing in again later finds the same account
    const again = await startSession((await signInWithEmail(email)).idToken);
    expect((await again.json()).user.id).toBe(user.id);

    const cookie = cookieOf(res);
    expect(cookie.startsWith("polly_session=")).toBe(true);
    const me = await meRoute.GET(new Request(`${ORIGIN}/api/auth/me`, { headers: { cookie } }));
    expect((await me.json()).user.id).toBe(user.id);

    // the ID token itself works as a Bearer token too
    const bearer = await meRoute.GET(new Request(`${ORIGIN}/api/auth/me`, { headers: { authorization: `Bearer ${idToken}` } }));
    expect(bearer.status).toBe(200);
  });

  it("refuses garbage instead of an ID token", async () => {
    expect((await startSession("not-a-token")).status).toBe(401);
    expect((await meRoute.GET(new Request(`${ORIGIN}/api/auth/me`, { headers: { cookie: "polly_session=nope" } }))).status).toBe(401);
  });

  it("brings a guest's games along when they sign up", async () => {
    const guest = await signInAsGuest();
    const guestRes = await startSession(guest.idToken);
    const guestUser = (await guestRes.json()).user;
    expect(guestUser).toMatchObject({ anonymous: true, name: "Guest", email: null });
    const made = await createGame((await getUser(guestUser.id))!, { html });

    const real = await signUpWithEmail();
    const res = await startSession(real.idToken, { cookie: cookieOf(guestRes), name: "Grace" });
    const user = (await res.json()).user;
    expect(user.id).not.toBe(guestUser.id);
    expect((await listGames((await getUser(user.id))!)).map((g) => g.id)).toEqual([made.id]);
    expect(await getUser(guestUser.id)).toBeNull();
  });

  it("never moves a real account's games to whoever signs in next", async () => {
    const a = await signUpWithEmail();
    const aRes = await startSession(a.idToken);
    const aUser = (await getUser((await aRes.json()).user.id))!;
    await createGame(aUser, { html });

    const b = await signUpWithEmail();
    await startSession(b.idToken, { cookie: cookieOf(aRes) });
    expect((await listGames(aUser)).length).toBe(1);
  });
});

describe("Frankie tokens", () => {
  const user = { id: "u_1", name: "Ada", email: "ada@example.com" };

  it("accepts the Frankie tokens Frankie forwards back", async () => {
    expect((await verifyToken(await signFrankieToken(user)))?.uid).toBe("u_1");
  });

  it("rejects tampered tokens, wrong audiences and foreign secrets", async () => {
    const good = await signFrankieToken(user);
    expect(await verifyToken(good.slice(0, -2) + "xx")).toBeNull();
    const wrongAud = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("u_1").setIssuer("polly").setAudience("someone-else").setExpirationTime("5m").sign(new TextEncoder().encode(process.env.FRANKIE_JWT_SECRET!));
    expect(await verifyToken(wrongAud)).toBeNull();
    const foreign = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("u_1").setIssuer("polly").setAudience("frankie").setExpirationTime("5m").sign(new TextEncoder().encode("not-our-secret-not-our-secret-not-our-secret"));
    expect(await verifyToken(foreign)).toBeNull();
  });

  it("reads Bearer first, then the session cookie", () => {
    expect(tokenFromRequest(new Request("http://x", { headers: { authorization: "Bearer abc" } }))).toBe("abc");
    expect(tokenFromRequest(new Request("http://x", { headers: { cookie: "a=1; polly_session=def" } }))).toBe("def");
    expect(tokenFromRequest(new Request("http://x"))).toBeNull();
  });
});
