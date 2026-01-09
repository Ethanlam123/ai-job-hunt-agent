import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure output to avoid build cache issues
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
