import { EMBER, findTemplate } from "@/lib/catalog";
import { OG_SIZE, ogCard } from "@/lib/og";

// A starter's card: its title and what it is.
export const alt = "A Polly Studio game";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function StarterCard({ params }: { params: Promise<{ id: string }> }) {
  const game = findTemplate((await params).id) ?? EMBER;
  return ogCard({ label: `${game.kind} · Polly Studio`, title: game.title, line: game.blurb.slice(0, 90) });
}
