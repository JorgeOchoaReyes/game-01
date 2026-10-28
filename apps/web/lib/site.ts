// Where Polly Studio lives, for canonical URLs, the sitemap and social cards.
// Set NEXT_PUBLIC_SITE_URL for a preview or another domain.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.pollystudio.app").replace(/\/$/, "");
export const SITE_NAME = "Polly Studio";
export const SITE_DESCRIPTION =
  "Describe a game or a video and Frankie, Polly Studio's AI, builds it while you watch. Play it in your browser, share a link, or export an MP4. Free to start.";

// The guides that rank for what people search: one pillar, the rest link to it.
export const GUIDES = [
  { slug: "ai-game-maker", title: "AI Game Maker", blurb: "Make a playable browser game from one sentence." },
  { slug: "ai-video-maker", title: "AI Video Maker", blurb: "Animated explainer shorts with captions and voiceover." },
  { slug: "mobile-game-maker", title: "Make a Mobile Game with AI", blurb: "Portrait, touch-controlled games for phones." },
] as const;

type PageMeta = { title: string; description: string; path: string; noindex?: boolean; absoluteTitle?: boolean; image?: string };

// Everything one page needs: its own canonical and a full social card (Next
// replaces openGraph wholesale in a child, so each page sends all of it).
export function pageMeta({ title, description, path, noindex, absoluteTitle, image = "/opengraph-image" }: PageMeta) {
  const full = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website" as const, siteName: SITE_NAME, locale: "en_US", url: path, title: full, description, images: [{ url: image, width: 1200, height: 630, alt: full }] },
    twitter: { card: "summary_large_image" as const, title: full, description, images: [image] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
