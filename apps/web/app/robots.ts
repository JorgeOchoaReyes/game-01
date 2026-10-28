import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Everything public may be crawled; the API, the studio and accounts may not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/studio/", "/settings", "/login", "/signup"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
