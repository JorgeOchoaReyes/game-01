import { firestore } from "./firebase";
import { toUser, usersCol, type Streak, type User } from "./schema";

// A daily streak: days in a row the user played or built something, counted in
// their own timezone (sent by the browser at sign-in) so midnight is theirs.

function zone(tz: string | null | undefined): string {
  try {
    if (tz) new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz || "UTC";
  } catch {
    return "UTC";
  }
}

// "2026-10-25" for that moment in that timezone.
export function localDay(tz: string | null | undefined, at = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone(tz), year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

export function dayBefore(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// The streak after activity on `today`.
export function advance(streak: Streak | null, today: string): Streak {
  if (streak?.day === today) return streak;
  const count = streak?.day === dayBefore(today) ? streak.count + 1 : 1;
  return { count, best: Math.max(count, streak?.best ?? 0), day: today };
}

// Counts today for this user. Safe to call on every play and save.
export async function touchStreak(uid: string, at = new Date()): Promise<Streak | null> {
  const ref = usersCol().doc(uid);
  return firestore().runTransaction(async (tx) => {
    const user = toUser(await tx.get(ref));
    if (!user) return null;
    const next = advance(user.streak, localDay(user.tz, at));
    if (next !== user.streak) tx.update(ref, { streak: next });
    return next;
  });
}

// What to show: the running count (0 once a day was missed) and whether today is done.
export function streakStatus(user: Pick<User, "streak" | "tz">, at = new Date()) {
  const today = localDay(user.tz, at);
  const s = user.streak;
  const alive = !!s && (s.day === today || s.day === dayBefore(today));
  return { count: alive ? s!.count : 0, best: s?.best ?? 0, doneToday: s?.day === today };
}
