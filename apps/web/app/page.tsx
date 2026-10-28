import Link from "next/link";
import { EMBER, TEMPLATES, gameEmoji } from "@/lib/catalog";
import { currentUser } from "@/lib/server/session";
import { listGames, listPublicGames } from "@/lib/server/games";
import { CreateBox } from "@/components/CreateBox";
import { GameTile } from "@/components/GameTile";
import { PollyDog } from "@/components/PollyDog";
import { Icon } from "@/components/Icon";
import { FaqList, JsonLd } from "@/components/JsonLd";
import { ALL_FAQS } from "@/lib/faqs";
import { GUIDES, SITE_DESCRIPTION, SITE_NAME, SITE_URL, pageMeta } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Polly Studio: Make Games and Videos with AI",
  absoluteTitle: true,
  description: "Describe a game or a short video and watch AI build it. Play in your browser, share a link, or export an MP4. Your first game is free.",
  path: "/",
});

// the first few on the home page; all of them on /faq
const FAQS = ALL_FAQS.filter((f) => ["Can AI really make a whole game?", "Do I need to know how to code?", "Can I make games for phones?", "What videos can it make?", "Is Polly Studio free?"].includes(f.q));

const SITE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg` },
    { "@type": "WebSite", "@id": `${SITE_URL}/#site`, name: SITE_NAME, url: SITE_URL, publisher: { "@id": `${SITE_URL}/#org` }, potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/games?q={query}`, "query-input": "required name=query" } },
    {
      "@type": "SoftwareApplication", name: SITE_NAME, url: SITE_URL, applicationCategory: "DesignApplication", operatingSystem: "Web browser", description: SITE_DESCRIPTION,
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
        { "@type": "Offer", name: "Polly Studio Pro", price: "10", priceCurrency: "USD", url: `${SITE_URL}/pricing` },
      ],
    },
  ],
};

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
            <span className="bubble">Tell me your idea and I&apos;ll fetch it!</span>
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

      <div className="wrap">
        <section className="row guides-row">
          <div className="row-head"><h2>Guides</h2></div>
          <div className="guides">
            {GUIDES.map((g) => (
              <Link key={g.slug} href={`/${g.slug}`} className="guide-card"><b>{g.title}</b><span className="muted small">{g.blurb}</span><Icon name="arrow" size={14} /></Link>
            ))}
          </div>
        </section>
        <section className="row">
          <div className="row-head"><h2>Questions</h2><Link href="/faq" className="see-all">All questions <Icon name="arrow" size={14} /></Link></div>
          <FaqList faqs={FAQS} />
        </section>
      </div>
      <JsonLd data={SITE_LD} />

      <footer className="footer">
        <div className="footer-brand"><PollyDog size={28} /><span>Polly Studio</span></div>
        <span>Every game and video is one readable file you own.</span>
        <nav><Link href="/ai-game-maker">AI game maker</Link><Link href="/ai-video-maker">AI video maker</Link><Link href="/games">Discover</Link><Link href="/pricing">Pricing</Link><Link href="/blog">Blog</Link><Link href="/faq">FAQ</Link><Link href="/roadmap">Roadmap</Link><Link href="/rules">Rules</Link></nav>
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
