"use client";

import { useEffect, useRef, useState } from "react";

/** Menjadi `true` saat elemen pertama kali terlihat di layar, lalu tetap `true`. */
export function useInView(threshold = 0.3) {
  const ref = useRef(null);
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
