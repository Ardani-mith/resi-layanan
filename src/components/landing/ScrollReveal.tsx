"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

// Efek scroll beranda (GSAP ScrollTrigger), semuanya mati saat "kurangi gerakan" (teks/isi tampil
// apa adanya). Teks tetap utuh di DOM, jadi pembaca layar membaca kalimat biasa.

const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/** Kalimat besar yang kata-katanya menyala satu per satu mengikuti scroll (pola "text reveal"). */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo(
        el.querySelectorAll("[data-word]"),
        { opacity: 0.16 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 50%", scrub: true },
        },
      );
    });
    return () => mm.revert();
  }, []);

  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={i} data-word>
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}

/**
 * Tanda di tabel muncul berurutan saat tabel masuk layar: `[data-mark]` baris demi baris, lalu
 * `[data-mark="pantas"]` dengan penekanan lebih kuat (kolom pembeda).
 */
export function MarkReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 72%", once: true } });
      tl.from(el.querySelectorAll('[data-mark="other"]'), {
        opacity: 0,
        scale: 0.4,
        duration: 0.35,
        ease: "back.out(2)",
        stagger: 0.035,
      }).from(
        el.querySelectorAll('[data-mark="pantas"]'),
        { opacity: 0, scale: 0.2, duration: 0.5, ease: "back.out(3)", stagger: 0.08 },
        "-=0.1",
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

const DESKTOP_MOTION = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

/**
 * Visual produk yang "dibuka" saat digulir: mulai miring 3D ke belakang (tepi atas diam, bagian
 * bawah condong) & sedikit kecil, lalu rata dan penuh begitu naik ke layar. Desktop saja.
 */
export function ScrollTilt({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(DESKTOP_MOTION, () => {
      gsap.fromTo(
        el,
        { rotateX: 16, scale: 0.94, transformPerspective: 1600, transformOrigin: "50% 0%" },
        {
          rotateX: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 100%", end: "top 22%", scrub: 0.6 },
        },
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Parallax halus: isi bergeser naik lebih lambat dari scroll saat bagiannya ditinggalkan. Desktop. */
export function ScrollParallax({
  children,
  className,
  distance = 80,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(DESKTOP_MOTION, () => {
      gsap.to(el, {
        y: -distance,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
    });
    return () => mm.revert();
  }, [distance]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * Adegan yang menempel sementara isinya muncul berurutan mengikuti scroll (desktop): pembungkus ini
 * memberi jarak gulir, anak pertamanya sebaiknya `lg:sticky`. Elemen `[data-seq]` muncul satu per
 * satu sesuai urutan di DOM. Layar kecil / "kurangi gerakan": semua langsung tampil.
 */
export function ScrollSequence({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(DESKTOP_MOTION, () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 30%", end: "bottom 85%", scrub: 0.5 },
      });
      for (const item of gsap.utils.toArray<HTMLElement>("[data-seq]", el)) {
        tl.from(item, { opacity: 0, y: 28, scale: 0.97, duration: 1, ease: "power2.out" }, "+=0.35");
      }
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
