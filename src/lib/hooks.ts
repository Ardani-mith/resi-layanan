// Hook React untuk Client Component. Tanpa "use client": modul ini tidak dirender
// sendiri, hanya diimpor oleh komponen yang sudah client.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// --- useNow: satu jam bersama untuk semua hitung mundur di halaman -------------------
// Saat render server & hidrasi, snapshot = null, sehingga komponen memakai waktu
// dari server dulu (tanpa hydration mismatch), lalu beralih ke jam browser.

const TICK_MS = 15_000;
let current: number | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribeNow(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      listeners.forEach((l) => l());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * Waktu "sekarang" sistem dalam ms. `serverNow` = waktu saat server merender,
 * `offsetMs` = geseran mode demo, supaya hitung mundur di browser ikut maju.
 */
export function useNow(serverNow: string | Date, offsetMs = 0): number {
  const clientNow = useSyncExternalStore(
    subscribeNow,
    () => current ?? (current = Date.now()),
    () => null,
  );
  return clientNow === null ? new Date(serverNow).getTime() : clientNow + offsetMs;
}

// --- useAutoRefresh -----------------------------------------------------------------

/**
 * Render ulang Server Component secara berkala (router.refresh), hanya saat tab
 * terlihat, supaya data antrean/status tetap segar tanpa membebani saat tab di latar.
 */
export function useAutoRefresh(intervalMs: number, enabled = true) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs, enabled, router]);
}

// --- useInView ----------------------------------------------------------------------

/** Menjadi `true` saat elemen pertama kali terlihat di layar, lalu tetap `true`. */
export function useInView<T extends Element = HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || inView) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setInView(true);
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, inView]);

  return { ref, inView };
}

// --- useReducedMotion ---------------------------------------------------------------

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** `true` jika pengguna meminta sistem mengurangi gerakan. Saat render server: false. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}
