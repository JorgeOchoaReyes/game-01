import { firestore } from "./firebase";
import { gamesCol, toGameSummary, toUser, usersCol, type GameSummary, type User } from "./schema";
import { HttpError } from "./http";
import { isPro, type Billing } from "./billing";
import { eventsCol, recentEvents, type ActivityEvent } from "./activity";

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

// ---- activity ------------------------------------------------------------------

export type FeedItem = ActivityEvent & { who: string | null; ownerName: string | null };

async function namesFor(uids: (string | null)[]): Promise<Map<string, string>> {
  const ids = [...new Set(uids.filter((u): u is string => !!u))];
  const docs = ids.length ? await firestore().getAll(...ids.map((id) => usersCol().doc(id)), { fieldMask: ["name"] }) : [];
  return new Map(docs.map((d) => [d.id, String(d.get("name") ?? "deleted")]));
}

export async function activity(admin: User | null, opts: { uid?: string; limit?: number } = {}): Promise<FeedItem[]> {
  assertAdmin(admin);
  const events = await recentEvents(opts.limit ?? 100, opts.uid);
  const names = await namesFor(events.flatMap((e) => [e.uid, e.ownerId]));
  return events.map((e) => ({ ...e, who: e.uid ? names.get(e.uid) ?? "deleted" : null, ownerName: e.ownerId ? names.get(e.ownerId) ?? null : null }));
}

export type Stats = { users: number; games: number; pro: number; last24h: { signups: number; created: number; saves: number; plays: number } };

export async function stats(admin: User | null): Promise<Stats> {
  assertAdmin(admin);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = (q: FirebaseFirestore.Query) => q.count().get().then((s) => s.data().count);
  const recent = (type: string) => count(eventsCol().where("type", "==", type).where("at", ">=", since));
  const [users, games, pro, signups, created, saves, plays] = await Promise.all([
    count(usersCol()),
    count(gamesCol()),
    count(usersCol().where("billing.status", "in", ["active", "trialing", "past_due"])),
    recent("signup"),
    recent("game.create"),
    recent("game.save"),
    recent("game.play"),
  ]);
  return { users, games, pro, last24h: { signups, created, saves, plays } };
}

// One person: their account, plan and games, for /admin/users/<uid>.
export async function person(admin: User | null, uid: string) {
  assertAdmin(admin);
  const doc = await usersCol().doc(uid).get();
  const user = toUser(doc);
  if (!user) return null;
  const billing = doc.get("billing") as Billing | undefined;
  const games = (await gamesCol().where("ownerId", "==", uid).orderBy("updatedAt", "desc").select("ownerId", "title", "version", "visibility", "starterId", "plays", "createdAt", "updatedAt").get()).docs.map((d) => toGameSummary(d)!);
  return { user, billing: billing ?? null, pro: isPro(billing), comp: !!billing?.comp, games };
}
