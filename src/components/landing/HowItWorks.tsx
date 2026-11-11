"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  BellRing,
  Check,
  ClipboardCheck,
  type LucideIcon,
  PackageCheck,
  ReceiptText,
  Stamp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SpotlightCard from "@/components/landing/SpotlightCard";
import { SectionLabel } from "@/components/ui";
import type { site } from "@/config/site";
import { cn } from "@/lib/cn";

gsap.registerPlugin(ScrollTrigger);

// "Cara kerja" sebagai scrollytelling (pola sticky-scroll situs Awwwards). Layar ≥1024px: kolom kiri
// (label + judul + tiruan halaman lacak) menempel, langkah di kanan digulir satu per satu. Judul
// muncul kata demi kata saat bagian mulai digulir; kartu langkah yang sedang dibaca terangkat
// (bingkai biru), yang lain datar bergaris putus; tiruan ikut berganti (status, tahap, progres,
// kabar terbaru) dan rel di samping langkah terisi mengikuti scroll. Layar kecil: judul + kartu.

type Data = typeof site.howItWorks;
type StageState = "done" | "now" | "next";

/** Ikon per langkah (urutan sama dengan `steps`): resi, verifikasi, terbit, ambil. */
const STEP_ICONS: LucideIcon[] = [ReceiptText, ClipboardCheck, Stamp, PackageCheck];

