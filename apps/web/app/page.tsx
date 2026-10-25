import Link from "next/link";
import { EMBER, TEMPLATES, gameEmoji } from "@/lib/catalog";
import { currentUser } from "@/lib/server/session";
import { listGames, listPublicGames } from "@/lib/server/games";
import { CreateBox } from "@/components/CreateBox";
import { GameTile } from "@/components/GameTile";

export const dynamic = "force-dynamic";

// Home: say what you want to make and you're in the studio with Frankie
// building it. Below, games to play, like a game platform's front page.
export default async function Home() {
  const user = await currentUser().catch(() => null);
  const [mine, popular, fresh] = await Promise.all([
    user ? listGames(user).catch(() => []) : [],
    listPublicGames(12, "popular").catch(() => []),
    listPublicGames(12, "new").catch(() => []),
  ]);

  return (
    <main>
      <section className="hero">
        <div className="wrap">
          <h1>
            {user && !user.anonymous ? <>Hey {user.name}, what&apos;s next?</> : <>What do you want to make?</>}
          </h1>
          <p>Describe a game. Frankie builds it with you while you play it. Free, nothing to install. Come back every day to keep your 🔥 streak.</p>
          <CreateBox signedIn={!!user && !user.anonymous} autoFocus />
        </div>
      </section>

      <div className="wrap">
        {mine.length > 0 && (
          <Row title="Continue building" href="/studio">
            {mine.slice(0, 12).map((g) => (
              <GameTile key={g.id} href={`/studio/${g.id}`} seed={g.id} emoji={gameEmoji(g.starterId)} title={g.title} badge={g.visibility === "public" ? "Public" : `v${g.version}`} />
            ))}
          </Row>
        )}

        {popular.some((g) => g.plays > 0) && (
          <Row title="Popular" href="/games?sort=popular">
            {popular.map((g) => (
              <GameTile key={g.id} href={`/g/${g.id}`} seed={g.id} emoji={gameEmoji(g.starterId)} title={g.title} by={g.ownerName} plays={g.plays} />
            ))}
          </Row>
        )}

        {fresh.length > 0 && (
          <Row title="New from the community" href="/games">
            {fresh.map((g) => (
              <GameTile key={g.id} href={`/g/${g.id}`} seed={g.id} emoji={gameEmoji(g.starterId)} title={g.title} by={g.ownerName} plays={g.plays} />
            ))}
          </Row>
        )}

        <Row title="Play the starters" href="/games#starters">
          <GameTile href={`/play/${EMBER.id}`} seed={EMBER.id} emoji={EMBER.emoji} title={EMBER.title} by="Polly" badge="Featured" />
          {TEMPLATES.map((t) => (
            <GameTile key={t.id} href={`/play/${t.id}`} seed={t.id} emoji={t.emoji} title={t.title} by="Polly" />
          ))}
        </Row>

        <section className="how">
          <div><b>1. Describe it</b><p>&ldquo;A cat in space dodging asteroids.&rdquo; That&apos;s enough to start.</p></div>
          <div><b>2. Play as it&apos;s built</b><p>The game reloads beside the chat every time Frankie saves. Ask for changes as you go.</p></div>
          <div><b>3. Publish and share</b><p>Make it public to get a link and a spot on Discover, or download it as a zip.</p></div>
        </section>
      </div>

      <footer className="footer">
        Polly · every game is one readable file you own · <Link href="/practices">How games are built</Link>
      </footer>
    </main>
  );
}

function Row({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="row">
      <div className="row-head">
        <h2>{title}</h2>
        <Link href={href} className="see-all">See all ›</Link>
      </div>
      <div className="row-tiles">{children}</div>
    </section>
  );
}
