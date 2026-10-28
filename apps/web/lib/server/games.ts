import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "./firebase";
import { gamesCol, toGame, toGameSummary, toVersion, usersCol, versionsCol, type Game, type GameSummary, type User } from "./schema";
import { newId } from "./auth";
import { badRequest, notFound, HttpError } from "./http";
import { applyEdits, checkGame, codeSummary } from "./code";
import { touchStreak } from "./streaks";
import { assertCanCreate } from "./billing";

export const MAX_HTML_BYTES = 512 * 1024;
export const MAX_TITLE = 80;
const MAX_NOTE = 200;

export type Visibility = "private" | "public";

function cleanTitle(title: unknown, fallback?: string): string {
  if (title === undefined || title === null || title === "") {
    if (fallback) return fallback;
    throw badRequest("title is required.");
  }
  if (typeof title !== "string") throw badRequest("title must be a string.");
  const t = title.trim().slice(0, MAX_TITLE);
  if (!t) throw badRequest("title is required.");
  return t;
}

function cleanHtml(html: unknown): string {
  if (typeof html !== "string" || !html.trim()) throw badRequest("html must be the complete game file as a string.");
  if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) throw badRequest(`html is larger than ${MAX_HTML_BYTES / 1024} KB.`);
  if (!/<(html|body|script|canvas)[\s>]/i.test(html)) throw badRequest("html does not look like a game file (no <html>, <body>, <script> or <canvas>).");
  return html;
}

function cleanVisibility(v: unknown): Visibility {
  if (v === "private" || v === "public") return v;
  throw badRequest('visibility must be "private" or "public".');
}

// The game's <title>, used when a save does not name one.
export function titleFromHtml(html: string): string | undefined {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m?.[1]?.trim() || undefined;
}

export async function createGame(owner: User, input: { title?: unknown; html: unknown; starterId?: string | null }): Promise<Game> {
  if (owner.anonymous) throw new HttpError(403, "account_required", "Make an account to start a new game. Your guest games come with you.");
  await assertCanCreate(owner);
  const html = cleanHtml(input.html);
  const title = cleanTitle(input.title, titleFromHtml(html) || "Untitled game");
  const now = new Date();
  const game: Game = { id: newId(), ownerId: owner.id, title, html, version: 1, visibility: "private", starterId: input.starterId ?? null, plays: 0, createdAt: now, updatedAt: now };
  const { id, ...data } = game;
  const batch = firestore().batch();
  batch.create(gamesCol().doc(id), data);
  batch.create(versionsCol(id).doc("1"), { version: 1, title, html, note: input.starterId ? `Started from ${input.starterId}` : "Created", createdAt: now });
  await batch.commit();
  await touchStreak(owner.id).catch(() => null);
  return game;
}

export async function findGame(id: string): Promise<Game | null> {
  // a "/" would make the id a path to some other document
  if (!id || id.includes("/")) return null;
  return toGame(await gamesCol().doc(id).get());
}

// Owners see everything; anyone may read a public game.
export async function getReadableGame(id: string, viewer: User | null): Promise<Game> {
  const game = await findGame(id);
  if (!game || (game.visibility !== "public" && game.ownerId !== viewer?.id && !viewer?.admin)) throw notFound("No such game.");
  return game;
}

export async function getOwnedGame(id: string, owner: User): Promise<Game> {
  const game = await findGame(id);
  // 404 rather than 403 so ids of other people's private games are not confirmed.
  // Admins may change anyone's game.
  if (!game || (game.ownerId !== owner.id && !owner.admin)) throw notFound("No such game in your account.");
  return game;
}

// Lists leave the code out: a game can be hundreds of KB.
const SUMMARY_FIELDS = ["ownerId", "title", "version", "visibility", "starterId", "plays", "createdAt", "updatedAt"];

export async function listGames(owner: User): Promise<GameSummary[]> {
  const snap = await gamesCol().where("ownerId", "==", owner.id).orderBy("updatedAt", "desc").select(...SUMMARY_FIELDS).get();
  return snap.docs.map((d) => toGameSummary(d)!);
}

export type PublicGame = GameSummary & { ownerName: string };

// Public games, newest first or most played first.
export async function listPublicGames(limit = 24, sort: "new" | "popular" = "new"): Promise<PublicGame[]> {
  const order = sort === "popular" ? "plays" : "updatedAt";
  const snap = await gamesCol().where("visibility", "==", "public").orderBy(order, "desc").limit(limit).select(...SUMMARY_FIELDS).get();
  const games = snap.docs.map((d) => toGameSummary(d)!);
  const ownerIds = [...new Set(games.map((g) => g.ownerId))];
  const owners = ownerIds.length ? await firestore().getAll(...ownerIds.map((id) => usersCol().doc(id)), { fieldMask: ["name"] }) : [];
  const names = new Map(owners.filter((o) => o.exists).map((o) => [o.id, String(o.get("name") ?? "someone")]));
  return games.filter((g) => names.has(g.ownerId)).map((g) => ({ ...g, ownerName: names.get(g.ownerId)! }));
}

export async function ownerName(game: Pick<Game, "ownerId">): Promise<string> {
  const owner = await usersCol().doc(game.ownerId).get();
  return String(owner.get("name") ?? "someone");
}

// Counts a press of Play on a public game, except by its owner.
export async function recordPlay(id: string, viewer: User | null): Promise<void> {
  const game = await findGame(id);
  if (!game || game.visibility !== "public" || game.ownerId === viewer?.id) return;
  await gamesCol().doc(id).update({ plays: FieldValue.increment(1) });
}

