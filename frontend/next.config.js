/** @type {import('next').NextConfig} */
// Use standalone only for Docker; Vercel manages its own build
const isVercel = process.env.VERCEL === '1';
const nextConfig = {
  output: isVercel ? undefined : 'standalone',
  webpack: (config) => {
    config.experiments = { asyncWebAssembly: true, layers: true };
    // Allow sql.js WASM file to be served
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;
