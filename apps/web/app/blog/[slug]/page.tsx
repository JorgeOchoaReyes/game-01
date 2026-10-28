import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS, findPost } from "@/lib/posts";
import { JsonLd } from "@/components/JsonLd";
import { Icon } from "@/components/Icon";
import { SITE_NAME, SITE_URL, pageMeta } from "@/lib/site";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = findPost((await params).slug);
  if (!post) return {};
  return pageMeta({ title: post.title, description: post.description, path: `/blog/${post.slug}` });
}

const date = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = findPost((await params).slug);
  if (!post) notFound();
  const url = `${SITE_URL}/blog/${post.slug}`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "BlogPosting", headline: post.title, description: post.description, datePublished: post.date, dateModified: post.date, url, mainEntityOfPage: url, author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL }, publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` } }, image: `${SITE_URL}/opengraph-image` },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ] },
    ],
  };
  const more = POSTS.filter((p) => p.slug !== post.slug);
  return (
    <main className="wrap guide post">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Polly Studio</Link> <span>/</span> <Link href="/blog">Blog</Link></nav>
      <h1>{post.title}</h1>
      <p className="muted small">{date(post.date)} · {post.minutes} min read</p>
      <p className="hero-lede">{post.lede}</p>
      {post.body}
      <section className="cta">
        <b>Try it now</b>
        <p>Your first game or video is free.</p>
        <Link href="/studio" className="btn primary big">Start creating <Icon name="arrow" /></Link>
      </section>
      <section>
        <h2>Keep reading</h2>
        <div className="guides">
          {more.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="guide-card"><b>{p.title}</b><span className="muted small">{p.minutes} min read</span><Icon name="arrow" size={14} /></Link>
          ))}
        </div>
      </section>
      <JsonLd data={ld} />
    </main>
  );
}
