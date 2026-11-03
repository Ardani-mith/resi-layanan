import type { MetadataRoute } from "next";
import { site } from "@/config/site";

// Manifest PWA: Pantas bisa dipasang di layar utama. Wajib di iPhone agar notifikasi push
// ("Kabari saya" di halaman lacak) bisa diizinkan (iOS 16.4+ hanya untuk web app terpasang).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name}: lacak layanan publik`,
    short_name: site.name,
    description: site.description,
    start_url: "/lacak",
    scope: "/",
    display: "standalone",
    background_color: "#f6f8fb",
    theme_color: "#f6f8fb",
    lang: "id",
    icons: [
      { src: "/brand/pantas-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/pantas-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/pantas-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
