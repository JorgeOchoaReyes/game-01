import { randomBytes } from "node:crypto";
import { SignJWT, decodeJwt, jwtVerify } from "jose";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./firebase";
import { ensureUser, getUser } from "./accounts";
import type { User } from "./schema";
import { streakStatus } from "./streaks";

// Sign-in is Firebase Auth (email + password, Google, guest). The browser signs
// in with the Firebase SDK and trades its ID token at POST /api/auth/session for
// a Firebase session cookie.
//
// Three kinds of token are accepted, as the cookie or as `Authorization: Bearer`:
//   Firebase session cookie   set by /api/auth/session, 14 days.
//   Firebase ID token         what any Firebase client has (user.getIdToken()).
//   frankie (iss polly, aud frankie)  HS256 with FRANKIE_JWT_SECRET, 5 minutes.
//            Minted by POST /api/frankie/token for the Frankie SDK. Frankie
//            forwards it back on every tool call, so the API accepts it too and
//            Frankie acts exactly as the signed-in user.

export const SESSION_COOKIE = "polly_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // Firebase's maximum
const FRANKIE_TTL_SECONDS = 5 * 60;

export class AuthConfigError extends Error {}

function frankieSecret(): Uint8Array | null {
  const value = process.env.FRANKIE_JWT_SECRET;
  return value ? new TextEncoder().encode(value) : null;
}

// ---- tokens ------------------------------------------------------------------

// The token the Frankie SDK exchanges for a Frankie session (see Frankie's docs/auth.md).
export async function signFrankieToken(user: Pick<User, "id" | "name" | "email">): Promise<string> {
  const key = frankieSecret();
  if (!key) throw new AuthConfigError("FRANKIE_JWT_SECRET is not set on the server.");
  return new SignJWT({ name: user.name, ...(user.email ? { email: user.email } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("polly")
    .setAudience("frankie")
    .setIssuedAt()
    .setExpirationTime(`${FRANKIE_TTL_SECONDS}s`)
    .sign(key);
}

// Trades a fresh Firebase ID token for a session cookie value.
export async function createSession(idToken: string): Promise<{ cookie: string; claims: DecodedIdToken }> {
  const claims = await adminAuth().verifyIdToken(idToken);
  const cookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_TTL_SECONDS * 1000 });
  return { cookie, claims };
}

export type Identity = { uid: string; claims?: DecodedIdToken };

// Who a token speaks for, or null if it is not one we accept.
export async function verifyToken(token: string): Promise<Identity | null> {
  let iss: unknown;
  try {
    iss = decodeJwt(token).iss;
  } catch {
    return null;
  }
  try {
    if (iss === "polly") {
      const key = frankieSecret();
      if (!key) return null;
      const { payload } = await jwtVerify(token, key, { issuer: "polly", audience: "frankie", algorithms: ["HS256"] });
      return typeof payload.sub === "string" && payload.sub ? { uid: payload.sub } : null;
    }
    if (typeof iss === "string" && iss.startsWith("https://session.firebase.google.com/")) {
      const claims = await adminAuth().verifySessionCookie(token);
      return { uid: claims.uid, claims };
    }
    const claims = await adminAuth().verifyIdToken(token);
    return { uid: claims.uid, claims };
  } catch {
    return null;
  }
}

// ---- who is calling ----------------------------------------------------------

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function tokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim() || null;
  return readCookie(req.headers.get("cookie"), SESSION_COOKIE);
}

// The user behind a token, looked up fresh so a deleted account stops working at
// once. A Firebase user who has never been here gets their Polly account now.
export async function userFromToken(token: string | null | undefined): Promise<User | null> {
  if (!token) return null;
  const who = await verifyToken(token);
  if (!who) return null;
  const user = await getUser(who.uid);
  if (user) return user;
  return who.claims ? ensureUser(who.claims) : null;
}

export function getRequestUser(req: Request): Promise<User | null> {
  return userFromToken(tokenFromRequest(req));
}

export function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, anonymous: user.anonymous, streak: streakStatus(user), createdAt: user.createdAt.toISOString() };
}

export function sessionCookie(value: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function newId(bytes = 9): string {
  return randomBytes(bytes).toString("base64url");
}
