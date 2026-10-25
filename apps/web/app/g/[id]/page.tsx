import Link from "next/link";
import { notFound } from "next/navigation";
import { findGame } from "@/lib/server/games";
import { currentUser } from "@/lib/server/session";
import { PlayTemplate } from "@/components/PlayTemplate";

export const dynamic = "force-dynamic";

// A game's shareable play page: anyone for public games, only the owner otherwise.
export default async function PlayGame({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [game, user] = await Promise.all([findGame(id), currentUser()]);
  if (!game || (game.visibility !== "public" && game.ownerId !== user?.id)) notFound();
  const mine = game.ownerId === user?.id;

  return (
    <main className="play">
      <div className="toolbar">
        <span className="title">{game.title}</span>
        {game.visibility !== "public" && <span className="muted small">🔒 Only you can see this</span>}
        <a className="btn small" href={`/api/v1/games/${game.id}/download`}>⬇ Download</a>
        {mine && <Link className="btn primary small" href={`/studio/${game.id}`}>Edit in studio</Link>}
      </div>
      <div className="screen">
        <PlayTemplate html={game.html} />
      </div>
    </main>
  );
}
