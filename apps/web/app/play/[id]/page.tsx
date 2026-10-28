import { notFound } from "next/navigation";
import { EMBER, TEMPLATES, findTemplate } from "@/lib/catalog";
import { GamePage } from "@/components/GamePage";
import { RemixButton } from "@/components/RemixButton";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { pageMeta } from "@/lib/site";

export function generateStaticParams() {
  return [{ id: EMBER.id }, ...TEMPLATES.map((t) => ({ id: t.id }))];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = findTemplate(id) ?? EMBER;
  const film = game.kind === "Animation";
  return pageMeta({ title: `${game.title}: Free ${film ? "Animated Short" : "Browser Game"}`, description: `${game.blurb} A ${game.kind.toLowerCase()} made with Polly Studio. Play it free, then remix it into your own game with AI.`.slice(0, 158), path: `/play/${game.id}` });
}

// The starters and Ember, Polly's own games.
export default async function Play({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = findTemplate(id);
  if (id !== EMBER.id && !template) notFound();
  const game = template ?? EMBER;

  const ld = {
    "@context": "https://schema.org",
    "@type": game.kind === "Animation" ? "CreativeWork" : "VideoGame",
    name: game.title,
    description: game.blurb,
    url: `${SITE_URL}/play/${game.id}`,
    genre: game.kind,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    ...(game.kind === "Animation" ? {} : { gamePlatform: "Web browser", applicationCategory: "Game", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }),
  };
  return (
    <>
      <JsonLd data={ld} />
      <GamePage
        seed={game.id}
        emoji={game.emoji}
        title={game.title}
        by="Polly"
        meta={game.kind}
        blurb={game.blurb}
        // Ember is our own trusted build, served as static files with its vendor/ folder
        html={template?.html}
        src={template ? undefined : EMBER.src}
        countPlay={game.id}
        actions={<RemixButton starter={game.id} label="Remix in studio" big />}
      />
    </>
  );
}
