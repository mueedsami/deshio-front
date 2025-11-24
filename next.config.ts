import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // output: "export",  <-- REMOVE THIS
  images: {
    unoptimized: true, // keeps next/image working without optimization
  },
};

export default nextConfig;
