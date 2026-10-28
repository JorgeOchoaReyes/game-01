import Link from "next/link";
import { EMBER, TEMPLATES, gameEmoji } from "@/lib/catalog";
import { currentUser } from "@/lib/server/session";
import { listGames, listPublicGames } from "@/lib/server/games";
import { CreateBox } from "@/components/CreateBox";
import { GameTile } from "@/components/GameTile";
import { PollyDog } from "@/components/PollyDog";
import { Icon } from "@/components/Icon";

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
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">AI game and video studio</span>
            <h1>
              {named ? <>Welcome back, {user.name}. <em>What are we making?</em></> : <>Describe a game or a video. <em>Watch it get built.</em></>}
            </h1>
            <p className="hero-lede">
              Frankie, your AI collaborator, writes it while you watch the preview update. Play it in the browser, share a link, or export a video for Shorts, TikTok and Reels.
            </p>
            <CreateBox signedIn={!!named} autoFocus />
          </div>
          <div className="mascot" aria-hidden>
            <div className="halo" />
            <PollyDog size={220} />
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
          <div><span className="step">01</span><b>Describe it</b><p>One line is enough: &ldquo;a cat in space dodging asteroids&rdquo; or &ldquo;how do bees make honey?&rdquo;</p></div>
          <div><span className="step">02</span><b>Watch it come together</b><p>The preview reloads beside the chat every time Frankie saves. Ask for changes as you go.</p></div>
          <div><span className="step">03</span><b>Share or export</b><p>Publish a game to get a link and a spot on Discover, or record your video as an MP4.</p></div>
        </section>
      </div>

      <footer className="footer">
        <div className="footer-brand"><PollyDog size={28} /><span>Polly Studio</span></div>
        <span>Every game and video is one readable file you own.</span>
        <nav><Link href="/games">Discover</Link><Link href="/studio">Create</Link><Link href="/practices">How it&apos;s built</Link></nav>
      </footer>
    </main>
  );
}

function Row({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="row">
      <div className="row-head">
        <h2>{title}</h2>
        <Link href={href} className="see-all">See all <Icon name="arrow" size={14} /></Link>
      </div>
      <div className="row-tiles">{children}</div>
    </section>
  );
}
