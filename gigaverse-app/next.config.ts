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
  allowedDevOrigins: process.env.REPLIT_DOMAINS ? [process.env.REPLIT_DOMAINS] : [],
};

export default nextConfig;
