import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@polly/practices"],
  // PGlite loads its WebAssembly from its own package files at runtime
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
