import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaxiBell",
    short_name: "TaxiBell",
    description: "Le taxi le plus proche, en un instant.",
    start_url: "/",
    display: "standalone",
    background_color: "#edf3f6",
    theme_color: "#0d2b3e",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
