import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Performance ────────────────────────────────
  reactStrictMode: true,
  poweredByHeader: false,

  // ── Output & Compression ───────────────────────
  compress: true,

  // ── Image Optimization ─────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // ── Headers ────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // Cache static assets aggressively
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  // ── Experimental ───────────────────────────────
  experimental: {
    // Enable CSS chunk optimization
    optimizeCss: false, // Set to true when critters is installed
  },
};

export default nextConfig;
