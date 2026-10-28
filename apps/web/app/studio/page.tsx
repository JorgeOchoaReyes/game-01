import { currentUser } from "@/lib/server/session";
import { listGames } from "@/lib/server/games";
import { listStarters } from "@/lib/server/starters";
import { EMBER, findTemplate, gameEmoji } from "@/lib/catalog";
import { CreateBox } from "@/components/CreateBox";
import { GameArt, GameTile } from "@/components/GameTile";
import { RemixButton } from "@/components/RemixButton";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({ title: "Create a Game or Video", description: "Describe a game or a video and Frankie starts building it right away.", path: "/studio", noindex: true });
export const dynamic = "force-dynamic";

// Create: describe a new game, pick up one of yours, or start from a starter.
// Open to everyone to look at; making a game asks for an account first.
export default async function Create({ searchParams }: { searchParams: Promise<{ idea?: string; mode?: string; format?: string; device?: string }> }) {
  const params = await searchParams;
  const idea = params.idea?.trim().slice(0, 500) || undefined;
  const mode = params.mode === "video" ? "video" : "game";
  const format = params.format === "landscape" || params.format === "square" ? params.format : "portrait";
  const device = params.device === "mobile" ? "mobile" : "desktop";
  const user = await currentUser().catch(() => null);
  const games = user ? await listGames(user) : [];
  // the browsable starters: not the blank film new videos start from
  const starters = listStarters().filter((s) => s.id === EMBER.id || findTemplate(s.id));

  return (
    <main className="wrap create-page">
      <section className="create-hero">
        <span className="eyebrow">New project</span>
        <h1>What do you want to make?</h1>
        <p className="muted">Describe a game or a video. Frankie starts building right away, and the preview updates as it goes.</p>
        <CreateBox signedIn={!!user && !user.anonymous} autoFocus={games.length === 0} startWith={idea} startMode={mode} startFormat={format} startDevice={device} />
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
        <h2>Or start from something that already works</h2>
        <div className="starters">
          {starters.map((s) => (
            <div className="starter" key={s.id}>
              <GameArt seed={s.id} emoji={s.emoji} />
              <div>
                <span className="kind">{s.kind}</span>
                <b>{s.title}</b>
                <p className="muted small">{s.blurb}</p>
              </div>
              <RemixButton starter={s.id} label="Start here" primary={false} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
