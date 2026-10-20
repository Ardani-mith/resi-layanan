"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/hooks/useInView";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { countUpFrame } from "@/lib/count-up";

/**
 * Angka menghitung naik dari nol saat pertama terlihat. Render server & tanpa JS:
 * langsung nilai akhir (tidak ada hydration mismatch, tetap terbaca).
 */
export default function CountUp({ value, duration = 1400, className }) {
  const { ref, inView } = useInView();
  const reducedMotion = useReducedMotion();
  const [frame, setFrame] = useState(null);

  useEffect(() => {
    if (!inView || reducedMotion) return undefined;
    let id = 0;
    const startedAt = performance.now();
    const tick = (now) => {
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
