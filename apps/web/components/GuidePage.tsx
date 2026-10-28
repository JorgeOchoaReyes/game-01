import Link from "next/link";
import type { ReactNode } from "react";
import { currentUser } from "@/lib/server/session";
import { GUIDES, SITE_URL } from "@/lib/site";
import { CreateBox, type CreateMode, type Device } from "./CreateBox";
import { FaqList, JsonLd, faqLd, type Faq } from "./JsonLd";
import { Icon } from "./Icon";

// A guide that ranks for one search: the answer first, the create box right
// there to try it, then the detail, an FAQ, and links to the other guides.
export async function GuidePage({ slug, eyebrow, title, lede, mode = "game", device = "desktop", children, faqs }: {
  slug: string;
  eyebrow: string;
  title: ReactNode;
  lede: ReactNode;
  mode?: CreateMode;
  device?: Device;
  children: ReactNode;
  faqs: Faq[];
}) {
  const user = await currentUser().catch(() => null);
  const guide = GUIDES.find((g) => g.slug === slug)!;
  const others = GUIDES.filter((g) => g.slug !== slug);
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Polly Studio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: guide.title, item: `${SITE_URL}/${slug}` },
    ],
  };
  return (
    <main>
      <section className="hero guide-hero">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Polly Studio</Link> <span>/</span> {guide.title}</nav>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <div className="hero-lede">{lede}</div>
          <CreateBox signedIn={!!user && !user.anonymous} startMode={mode} startDevice={device} />
        </div>
      </section>
      <article className="wrap guide">
        {children}
        <section>
          <h2>Questions</h2>
          <FaqList faqs={faqs} />
        </section>
        <section>
          <h2>More guides</h2>
          <div className="guides">
            {others.map((g) => (
              <Link key={g.slug} href={`/${g.slug}`} className="guide-card"><b>{g.title}</b><span className="muted small">{g.blurb}</span><Icon name="arrow" size={14} /></Link>
            ))}
          </div>
        </section>
      </article>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={faqLd(faqs)} />
    </main>
  );
}
