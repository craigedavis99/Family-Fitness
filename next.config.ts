import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/input",
        destination: "/home",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
