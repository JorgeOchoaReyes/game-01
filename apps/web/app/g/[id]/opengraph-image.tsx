import { findGame, ownerName } from "@/lib/server/games";
import { OG_SIZE, ogCard } from "@/lib/og";

// A public game's own card: its title and who made it.
export const alt = "A game made with Polly Studio";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function GameCard({ params }: { params: Promise<{ id: string }> }) {
  const game = await findGame((await params).id).catch(() => null);
  if (game?.visibility !== "public") return ogCard({ label: "Polly Studio", title: "Make games and videos with AI.", line: "Describe it. Watch it get built." });
  return ogCard({ label: `Play free · by ${await ownerName(game)}`, title: game.title, line: "Made with AI in Polly Studio. Remix it into your own." });
}
