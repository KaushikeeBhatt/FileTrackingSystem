import path, { dirname } from "path";
import { fileURLToPath } from "url";

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
  // Existing configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // Enable standalone output for Docker only in production
  ...(process.env.NODE_ENV === "production" && process.env.DOCKER_BUILD === "true" && {
    output: "standalone",
    experimental: {
      outputFileTracingRoot: path.join(__dirname, "../../"),
    },
  }),
  experimental: {
    serverActions: {}//true,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/status',
        destination: '/api/health',
      },
    ]
  },
};

export default nextConfig;
