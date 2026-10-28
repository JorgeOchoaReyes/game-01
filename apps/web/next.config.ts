import type { NextConfig } from "next";

// The site lives at www.pollystudio.app. Pages on the old Vercel address move
// there for good (one copy for search engines); /api stays, because Frankie's
// tool calls may still be pointed at it.
const OLD_HOST = "game-01-eta.vercel.app";
const SITE = "https://www.pollystudio.app";

const nextConfig: NextConfig = {
  transpilePackages: ["@polly/practices"],
  async redirects() {
    return [
      { source: "/", has: [{ type: "host", value: OLD_HOST }], destination: `${SITE}/`, permanent: true },
      { source: "/:path((?!api/).*)", has: [{ type: "host", value: OLD_HOST }], destination: `${SITE}/:path`, permanent: true },
    ];
  },
};

export default nextConfig;
