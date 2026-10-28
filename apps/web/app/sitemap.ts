import type { MetadataRoute } from "next";
import { EMBER, TEMPLATES } from "@/lib/catalog";
import { listPublicGames } from "@/lib/server/games";
import { GUIDES, SITE_URL } from "@/lib/site";
import { POSTS } from "@/lib/posts";

export const dynamic = "force-dynamic";

// Canonical, indexable pages only: no studio, account or API URLs.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const page = (path: string, priority: number, lastModified = now) => ({ url: `${SITE_URL}${path}`, lastModified, priority });
  const games = await listPublicGames(200, "popular").catch(() => []);
  return [
    page("/", 1),
    ...GUIDES.map((g) => page(`/${g.slug}`, 0.9)),
    page("/pricing", 0.8),
    page("/faq", 0.7),
    page("/roadmap", 0.5),
    page("/rules", 0.4),
    page("/blog", 0.7),
    ...POSTS.map((p) => page(`/blog/${p.slug}`, 0.7, new Date(`${p.date}T12:00:00Z`))),
    page("/games", 0.8),
    page("/practices", 0.5),
    ...[EMBER.id, ...TEMPLATES.map((t) => t.id)].map((id) => page(`/play/${id}`, 0.6)),
    ...games.map((g) => page(`/g/${g.id}`, 0.5, g.updatedAt)),
  ];
}
