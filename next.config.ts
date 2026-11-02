import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Keep MVP stable on Next 16.4 (Cache Components / PPR can break /_global-error prerender).
  cacheComponents: false,
  // Pin Turbopack root so Windows path casing (Projects vs projects) doesn't break the cache dir.
  turbopack: {
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
