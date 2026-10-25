import { currentUser } from "@/lib/server/session";
import { listGames } from "@/lib/server/games";
import { listStarters } from "@/lib/server/starters";
import { gameEmoji } from "@/lib/catalog";
import { CreateBox } from "@/components/CreateBox";
import { GameArt, GameTile } from "@/components/GameTile";
import { RemixButton } from "@/components/RemixButton";

export const metadata = { title: "Create · Polly" };
export const dynamic = "force-dynamic";

// Create: describe a new game, pick up one of yours, or start from a starter.
// Open to everyone to look at; making a game asks for an account first.
export default async function Create({ searchParams }: { searchParams: Promise<{ idea?: string }> }) {
  const idea = (await searchParams).idea?.trim().slice(0, 500) || undefined;
  const user = await currentUser().catch(() => null);
  const games = user ? await listGames(user) : [];
  const starters = listStarters();

  return (
    <main className="wrap create-page">
      <section className="create-hero">
        <h1>Make a new game</h1>
        <p className="muted">Say what it is. Frankie starts building right away, and you play it as it grows.</p>
        <CreateBox signedIn={!!user && !user.anonymous} autoFocus={games.length === 0} startWith={idea} />
      </section>

      {games.length > 0 && (
        <section>
          <h2>My games</h2>
          <div className="tiles">
            {games.map((g) => (
              <GameTile
                key={g.id}
                href={`/studio/${g.id}`}
                seed={g.id}
                emoji={gameEmoji(g.starterId)}
                title={g.title}
                badge={g.visibility === "public" ? "Public" : "Private"}
                by={`v${g.version} · ${g.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>Or start from a working game</h2>
        <div className="starters">
          {starters.map((s) => (
            <div className="starter" key={s.id}>
              <GameArt seed={s.id} emoji={s.emoji} />
              <div>
                <span className="kind">{s.kind}</span>
                <b>{s.title}</b>
                <p className="muted small">{s.blurb}</p>
              </div>
              <RemixButton starter={s.id} label="Start here" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
