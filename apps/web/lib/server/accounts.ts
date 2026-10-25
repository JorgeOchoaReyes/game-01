import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, firestore } from "./firebase";
import { gamesCol, toUser, usersCol, type User } from "./schema";

const MAX_NAME = 60;

export async function getUser(uid: string): Promise<User | null> {
  return toUser(await usersCol().doc(uid).get());
}

function cleanName(name: unknown): string | null {
  return typeof name === "string" && name.trim() ? name.trim().slice(0, MAX_NAME) : null;
}

// The Polly account for a signed-in Firebase user, made on first sight. A guest
// who later links an email or Google account keeps the same uid, so the
// account is upgraded in place.
export async function ensureUser(claims: DecodedIdToken, input: { name?: unknown } = {}): Promise<User> {
  const ref = usersCol().doc(claims.uid);
  const anonymous = claims.firebase?.sign_in_provider === "anonymous";
  const email = claims.email ? claims.email.toLowerCase() : null;
  const name = cleanName(input.name) ?? cleanName(claims.name) ?? (email ? email.split("@")[0] : "Guest");
  return firestore().runTransaction(async (tx) => {
    const existing = toUser(await tx.get(ref));
    if (!existing) {
      const user: User = { id: claims.uid, email, name, anonymous, createdAt: new Date() };
      tx.set(ref, { email, name, anonymous, createdAt: user.createdAt });
      return user;
    }
    if (existing.anonymous && !anonymous) {
      const upgraded = { ...existing, email, name, anonymous: false };
      tx.update(ref, { email, name, anonymous: false });
      return upgraded;
    }
    return existing;
  });
}

// A guest signed in to a different, real account: their games move over and
// the guest account is removed, so nothing made as a guest is lost.
export async function adoptGuest(guestUid: string, into: User): Promise<number> {
  if (guestUid === into.id) return 0;
  const guest = await getUser(guestUid);
  if (!guest?.anonymous) return 0;
  const owned = await gamesCol().where("ownerId", "==", guestUid).select().get();
  const writer = firestore().bulkWriter();
  for (const doc of owned.docs) writer.update(doc.ref, { ownerId: into.id });
  writer.delete(usersCol().doc(guestUid));
  await writer.close();
  await adminAuth().deleteUser(guestUid).catch(() => { /* already gone */ });
  return owned.size;
}
