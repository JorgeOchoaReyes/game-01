import Link from "next/link";
import { notFound } from "next/navigation";
import { gameEmoji } from "@/lib/catalog";
import { findGame, ownerName } from "@/lib/server/games";
import { currentUser } from "@/lib/server/session";
import { GamePage } from "@/components/GamePage";
import { RemixButton } from "@/components/RemixButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const game = await findGame((await params).id).catch(() => null);
  return { title: game?.visibility === "public" ? `${game.title} · Polly Studio` : "Polly Studio" };
}

// A game's shareable page: anyone for public games, only the owner otherwise.
export default async function PlayGame({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [game, user] = await Promise.all([findGame(id), currentUser().catch(() => null)]);
  if (!game || (game.visibility !== "public" && game.ownerId !== user?.id)) notFound();
  const mine = game.ownerId === user?.id;

  return (
    <GamePage
      seed={game.id}
      emoji={gameEmoji(game.starterId)}
      title={game.title}
      by={mine ? "you" : await ownerName(game)}
      plays={game.visibility === "public" ? game.plays : undefined}
      meta={`updated ${game.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
      html={game.html}
      countPlay={game.id}
      notice={game.visibility !== "public" ? <p className="muted small">🔒 Private: only you can see this. Make it public from the studio to share it.</p> : null}
      actions={
        <>
          {mine ? <Link className="btn big" href={`/studio/${game.id}`}>✏️ Edit with Frankie</Link> : <RemixButton remix={game.id} label="Remix" big />}
          <a className="btn big" href={`/api/v1/games/${game.id}/download`}>⬇ Download</a>
        </>
      }
    />
  );
}
