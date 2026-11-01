"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Menyesuaikan navbar warga (.site-header) dengan isi di bawahnya, lewat atribut data:
 * - data-scrolled: halaman sudah digulir → latar blur muncul (di posisi paling atas transparan).
 * - data-on-dark: navbar sedang di atas area bertanda [data-header-dark] (mis. hero gelap
 *   beranda) → teks putih; selain itu teks gelap biasa.
 * Warna & latarnya di globals.css. Dicek ulang tiap pindah halaman.
 */
export default function HeaderTone() {
  const pathname = usePathname();

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const probe = header.offsetHeight / 2;
      const onDark = [...document.querySelectorAll("[data-header-dark]")].some((el) => {
        const { top, bottom } = el.getBoundingClientRect();
        return top <= probe && bottom >= probe;
      });
      header.dataset.scrolled = String(window.scrollY > 4);
      header.dataset.onDark = String(onDark);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return null;
}
