import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "holahabitos",
    short_name: "holahabitos",
    description: "Seguí tus hábitos y mirá tu porcentaje de cumplimiento",
    start_url: "/today",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6366f1",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
