import Link from "next/link";
import { POSTS } from "@/lib/posts";
import { Icon } from "@/components/Icon";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Blog: Making Games and Videos with AI",
  description: "How-tos and ideas for making games and animated videos with AI: no-code game making, game ideas, and animated YouTube Shorts.",
  path: "/blog",
});

const date = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default function Blog() {
  return (
    <main className="wrap guide blog">
      <span className="eyebrow">Blog</span>
      <h1>Making games and videos with AI</h1>
      <p className="hero-lede">How-tos, ideas and what we learn building Polly Studio.</p>
      <div className="posts">
        {POSTS.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="post-card">
            <span className="muted small">{date(p.date)} · {p.minutes} min read</span>
            <b>{p.title}</b>
            <span className="muted">{p.description}</span>
            <span className="read">Read <Icon name="arrow" size={14} /></span>
          </Link>
        ))}
      </div>
    </main>
  );
}