export type GameUpdate = { title?: unknown; html?: unknown; visibility?: unknown; note?: unknown; baseVersion?: unknown };

export type SavedGame = { game: Game; warnings: string[] };

// Saving new html makes a new version; title/visibility-only changes do not.
// New html is checked first: a syntax error is refused, other problems come back as warnings.
export async function saveGame(id: string, owner: User, input: GameUpdate): Promise<SavedGame> {
  const html = input.html !== undefined ? cleanHtml(input.html) : undefined;
  if (html !== undefined && typeof input.baseVersion !== "number") {
    throw badRequest("baseVersion is required when sending html: the version you read, so a newer save is never overwritten.");
  }
  const warnings = html !== undefined ? checkGame(html).warnings : [];
  return { game: await updateGame(id, owner, input), warnings };
}

export async function updateGame(id: string, owner: User, input: GameUpdate): Promise<Game> {
  if (!id || id.includes("/")) throw notFound("No such game in your account.");
  const html = input.html !== undefined ? cleanHtml(input.html) : undefined;
  const ref = gamesCol().doc(id);
  // the transaction re-runs if the game changes underneath it, so two saves never share a version
  const saved = await firestore().runTransaction(async (tx) => {
    const current = toGame(await tx.get(ref));
    if (!current || (current.ownerId !== owner.id && !owner.admin)) throw notFound("No such game in your account.");
    if (input.baseVersion !== undefined && input.baseVersion !== current.version) {
      throw new HttpError(409, "version_conflict", `The game is at version ${current.version}, not ${String(input.baseVersion)}. Read it again and reapply your change.`);
    }
    const title = input.title !== undefined ? cleanTitle(input.title) : html ? titleFromHtml(html) ?? current.title : current.title;
    const visibility = input.visibility !== undefined ? cleanVisibility(input.visibility) : current.visibility;
    const note = typeof input.note === "string" ? input.note.slice(0, MAX_NOTE) : null;
    const newContent = html !== undefined && html !== current.html;
    const version = newContent ? current.version + 1 : current.version;
    const game: Game = { ...current, title, visibility, html: html ?? current.html, version, updatedAt: new Date() };
    tx.update(ref, { title, visibility, html: game.html, version, updatedAt: game.updatedAt });
    if (newContent) tx.create(versionsCol(id).doc(String(version)), { version, title, html: game.html, note, createdAt: game.updatedAt });
    return game;
  });
  // building something counts toward the day's streak
  if (html !== undefined) await touchStreak(owner.id).catch(() => null);
  return saved;
}

// Exact find/replace edits against the version the caller read.
export async function editGame(id: string, owner: User, input: { baseVersion?: unknown; edits?: unknown; note?: unknown }) {
  if (typeof input.baseVersion !== "number") throw badRequest("baseVersion is required: the version you read with getGame or readGameCode.");
  const current = await getOwnedGame(id, owner);
  if (input.baseVersion !== current.version) {
    throw new HttpError(409, "version_conflict", `The game is at version ${current.version}, not ${input.baseVersion}. Re-read the lines you are changing, then send the edits again with baseVersion ${current.version}.`);
  }
  const { html, changed } = applyEdits(current.html, input.edits);
  if (html === current.html) throw badRequest("These edits change nothing: every replace equals its find.");
  const { warnings } = checkGame(cleanHtml(html));
  const note = typeof input.note === "string" ? input.note : `${changed.length} edit${changed.length === 1 ? "" : "s"}`;
  const game = await updateGame(id, owner, { html, note, baseVersion: current.version });
  return { game, changed, warnings };
}

export async function deleteGame(id: string, owner: User): Promise<void> {
  await getOwnedGame(id, owner);
  // the game and its versions subcollection
  await firestore().recursiveDelete(gamesCol().doc(id));
}

export async function listVersions(id: string, owner: User) {
  await getOwnedGame(id, owner);
  const snap = await versionsCol(id).orderBy("version", "desc").select("version", "title", "note", "createdAt").get();
  return snap.docs.map((d) => {
    const { version, title, note, createdAt } = toVersion(id, d)!;
    return { version, title, note, createdAt };
  });
}

// Restoring copies an old version forward as the newest one, so history only grows.
export async function restoreVersion(id: string, owner: User, version: number): Promise<Game> {
  await getOwnedGame(id, owner);
  const old = toVersion(id, await versionsCol(id).doc(String(version)).get());
  if (!old) throw notFound(`Version ${version} does not exist.`);
  return updateGame(id, owner, { html: old.html, title: old.title, note: `Restored version ${version}` });
}

export function gameJson(game: GameSummary & { html?: string }, origin: string, opts: { includeHtml?: boolean; includeOutline?: boolean } = {}) {
  return {
    id: game.id,
    title: game.title,
    version: game.version,
    visibility: game.visibility,
    starterId: game.starterId,
    ownerId: game.ownerId,
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
    studioUrl: `${origin}/studio/${game.id}`,
    playUrl: `${origin}/g/${game.id}`,
    downloadUrl: `${origin}/api/v1/games/${game.id}/download`,
    ...(opts.includeOutline && game.html !== undefined ? codeSummary(game.html) : {}),
    ...(opts.includeHtml && game.html !== undefined ? { html: game.html } : {}),
  };
}
