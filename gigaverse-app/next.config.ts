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
  allowedDevOrigins: [
    '127.0.0.1',
    ...(process.env.REPLIT_DOMAINS 
      ? process.env.REPLIT_DOMAINS.split(',').flatMap(domain => [domain, `https://${domain}`])
      : []),
  ],
  turbopack: {},
};

export default nextConfig;
