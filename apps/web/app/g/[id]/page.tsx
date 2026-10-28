import Link from "next/link";
import { notFound } from "next/navigation";
import { gameEmoji } from "@/lib/catalog";
import { findGame, ownerName } from "@/lib/server/games";
import { currentUser } from "@/lib/server/session";
import { GamePage } from "@/components/GamePage";
import { RemixButton } from "@/components/RemixButton";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { pageMeta } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const game = await findGame((await params).id).catch(() => null);
  if (game?.visibility !== "public") return pageMeta({ title: "A private game", description: "A game made with Polly Studio.", path: `/g/${(await params).id}`, noindex: true });
  const by = await ownerName(game);
  return pageMeta({ title: `${game.title} by ${by}: Play Free`, description: `Play ${game.title}, a browser game ${by} made with AI in Polly Studio. Free, no install. Like it? Remix it into your own game in one click.`, path: `/g/${game.id}` });
}

// A game's shareable page: anyone for public games, only the owner otherwise.
export default async function PlayGame({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [game, user] = await Promise.all([findGame(id), currentUser().catch(() => null)]);
  if (!game || (game.visibility !== "public" && game.ownerId !== user?.id && !user?.admin)) notFound();
  const mine = game.ownerId === user?.id;
  const by = await ownerName(game);
  const ld = game.visibility === "public" ? {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    url: `${SITE_URL}/g/${game.id}`,
    author: { "@type": "Person", name: by },
    dateModified: game.updatedAt.toISOString(),
    gamePlatform: "Web browser",
    applicationCategory: "Game",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/PlayAction", userInteractionCount: game.plays },
  } : null;

  return (
    <>
      {ld && <JsonLd data={ld} />}
      <GamePage
        seed={game.id}
        emoji={gameEmoji(game.starterId)}
        title={game.title}
        by={mine ? "you" : by}
        plays={game.visibility === "public" ? game.plays : undefined}
        meta={`updated ${game.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
        html={game.html}
        countPlay={game.id}
        notice={game.visibility !== "public" ? <p className="muted small">Private: only you can see this. Make it public from the studio to share it.</p> : null}
        actions={
          <>
            {mine ? <Link className="btn big" href={`/studio/${game.id}`}>Edit with Frankie</Link> : <RemixButton remix={game.id} label="Remix" big />}
            <a className="btn big" href={`/api/v1/games/${game.id}/download`}><Icon name="download" /> Download</a>
    </>
      }
    />
    </>
  );
}
