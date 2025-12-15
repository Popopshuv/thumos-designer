/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
  // Don't bundle Supabase - let Node.js handle it natively at runtime
  serverExternalPackages: ["@supabase/supabase-js"],
};

export default nextConfig;
