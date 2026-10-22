import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { gameVersions, games, users, type Game, type User } from "./schema";
import { newId } from "./auth";
import { badRequest, notFound, HttpError } from "./http";

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
  const html = cleanHtml(input.html);
  const title = cleanTitle(input.title, titleFromHtml(html) || "Untitled game");
  const db = await getDb();
  const id = newId();
  return db.transaction(async (tx) => {
    const [game] = await tx.insert(games).values({ id, ownerId: owner.id, title, html, starterId: input.starterId ?? null }).returning();
    await tx.insert(gameVersions).values({ gameId: id, version: 1, title, html, note: input.starterId ? `Started from ${input.starterId}` : "Created" });
    return game;
  });
}

export async function findGame(id: string): Promise<Game | null> {
  const db = await getDb();
  const [game] = await db.select().from(games).where(eq(games.id, id)).limit(1);
  return game ?? null;
}

// Owners see everything; anyone may read a public game.
export async function getReadableGame(id: string, viewer: User | null): Promise<Game> {
  const game = await findGame(id);
  if (!game || (game.visibility !== "public" && game.ownerId !== viewer?.id)) throw notFound("No such game.");
  return game;
}

export async function getOwnedGame(id: string, owner: User): Promise<Game> {
  const game = await findGame(id);
  // 404 rather than 403 so ids of other people's private games are not confirmed
  if (!game || game.ownerId !== owner.id) throw notFound("No such game in your account.");
  return game;
}

export async function listGames(owner: User): Promise<Game[]> {
  const db = await getDb();
  return db.select().from(games).where(eq(games.ownerId, owner.id)).orderBy(desc(games.updatedAt));
}

export async function listPublicGames(limit = 24): Promise<(Game & { ownerName: string })[]> {
  const db = await getDb();
  const rows = await db
    .select({ game: games, ownerName: users.name })
    .from(games)
    .innerJoin(users, eq(users.id, games.ownerId))
    .where(eq(games.visibility, "public"))
    .orderBy(desc(games.updatedAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.game, ownerName: r.ownerName }));
}

export type GameUpdate = { title?: unknown; html?: unknown; visibility?: unknown; note?: unknown; baseVersion?: unknown };

// Saving new html makes a new version; title/visibility-only changes do not.
export async function updateGame(id: string, owner: User, input: GameUpdate): Promise<Game> {
  const current = await getOwnedGame(id, owner);
  if (input.baseVersion !== undefined && input.baseVersion !== current.version) {
    throw new HttpError(409, "version_conflict", `The game is at version ${current.version}, not ${String(input.baseVersion)}. Read it again and reapply your change.`);
  }
  const html = input.html !== undefined ? cleanHtml(input.html) : undefined;
  const title = input.title !== undefined ? cleanTitle(input.title) : html ? titleFromHtml(html) ?? current.title : current.title;
  const visibility = input.visibility !== undefined ? cleanVisibility(input.visibility) : current.visibility;
  const note = typeof input.note === "string" ? input.note.slice(0, MAX_NOTE) : null;
  const newContent = html !== undefined && html !== current.html;

  const db = await getDb();
  return db.transaction(async (tx) => {
    const version = newContent ? current.version + 1 : current.version;
    const [game] = await tx
      .update(games)
      .set({ title, visibility, html: html ?? current.html, version, updatedAt: sql`now()` })
      .where(and(eq(games.id, id), eq(games.version, current.version)))
      .returning();
    if (!game) throw new HttpError(409, "version_conflict", "The game changed while saving. Read it again and retry.");
    if (newContent) await tx.insert(gameVersions).values({ gameId: id, version, title, html: game.html, note });
    return game;
  });
}

export async function deleteGame(id: string, owner: User): Promise<void> {
  await getOwnedGame(id, owner);
  const db = await getDb();
  await db.delete(games).where(eq(games.id, id));
}

export async function listVersions(id: string, owner: User) {
  await getOwnedGame(id, owner);
  const db = await getDb();
  return db
    .select({ version: gameVersions.version, title: gameVersions.title, note: gameVersions.note, createdAt: gameVersions.createdAt })
    .from(gameVersions)
    .where(eq(gameVersions.gameId, id))
    .orderBy(desc(gameVersions.version));
}

// Restoring copies an old version forward as the newest one, so history only grows.
export async function restoreVersion(id: string, owner: User, version: number): Promise<Game> {
  await getOwnedGame(id, owner);
  const db = await getDb();
  const [old] = await db.select().from(gameVersions).where(and(eq(gameVersions.gameId, id), eq(gameVersions.version, version))).limit(1);
  if (!old) throw notFound(`Version ${version} does not exist.`);
  return updateGame(id, owner, { html: old.html, title: old.title, note: `Restored version ${version}` });
}

export function gameJson(game: Game, origin: string, opts: { includeHtml?: boolean } = {}) {
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
    ...(opts.includeHtml ? { html: game.html } : {}),
  };
}
