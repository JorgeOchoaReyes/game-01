import { firestore } from "./firebase";
import { gamesCol, toGameSummary, toUser, usersCol, type GameSummary, type User } from "./schema";
import { HttpError } from "./http";
import { isPro, type Billing } from "./billing";

// What the /admin page shows and does. Every function checks the caller.

export function assertAdmin(user: User | null): asserts user is User {
  if (!user?.admin) throw new HttpError(403, "admin_only", "Only admins can do that.");
}

export type AdminUser = { id: string; name: string; email: string | null; createdAt: Date; pro: boolean; comp: boolean; status: string | null };
export type AdminGame = GameSummary & { ownerName: string };

export async function recentUsers(admin: User | null, limit = 50): Promise<AdminUser[]> {
  assertAdmin(admin);
  const snap = await usersCol().orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => {
    const u = toUser(d)!;
    const billing = d.get("billing") as Billing | undefined;
    return { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, pro: isPro(billing), comp: !!billing?.comp, status: billing?.status ?? null };
  });
}

export async function recentGames(admin: User | null, limit = 50): Promise<AdminGame[]> {
  assertAdmin(admin);
  const snap = await gamesCol().orderBy("updatedAt", "desc").limit(limit).select("ownerId", "title", "version", "visibility", "starterId", "plays", "createdAt", "updatedAt").get();
  const games = snap.docs.map((d) => toGameSummary(d)!);
  const ids = [...new Set(games.map((g) => g.ownerId))];
  const owners = ids.length ? await firestore().getAll(...ids.map((id) => usersCol().doc(id)), { fieldMask: ["name"] }) : [];
  const names = new Map(owners.map((o) => [o.id, String(o.get("name") ?? "deleted")]));
  return games.map((g) => ({ ...g, ownerName: names.get(g.ownerId) ?? "deleted" }));
}

// Pro with no subscription, for friends, testers and support.
export async function setComp(admin: User | null, uid: string, on: boolean): Promise<void> {
  assertAdmin(admin);
  const ref = usersCol().doc(uid);
  if (!(await ref.get()).exists) throw new HttpError(404, "not_found", "No such user.");
  await ref.set({ billing: { comp: on } }, { merge: true });
}
