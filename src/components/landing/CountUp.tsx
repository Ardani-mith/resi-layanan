"use client";

import { useEffect, useState } from "react";
import { useInView, useReducedMotion } from "@/lib/hooks";

// Bilangan dalam teks, termasuk desimal berkoma ("6,8") sebagai satu bilangan.
const NUMBER = /\d+(?:,\d+)?/g;

/**
 * Teks `value` dengan setiap bilangannya di titik `progress` (0–1, ease-out),
 * format & jumlah desimal dipertahankan: countUpFrame("6,8 hari", 0) → "0,0 hari".
 */
export function countUpFrame(value: string, progress: number): string {
  const eased = 1 - (1 - progress) ** 3;
  return value.replace(NUMBER, (match) => {
    const decimals = match.split(",")[1]?.length ?? 0;
    const current = Number(match.replace(",", ".")) * eased;
    return current.toFixed(decimals).replace(".", ",");
  });
}

/**
 * Angka menghitung naik dari nol saat pertama terlihat. Render server & tanpa JS:
 * langsung nilai akhir (tidak ada hydration mismatch, tetap terbaca).
 */
export default function CountUp({
  value,
  duration = 1400,
  className,
}: {
  value: string;
  duration?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const reducedMotion = useReducedMotion();
  const [frame, setFrame] = useState<string | null>(null);

  useEffect(() => {
    if (!inView || reducedMotion) return undefined;
    let id = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = (now - startedAt) / duration;
      if (progress >= 1) return setFrame(null);
      setFrame(countUpFrame(value, progress));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [inView, reducedMotion, value, duration]);

  return (
    <span ref={ref} className={className}>
      {/* Pembaca layar hanya membaca nilai akhir, bukan setiap frame animasi. */}
      <span aria-hidden>{frame ?? value}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
