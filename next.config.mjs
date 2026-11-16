import { imageRemotePatterns } from "./lib/images/optimize.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // WebP, not AVIF: a menu requests many photos at once, and AVIF's first encode stalls a small server.
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    qualities: [60, 75],
    remotePatterns: imageRemotePatterns(),
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "https://nadeeni-api.onrender.com/api/:path*",
      },
    ];
  },
  allowedDevOrigins: ["192.168.137.1"],
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
