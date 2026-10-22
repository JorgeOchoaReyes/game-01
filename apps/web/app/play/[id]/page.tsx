import Link from "next/link";
import { notFound } from "next/navigation";
import { EMBER, TEMPLATES, findTemplate } from "@/lib/catalog";
import { PlayTemplate } from "@/components/PlayTemplate";
import { RemixButton } from "@/components/RemixButton";

export function generateStaticParams() {
  return [{ id: EMBER.id }, ...TEMPLATES.map((t) => ({ id: t.id }))];
}

export default async function Play({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = findTemplate(id);
  if (id !== EMBER.id && !template) notFound();

  const title = template ? template.title : EMBER.title;

  return (
    <main className="play">
      <div className="toolbar">
        <span className="title">{title}</span>
        <Link className="btn small" href="/games">All games</Link>
        <RemixButton starter={template ? template.id : EMBER.id} />
      </div>
      <div className="screen">
        {template ? (
          <PlayTemplate html={template.html} />
        ) : (
          // Ember is our own trusted build, served as static files with its vendor/ folder
          <iframe title="Ember" src={EMBER.src} allow="autoplay; fullscreen" />
        )}
      </div>
    </main>
  );
}
