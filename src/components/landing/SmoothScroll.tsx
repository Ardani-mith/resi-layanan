"use client";

import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll halus di beranda (Lenis), disinkronkan dengan GSAP ScrollTrigger. Tetap memakai scroll
 * bawaan halaman (CSS scroll-driven & tautan jangkar tetap jalan); layar sentuh memakai scroll asli.
 * Mati saat "kurangi gerakan". Saat beranda disembunyikan <Activity>, efek dilepas (destroy).
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.12, anchors: true });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);
  return null;
}
