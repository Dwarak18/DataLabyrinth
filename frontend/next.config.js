/** @type {import('next').NextConfig} */
// Use standalone only for Docker; Vercel manages its own build
const isVercel = process.env.VERCEL === '1';

// Hardcode the Railway backend URL so Vercel dashboard env vars cannot override it
const RAILWAY_BACKEND = 'https://datalabyrinth-production-0b3f.up.railway.app';

const nextConfig = {
  output: isVercel ? undefined : 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: RAILWAY_BACKEND,
  },
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
