import { notFound } from "next/navigation";
import { EMBER, TEMPLATES, findTemplate } from "@/lib/catalog";
import { GamePage } from "@/components/GamePage";
import { RemixButton } from "@/components/RemixButton";

export function generateStaticParams() {
  return [{ id: EMBER.id }, ...TEMPLATES.map((t) => ({ id: t.id }))];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${(findTemplate(id) ?? EMBER).title} · Polly Studio` };
}

// The starters and Ember, Polly's own games.
export default async function Play({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = findTemplate(id);
  if (id !== EMBER.id && !template) notFound();
  const game = template ?? EMBER;

  return (
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
  );
}
