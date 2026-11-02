"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Bar progres tipis di tepi atas layar saat pindah halaman (loading global, warga & petugas).
// Mulai: klik tautan internal, atau startNavProgress() sebelum router.push (form cek resi).
// Selesai: alamat (path/query) berubah. Batas aman 12 detik bila navigasi batal/gagal.

const START_EVENT = "pantas:nav-start";
const SAFETY_MS = 12_000;

/** Panggil sebelum navigasi lewat kode (router.push) supaya bar progres ikut tampil. */
export function startNavProgress() {
  window.dispatchEvent(new Event(START_EVENT));
}

/** Klik yang akan memicu navigasi App Router ke alamat lain di situs ini. */
function isInternalNavigation(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin) return false;
  // Hanya beda #hash = gulir di halaman yang sama, bukan pindah halaman.
  return url.pathname !== location.pathname || url.search !== location.search;
}

export default function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const safety = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const start = () => {
      setPhase("loading");
      clearTimeout(safety.current);
      safety.current = setTimeout(() => setPhase("done"), SAFETY_MS);
    };
    const onClick = (event: MouseEvent) => isInternalNavigation(event) && start();
    document.addEventListener("click", onClick);
    window.addEventListener(START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(START_EVENT, start);
      clearTimeout(safety.current);
    };
  }, []);

  // Alamat berubah = halaman tujuan sudah tampil: penuhi bar lalu pudarkan. Disesuaikan saat
  // render (bukan di effect) agar tidak ada render berantai.
  const location = `${pathname}?${search}`;
  const [seen, setSeen] = useState(location);
  if (seen !== location) {
    setSeen(location);
    if (phase === "loading") setPhase("done");
  }

  useEffect(() => {
    if (phase === "loading") return;
    clearTimeout(safety.current);
    if (phase !== "done") return;
    const t = setTimeout(() => setPhase("idle"), 450);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "idle") return null;
  return (
    <div
      role="progressbar"
      aria-label="Memuat halaman"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
    >
      <div
        className={
          phase === "loading"
            ? "h-full origin-left animate-nav-progress bg-brand shadow-[0_0_8px_var(--brand)]"
            : "h-full origin-left bg-brand opacity-0 shadow-[0_0_8px_var(--brand)] transition-opacity delay-150 duration-300"
        }
      />
    </div>
  );
}
