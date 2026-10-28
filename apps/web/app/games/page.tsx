import Link from "next/link";
import { EMBER, TEMPLATES, gameEmoji } from "@/lib/catalog";
import { listPublicGames } from "@/lib/server/games";
import { GameTile } from "@/components/GameTile";
import { PollyDog } from "@/components/PollyDog";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, pageMeta } from "@/lib/site";

export const metadata = pageMeta({ title: "Discover Games and Videos Made with AI", description: "Play free browser games and watch short videos people made with Polly Studio's AI. Remix any public game into your own in one click.", path: "/games" });
export const dynamic = "force-dynamic";

export default async function Discover({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const params = await searchParams;
  const sort = params.sort === "popular" ? "popular" : "new";
  const q = (params.q ?? "").trim().toLowerCase();
  const all = await listPublicGames(96, sort).catch(() => []);
  const games = q ? all.filter((g) => g.title.toLowerCase().includes(q) || g.ownerName.toLowerCase().includes(q)) : all;
  const starters = [{ id: EMBER.id, title: EMBER.title, emoji: EMBER.emoji }, ...TEMPLATES].filter((t) => !q || t.title.toLowerCase().includes(q));
  const tab = (s: "new" | "popular") => `/games?sort=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Games and videos made with Polly Studio",
    url: `${SITE_URL}/games`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: all.slice(0, 30).map((g, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/g/${g.id}`, name: g.title })),
    },
  };

  return (
    <main className="wrap discover">
      <JsonLd data={ld} />
      <div className="discover-head">
        <h1>{q ? <>Results for &ldquo;{params.q}&rdquo;</> : "Discover games and videos"}</h1>
        <div className="tabs" role="tablist">
          <Link role="tab" aria-selected={sort === "new"} className={sort === "new" ? "on" : ""} href={tab("new")}>New</Link>
          <Link role="tab" aria-selected={sort === "popular"} className={sort === "popular" ? "on" : ""} href={tab("popular")}>Popular</Link>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="empty">
          <PollyDog size={72} mood="calm" />
          <p>{q ? "No community games match that yet. Polly sniffed everywhere." : "Nothing shared yet. Make something and publish it to be the first here."}</p>
          <Link className="btn primary" href="/studio">Make a game</Link>
        </div>
      ) : (
        <div className="tiles">
          {games.map((g) => (
            <GameTile key={g.id} href={`/g/${g.id}`} seed={g.id} emoji={gameEmoji(g.starterId)} title={g.title} by={g.ownerName} plays={g.plays} />
          ))}
        </div>
      )}

      {starters.length > 0 && (
        <>
          <h2 id="starters">Starters from Polly</h2>
          <div className="tiles">
            {starters.map((t) => (
              <GameTile key={t.id} href={`/play/${t.id}`} seed={t.id} emoji={t.emoji} title={t.title} by="Polly" />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
