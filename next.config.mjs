import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Smaller Docker / DigitalOcean App Platform images (`node server.js`). */
  output: "standalone",
  transpilePackages: ["mapbox-gl"],
  experimental: {
    serverComponentsExternalPackages: ["@google/earthengine"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        /** Exact package root only — keep `mapbox-gl/dist/*.css` on the real module. */
        "mapbox-gl$": path.resolve(__dirname, "src/lib/mapbox-gl-server-stub.js"),
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "treelyon.com",
        pathname: "/wp-content/**",
      },
    ],
  },
};

export default nextConfig;
