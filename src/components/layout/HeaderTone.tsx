"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Menyesuaikan navbar warga (.site-header) dengan isi di bawahnya, lewat atribut data:
 * - data-scrolled: halaman sudah digulir → latar blur muncul (di posisi paling atas transparan).
 * - data-on-dark: navbar sedang di atas area bertanda [data-header-dark] (mis. hero gelap
 *   beranda) → teks putih; selain itu teks gelap biasa.
 * - data-hidden: sedang menggulir ke bawah (lewat 120px) → navbar bergeser ke atas & hilang; sedikit
 *   menggulir ke atas → muncul lagi. Dekat puncak halaman selalu tampil.
 * Warna, latar & gerakannya di globals.css. Dicek ulang tiap pindah halaman dan saat tinggi halaman
 * berubah (isi dari <Suspense> baru tiba, mis. kepala gelap halaman lacak).
 */
export default function HeaderTone() {
  const pathname = usePathname();

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    let frame = 0;
    let lastY = window.scrollY;
    header.dataset.hidden = "false";

    const update = () => {
      frame = 0;
      const probe = header.offsetHeight / 2;
      const onDark = [...document.querySelectorAll("[data-header-dark]")].some((el) => {
        const { top, bottom } = el.getBoundingClientRect();
        return top <= probe && bottom >= probe;
      });
      const y = window.scrollY;
      header.dataset.scrolled = String(y > 4);
      header.dataset.onDark = String(onDark);
      // Ambang 6px agar getaran kecil (trackpad, scroll halus) tidak membuat navbar berkedip.
      if (y < 120) header.dataset.hidden = "false";
      else if (y - lastY > 6) header.dataset.hidden = "true";
      else if (lastY - y > 6) header.dataset.hidden = "false";
      if (Math.abs(y - lastY) > 6 || y < 120) lastY = y;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return null;
}
