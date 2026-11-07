import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Ancienne adresse de l'espace d'administration.
    return [{ source: "/syndicat", destination: "/admin", permanent: true }];
  },
};

export default nextConfig;
