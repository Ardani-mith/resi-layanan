import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tes e2e membangun ke folder sendiri (NEXT_DIST_DIR=.next-e2e) agar tidak menimpa
  // .next milik `npm run dev` yang mungkin sedang berjalan.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
