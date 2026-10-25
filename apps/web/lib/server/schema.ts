import { index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const games = pgTable(
  "games",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    html: text("html").notNull(),
    version: integer("version").notNull().default(1),
    visibility: text("visibility", { enum: ["private", "public"] }).notNull().default("private"),
    starterId: text("starter_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("games_owner_idx").on(t.ownerId, t.updatedAt), index("games_public_idx").on(t.visibility, t.updatedAt)],
);

// Every save is kept, so an agent's bad edit is one restore away.
export const gameVersions = pgTable(
  "game_versions",
  {
    gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    html: text("html").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.version] })],
);

export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type GameVersion = typeof gameVersions.$inferSelect;
