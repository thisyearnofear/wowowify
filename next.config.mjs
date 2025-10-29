/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Headers for Mini App security and functionality
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *; frame-src *;",
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
          {
            key: "Content-Type",
            value: "application/json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
    turbo: {
      // Configure Turbopack
      resolveAlias: {
        // Add any aliases needed for Turbopack
      },
      rules: {
        // Add any custom rules for Turbopack
      },
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
