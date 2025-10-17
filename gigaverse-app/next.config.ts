import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jade-decent-lizard-287.mypinata.cloud',
      },
    ],
  },
  allowedDevOrigins: ['*.replit.dev'],
};

export default nextConfig;
