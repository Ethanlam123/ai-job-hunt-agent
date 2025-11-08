import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Configure output to avoid build cache issues
  outputFileTracingRoot: __dirname,
  turbopack: {},
};

export default nextConfig;
