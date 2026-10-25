// Schema changes, applied in order on first use. Each entry runs once per
// database (tracked in polly_migrations). Append; never edit a shipped entry.
// Statements are split on ";", so keep semicolons out of string literals.
export const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "0001_init",
    sql: `
      CREATE TABLE users (
        id text PRIMARY KEY,
        email text NOT NULL,
        name text NOT NULL,
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX users_email_idx ON users (email);

      CREATE TABLE games (
        id text PRIMARY KEY,
        owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        html text NOT NULL,
        version integer NOT NULL DEFAULT 1,
        visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
        starter_id text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX games_owner_idx ON games (owner_id, updated_at);
      CREATE INDEX games_public_idx ON games (visibility, updated_at);

      CREATE TABLE game_versions (
        game_id text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        version integer NOT NULL,
        title text NOT NULL,
        html text NOT NULL,
        note text,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (game_id, version)
      );
    `,
  },
];