const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export default function HowItWorks({
  data,
  resi,
  index,
  label,
  titleId,
}: {
  data: Data;
  resi: string;
  index: string;
  label: string;
  titleId: string;
}) {
  const { steps, demo, title } = data;
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    const rail = railRef.current;
    if (!root || !list || !rail) return;
    const mm = gsap.matchMedia();
    // Judul muncul kata demi kata mengikuti scroll (semua ukuran layar).
    mm.add(MOTION_OK, () => {
      gsap.fromTo(
        root.querySelectorAll("[data-tword]"),
        { opacity: 0.12, y: 14 },
        {
          opacity: 1,
          y: 0,
          ease: "none",
          stagger: 0.12,
          scrollTrigger: { trigger: root, start: "top 85%", end: "top 30%", scrub: 0.4 },
        },
      );
    });
    mm.add("(min-width: 1024px)", () => {
      for (const [i, el] of gsap.utils.toArray<HTMLElement>("[data-step]", list).entries()) {
        ScrollTrigger.create({
          trigger: el,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) setActive(i);
          },
        });
      }
      gsap.fromTo(
        rail,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: list, start: "top center", end: "bottom center", scrub: true },
        },
      );
    });
    return () => mm.revert();
  }, []);

  const frame = demo.frames[active];
  const last = active === demo.frames.length - 1;
  const stateOf = (i: number): StageState =>
    i < frame.active ? "done" : i === frame.active ? "now" : "next";

  // Judul dua bagian: sebelum koma (tinta) & sesudahnya (biru), dipecah per kata untuk animasi.
  const [lead, ...rest] = title.split(", ");
  const parts = [
    { text: rest.length ? `${lead},` : lead, accent: false },
    { text: rest.join(", "), accent: true },
  ].filter((p) => p.text);

  return (
    <div ref={rootRef} className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 xl:gap-24">
      {/* Kiri: judul + tiruan halaman lacak, menempel selama langkah digulir (desktop). */}
      <div className="lg:sticky lg:top-[max(1.5rem,calc(50vh-22rem))] lg:self-start">
        <SectionLabel index={index}>{label}</SectionLabel>
        <h2
          id={titleId}
          className="mt-6 max-w-xl text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.06] font-semibold tracking-[-0.04em] text-balance"
        >
          {parts.map((part) =>
            part.text.split(" ").map((word, i) => (
              <span
                key={`${part.text}-${i}`}
                data-tword
                className={cn("inline-block", part.accent && "text-brand")}
              >
                {word}&nbsp;
              </span>
            )),
          )}
        </h2>

        <div aria-hidden className="mt-8 hidden lg:block">
          <SpotlightCard className="p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs tracking-[0.12em] text-muted uppercase">{demo.label}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-500",
                  last ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand",
                )}
              >
                {frame.status}
              </span>
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold tracking-wider">{resi}</p>
            <p className="text-sm text-muted">{demo.service}</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
                style={{
                  width: `${Math.round(((frame.active + (last ? 1 : 0.5)) / demo.stages.length) * 100)}%`,
                }}
              />
            </div>
            <ol className="mt-4 space-y-0.5">
              {demo.stages.map((name, i) => {
                const state = stateOf(i);
                return (
                  <li
                    key={name}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-500",
                      state === "now" && "bg-brand-soft",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border transition-colors duration-500",
                        state === "done" && "border-ok bg-ok text-surface",
                        state === "now" && "border-brand bg-surface",
                        state === "next" && "border-line",
                      )}
                    >
                      {state === "done" && <Check className="size-3.5" strokeWidth={3} />}
                      {state === "now" && (
                        <span className="size-2 rounded-full bg-brand motion-safe:animate-pulse" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        state === "next" ? "text-muted" : "font-medium",
                      )}
                    >
                      {name}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted">
                      {state === "done" ? "selesai" : state === "now" ? frame.left : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
            {/* Kabar terbaru: muncul ulang tiap langkah berganti. */}
            <p
              key={active}
              className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-3.5 text-sm motion-safe:animate-[fade-up_0.5s_ease-out_both]"
            >
              <BellRing className="mt-0.5 size-4 shrink-0 text-brand" />
              {frame.note}
            </p>
          </SpotlightCard>
        </div>
      </div>

      {/* Kanan: kartu langkah di atas rel progres. */}
      <div className="relative mt-10 lg:mt-0">
        <span aria-hidden className="absolute inset-y-0 left-1.5 hidden w-px bg-line lg:block">
          <span ref={railRef} className="block h-full origin-top scale-y-0 bg-brand" />
        </span>
        <ol ref={listRef} className="grid gap-4 sm:grid-cols-2 lg:block">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? ReceiptText;
            const on = active === i;
            return (
              <li
                key={step.title}
                data-step
                aria-current={on ? "step" : undefined}
                className="relative lg:flex lg:min-h-[52vh] lg:items-center lg:pl-10"
              >
                {/* Titik penanda di rel. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1/2 left-0 hidden size-3.5 -translate-y-1/2 rounded-full border-2 transition-colors duration-500 lg:block",
                    on
                      ? "border-brand bg-brand shadow-[0_0_0_5px_var(--brand-soft)]"
                      : "border-line bg-surface",
                  )}
                />
                <div
                  className={cn(
                    "reveal relative h-full w-full overflow-hidden rounded-3xl border bg-surface p-6 shadow-card transition-[opacity,scale,border-color,box-shadow,background-color] duration-500 sm:p-7",
                    on
                      ? "border-brand/40 lg:shadow-[0_30px_60px_-30px_color-mix(in_srgb,var(--brand)_55%,transparent)]"
                      : "border-line lg:scale-[0.97] lg:border-dashed lg:bg-transparent lg:opacity-45 lg:shadow-none",
                  )}
                >
                  {/* Angka besar bergaris sebagai latar kartu. */}
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute -top-4 -right-1 font-sans text-[5.5rem] leading-none font-bold tracking-[-0.06em] text-transparent tabular-nums transition-colors duration-500 select-none sm:-top-5 sm:text-[7.5rem]",
                      on
                        ? "[-webkit-text-stroke:1.5px_color-mix(in_srgb,var(--brand)_30%,transparent)]"
                        : "[-webkit-text-stroke:1.5px_var(--line)]",
                    )}
                  >
                    0{i + 1}
                  </span>
                  <div className="relative flex items-center gap-3">
                    <span
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-2xl transition-colors duration-500",
                        on ? "bg-brand text-on-brand" : "bg-brand-soft text-brand",
                      )}
                    >
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 font-mono text-xs text-muted">
                      {step.time}
                    </span>
                  </div>
                  <h3 className="relative mt-6 text-xl font-semibold tracking-[-0.02em] lg:text-[1.75rem] lg:leading-tight lg:tracking-[-0.03em]">
                    <span className="sr-only">Langkah {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="relative mt-2 max-w-md text-muted lg:text-lg">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
