import type { MetadataRoute } from "next";
import { NOME_PORTAL } from "@/lib/util";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${NOME_PORTAL} — biblioteca de HQs`,
    short_name: NOME_PORTAL,
    description: "Sua biblioteca privada de histórias em quadrinhos.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#13131c",
    theme_color: "#13131c",
    lang: "pt-BR",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
