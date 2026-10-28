import { firestore } from "./firebase";
import type { User } from "./schema";

// What people do, for the admin activity feed: one small document per action
// in `events`. Logging never fails the action it records.

export type EventType =
  | "signup"
  | "game.create"
  | "game.save"
  | "game.rename"
  | "game.publish"
  | "game.unpublish"
  | "game.restore"
  | "game.delete"
  | "game.play"
  | "game.report"
  | "voice.narrate"
  | "billing.checkout"
  | "billing.subscription";

export type ActivityEvent = {
  id: string;
  type: EventType;
  // who did it (null: someone signed out), and whose game it was
  uid: string | null;
  ownerId: string | null;
  gameId: string | null;
  title: string | null;
  detail: string | null;
  // "frankie" when the change came through Frankie's tool calls
  via: string | null;
  at: Date;
};

export const eventsCol = () => firestore().collection("events");

export async function logEvent(
  type: EventType,
  actor: Pick<User, "id" | "agent"> | string | null,
  data: { ownerId?: string | null; gameId?: string | null; title?: string | null; detail?: string | null } = {},
): Promise<void> {
  const uid = typeof actor === "string" ? actor : actor?.id ?? null;
  const via = typeof actor === "object" && actor?.agent ? "frankie" : null;
  await eventsCol()
    .add({ type, uid, ownerId: data.ownerId ?? null, gameId: data.gameId ?? null, title: data.title ?? null, detail: data.detail?.slice(0, 200) ?? null, via, at: new Date() })
    .catch(() => null);
}

function toEvent(d: FirebaseFirestore.QueryDocumentSnapshot): ActivityEvent {
  const e = d.data();
  return { id: d.id, type: e.type, uid: e.uid, ownerId: e.ownerId, gameId: e.gameId, title: e.title, detail: e.detail, via: e.via, at: e.at.toDate() };
}

export async function recentEvents(limit = 100, uid?: string): Promise<ActivityEvent[]> {
  const q = uid ? eventsCol().where("uid", "==", uid) : eventsCol();
  return (await q.orderBy("at", "desc").limit(limit).get()).docs.map(toEvent);
}
