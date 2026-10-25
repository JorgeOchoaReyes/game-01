import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { firestore } from "./firebase";

// Firestore layout:
//   users/{uid}                     a Polly account (uid = Firebase Auth uid)
//   games/{gameId}                  the current version of a game
//   games/{gameId}/versions/{n}     every saved version, so a bad edit is one restore away
//
// Only the server reads and writes these (firestore.rules denies clients), so
// every change goes through the API's checks.

export type User = {
  id: string;
  email: string | null;
  name: string;
  anonymous: boolean;
  createdAt: Date;
};

export type Game = {
  id: string;
  ownerId: string;
  title: string;
  html: string;
  version: number;
  visibility: "private" | "public";
  starterId: string | null;
  // times someone other than the owner pressed Play on its public page
  plays: number;
  createdAt: Date;
  updatedAt: Date;
};

// A game without its code, for lists.
export type GameSummary = Omit<Game, "html">;

export type GameVersion = {
  gameId: string;
  version: number;
  title: string;
  html: string;
  note: string | null;
  createdAt: Date;
};

export const usersCol = () => firestore().collection("users");
export const gamesCol = () => firestore().collection("games");
export const versionsCol = (gameId: string) => gamesCol().doc(gameId).collection("versions");

const date = (v: unknown): Date => (v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date(0));

export function toUser(snap: DocumentSnapshot): User | null {
  const d = snap.data();
  if (!d) return null;
  return { id: snap.id, email: d.email ?? null, name: d.name, anonymous: !!d.anonymous, createdAt: date(d.createdAt) };
}

export function toGame(snap: DocumentSnapshot): Game | null {
  const d = snap.data();
  if (!d) return null;
  return {
    id: snap.id,
    ownerId: d.ownerId,
    title: d.title,
    html: d.html,
    version: d.version,
    visibility: d.visibility,
    starterId: d.starterId ?? null,
    plays: d.plays ?? 0,
    createdAt: date(d.createdAt),
    updatedAt: date(d.updatedAt),
  };
}

export function toGameSummary(snap: DocumentSnapshot): GameSummary | null {
  const g = toGame(snap);
  if (!g) return null;
  const { html: _html, ...rest } = g;
  return rest;
}

export function toVersion(gameId: string, snap: DocumentSnapshot): GameVersion | null {
  const d = snap.data();
  if (!d) return null;
  return { gameId, version: d.version, title: d.title, html: d.html, note: d.note ?? null, createdAt: date(d.createdAt) };
}
