import Link from "next/link";
import { EMBER, TEMPLATES, gameEmoji } from "@/lib/catalog";
import { currentUser } from "@/lib/server/session";
import { listGames, listPublicGames } from "@/lib/server/games";
import { CreateBox } from "@/components/CreateBox";
import { GameTile } from "@/components/GameTile";
import { Paw, PollyDog } from "@/components/PollyDog";

export const dynamic = "force-dynamic";

// Starters that are films rather than games.
const VIDEO_KINDS = new Set(["Animation"]);

// Home: say what you want to make (a game or a video) and you're in the studio
// with Frankie building it. Below, things to play and watch.
export default async function Home() {
  const user = await currentUser().catch(() => null);
  const [mine, popular, fresh] = await Promise.all([
    user ? listGames(user).catch(() => []) : [],
    listPublicGames(12, "popular").catch(() => []),
    listPublicGames(12, "new").catch(() => []),
  ]);
  const games = TEMPLATES.filter((t) => !VIDEO_KINDS.has(t.kind));
  const videos = TEMPLATES.filter((t) => VIDEO_KINDS.has(t.kind));
  const named = user && !user.anonymous;

  return (
    <main>
      <section className="hero paws">
        <div className="wrap hero-grid">
          <div>
            <h1>
              {named ? <>Hey {user.name}, what are we <em>making</em> today?</> : <>Make a game or a video. <em>Just say what it is.</em></>}
            </h1>
            <p className="hero-lede">
              Frankie builds it with you while you watch it come to life. Games for desktop, shorts for your feed. Free, nothing to install. Come back daily to keep your 🔥 streak.
            </p>
            <CreateBox signedIn={!!named} autoFocus />
          </div>
          <div className="mascot" aria-hidden>
            <span className="bubble">Woof! Tell me your idea and I&apos;ll fetch it. 🦴</span>
            <PollyDog size={260} />
            <span className="float a">🎮</span>
            <span className="float b">🎬</span>
          </div>
        </div>
      </section>

      <div className="wrap">
        {mine.length > 0 && (
          <Row title="Continue where you left off" href="/studio">
            {mine.slice(0, 12).map((g) => (
              <GameTile key={g.id} href={`/studio/${g.id}`} seed={g.id} emoji={gameEmoji(g.starterId)} title={g.title} badge={g.visibility === "public" ? "Public" : `v${g.version}`} />
            ))}
          </Row>
        )}

        {popular.some((g) => g.plays > 0) && (
          <Row title="Popular right now" href="/games?sort=popular">
            {popular.map((g) => (
              <GameTile key={g.id} href={`/g/${g.id}`} seed={g.id} emoji={gameEmoji(g.starterId)} title={g.title} by={g.ownerName} plays={g.plays} />
            ))}
          </Row>
        )}

        {fresh.length > 0 && (
          <Row title="Fresh from the pack" href="/games">
            {fresh.map((g) => (
              <GameTile key={g.id} href={`/g/${g.id}`} seed={g.id} emoji={gameEmoji(g.starterId)} title={g.title} by={g.ownerName} plays={g.plays} />
            ))}
          </Row>
        )}

        <Row title="Games to start from" href="/games#starters">
          <GameTile href={`/play/${EMBER.id}`} seed={EMBER.id} emoji={EMBER.emoji} title={EMBER.title} by="Polly" badge="Featured" />
          {games.map((t) => (
            <GameTile key={t.id} href={`/play/${t.id}`} seed={t.id} emoji={t.emoji} title={t.title} by="Polly" />
          ))}
        </Row>

        {videos.length > 0 && (
          <Row title="Videos to watch" href="/games#starters">
            {videos.map((t) => (
              <GameTile key={t.id} href={`/play/${t.id}`} seed={t.id} emoji={t.emoji} title={t.title} by="Polly" badge="Short" />
            ))}
          </Row>
        )}

        <section className="how">
          <div><b><Paw size={18} /> Describe it</b><p>&ldquo;A cat in space dodging asteroids.&rdquo; &ldquo;How do bees make honey?&rdquo; One line is enough to start.</p></div>
          <div><b><Paw size={18} /> Watch it come to life</b><p>Your game or video reloads beside the chat every time Frankie saves. Ask for changes as you go.</p></div>
          <div><b><Paw size={18} /> Share it</b><p>Publish a game for a link and a spot on Discover, or record your video as an MP4 for Shorts, TikTok and Reels.</p></div>
        </section>
      </div>

      <footer className="footer">
        <PollyDog size={44} mood="wink" />
        <span>Polly Studio · every game and video is one readable file you own · <Link href="/practices">How it&apos;s built</Link></span>
      </footer>
    </main>
  );
}

function Row({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="row">
      <div className="row-head">
        <h2><Paw size={20} /> {title}</h2>
        <Link href={href} className="see-all">See all ›</Link>
      </div>
      <div className="row-tiles">{children}</div>
    </section>
  );
}
