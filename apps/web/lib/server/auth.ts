import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { getDb } from "./db";
import { users, type User } from "./schema";

// Polly's own accounts: email + password, scrypt hashes, HS256 JWTs.
//
// Two kinds of token:
//   session  (iss polly, aud polly)    signed with POLLY_AUTH_SECRET. Lives in the
//            httpOnly cookie for the site, and is returned at login so any client
//            can send it as `Authorization: Bearer`.
//   frankie  (iss polly, aud frankie)  signed with FRANKIE_JWT_SECRET, 5 minutes.
//            Minted by POST /api/frankie/token for the Frankie SDK. Frankie
//            forwards it back on every tool call, so the API accepts it too and
//            Frankie acts exactly as the signed-in user.

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "polly_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const FRANKIE_TTL_SECONDS = 5 * 60;
const DEV_SECRET = "polly-dev-only-secret-change-me-polly-dev-only-secret";

function secret(name: "POLLY_AUTH_SECRET" | "FRANKIE_JWT_SECRET"): Uint8Array | null {
  const value = process.env[name];
  if (value) return new TextEncoder().encode(value);
  if (name === "POLLY_AUTH_SECRET" && process.env.NODE_ENV !== "production") return new TextEncoder().encode(DEV_SECRET);
  return null;
}

function requireSecret(name: "POLLY_AUTH_SECRET" | "FRANKIE_JWT_SECRET"): Uint8Array {
  const key = secret(name);
  if (!key) throw new AuthConfigError(`${name} is not set on the server.`);
  return key;
}

export class AuthConfigError extends Error {}

// ---- passwords ---------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, saltB64, hashB64] = stored.split("$");
  if (kind !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

// ---- tokens ------------------------------------------------------------------

export async function signSessionToken(user: Pick<User, "id">): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("polly")
    .setAudience("polly")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(requireSecret("POLLY_AUTH_SECRET"));
}

// The token the Frankie SDK exchanges for a Frankie session (see Frankie's docs/auth.md).
export async function signFrankieToken(user: Pick<User, "id" | "name" | "email">): Promise<string> {
  return new SignJWT({ name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("polly")
    .setAudience("frankie")
    .setIssuedAt()
    .setExpirationTime(`${FRANKIE_TTL_SECONDS}s`)
    .sign(requireSecret("FRANKIE_JWT_SECRET"));
}

// Returns the user id a token speaks for, or null if it is not a valid Polly token.
export async function verifyToken(token: string): Promise<string | null> {
  const candidates: [Uint8Array | null, string][] = [
    [secret("POLLY_AUTH_SECRET"), "polly"],
    [secret("FRANKIE_JWT_SECRET"), "frankie"],
  ];
  for (const [key, audience] of candidates) {
    if (!key) continue;
    try {
      const { payload } = await jwtVerify(token, key, { issuer: "polly", audience, algorithms: ["HS256"] });
      if (typeof payload.sub === "string" && payload.sub) return payload.sub;
    } catch {
      /* try the next kind */
    }
  }
  return null;
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

// The user behind a token, looked up fresh so a deleted account stops working at once.
export async function userFromToken(token: string | null | undefined): Promise<User | null> {
  if (!token) return null;
  const id = await verifyToken(token);
  if (!id) return null;
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export function getRequestUser(req: Request): Promise<User | null> {
  return userFromToken(tokenFromRequest(req));
}

export function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt.toISOString() };
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function newId(bytes = 9): string {
  return randomBytes(bytes).toString("base64url");
}
