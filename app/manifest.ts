import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LATAM World News",
    short_name: "LWN",
    description:
      "Noticias internacionales explicadas para América Latina con cobertura curada y análisis propio.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    lang: "es",
    categories: ["news", "media", "business"],
    icons: [
      {
        src: absoluteUrl("/icon.svg"),
        sizes: "any",
        type: "image/svg+xml"
      },
      {
        src: absoluteUrl("/apple-icon.svg"),
        sizes: "180x180",
        type: "image/svg+xml"
      }
    ]
  };
}
