/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This project lives inside a larger monorepo that has its own lockfile and
  // node_modules. Pin the workspace root here so Next resolves its own
  // dependencies (and the matching @next/swc binary) instead of climbing up.
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
