import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this project. Without it, `next dev` infers a
  // parent directory as the root and then can't resolve the `next` package from
  // src/app — which crashes the dev server with a Turbopack panic.
  turbopack: {
    root: __dirname,
  },
  images: {
    // Cloudflare Pages/Workers don't run Next's default image optimizer,
    // so images are served as-authored. (Cloudflare Images can be wired in later.)
    unoptimized: true,
  },
};

export default nextConfig;

// Makes Cloudflare bindings (env vars, KV, R2, D1, ...) available during `next dev`
// via wrangler's getPlatformProxy. No-op in production builds.
initOpenNextCloudflareForDev();
