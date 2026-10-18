"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Render ulang Server Component secara berkala (router.refresh), hanya saat tab
 * terlihat, supaya data antrean/status tetap segar tanpa membebani saat tab di latar.
 */
export function useAutoRefresh(intervalMs, enabled = true) {
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
