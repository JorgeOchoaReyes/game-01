import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users, type User } from "./schema";
import { hashPassword, newId, verifyPassword } from "./auth";
import { HttpError, badRequest } from "./http";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: unknown): string {
  if (typeof email !== "string" || !EMAIL.test(email.trim())) throw badRequest("Enter a valid email address.");
  return email.trim().toLowerCase();
}

export async function createAccount(input: { email: unknown; password: unknown; name?: unknown }): Promise<User> {
  const email = normalizeEmail(input.email);
  if (typeof input.password !== "string" || input.password.length < 8) throw badRequest("Use a password of at least 8 characters.");
  if (input.password.length > 200) throw badRequest("That password is too long.");
  const name = typeof input.name === "string" && input.name.trim() ? input.name.trim().slice(0, 60) : email.split("@")[0];
  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw new HttpError(409, "email_taken", "An account with that email already exists. Log in instead.");
  const [user] = await db.insert(users).values({ id: newId(), email, name, passwordHash: await hashPassword(input.password) }).returning();
  return user;
}

// Same answer for "no such email" and "wrong password", so emails can't be probed.
export async function authenticate(input: { email: unknown; password: unknown }): Promise<User> {
  const email = normalizeEmail(input.email);
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const ok = typeof input.password === "string" && user ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!user || !ok) throw new HttpError(401, "invalid_credentials", "Email or password is incorrect.");
  return user;
}
