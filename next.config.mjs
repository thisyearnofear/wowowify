// Import directly here rather than @/lib/env so the config file stays
// synchronous (Next.js reads it at build time without TS path resolution).
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://wowowify.vercel.app";
let APP_ORIGIN;
try {
  APP_ORIGIN = new URL(APP_URL).origin;
} catch {
  APP_ORIGIN = "https://wowowify.vercel.app";
}

const FARCASTER_ANCESTORS = [
  APP_ORIGIN,
  "https://warpcast.com",
  "https://www.warpcast.com",
  "https://farcaster.xyz",
  "https://www.farcaster.xyz",
];
const FARCASTER_FRAME_SRCS = [
  "'self'",
  APP_ORIGIN,
  "https://warpcast.com",
  "https://farcaster.xyz",
  "https://www.farcaster.xyz",
];

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Headers for Mini App security and functionality.
  // frame-ancestors derives from APP_ORIGIN so a build-time flip of the
  // canonical host updates CSP in lockstep — no more drift.
  async headers() {
    const cspHeader = [
      `frame-ancestors ${FARCASTER_ANCESTORS.join(" ")}`,
      `frame-src ${FARCASTER_FRAME_SRCS.join(" ")}`,
      // 'unsafe-inline' below is required by Next.js inline boot script
      // (theme bootstrap) plus the Farcaster SDK splash loader. Tighten in a
      // follow-up by moving both to nonced external scripts.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://warpcast.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: ipfs:",
      "connect-src 'self' https: wss: ipfs:",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
      // Specific headers for Mini App manifest
      {
        source: "/.well-known/farcaster.json",
        headers: [
          { key: "Content-Type", value: "application/json" },
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
        ],
      },
    ];
  },
  experimental: {
    // Lock server actions to the canonical app origin only. "*" allowed
    // /api endpoints to be invoked from arbitrary origins.
    serverActions: {
      allowedOrigins: [APP_ORIGIN],
    },
    turbo: {
      resolveAlias: {},
      rules: {},
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        dns: false,
        tls: false,
        fs: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
