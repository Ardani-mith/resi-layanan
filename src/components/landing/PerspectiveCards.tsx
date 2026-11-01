"use client";

import { ArrowRight, Check, Plus } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useRef, useState } from "react";
import { PixelCard } from "@/components/landing/PixelArt";
import SpotlightCard from "@/components/landing/SpotlightCard";
import type { site } from "@/config/site";
import { cn } from "@/lib/cn";

type Item = (typeof site.perspectives.items)[number];

// "Expanding cards": di layar ≥1280px keempat kartu berjajar; kartu yang disorot (atau difokus
// keyboard) melebar dan menampilkan detail, yang lain menyempit jadi label ringkas. Kartu terakhir
// yang disorot tetap terbuka. Layar lebih kecil: semua kartu terbuka penuh (1 kolom / 2×2).
// Agar mulus: teks detail & kanvas langit piksel diberi lebar tetap (kartu hanya "membuka jendela"),
// jadi tidak ada teks yang mengalir ulang atau kanvas yang digambar ulang selama kartu melebar.
// Sorotan baru dianggap setelah kursor diam sebentar, supaya kartu tidak melompat saat dilintasi.

const HOVER_INTENT_MS = 90;

export default function PerspectiveCards({
  items,
  visuals,
}: {
  items: readonly Item[];
  visuals: ReactNode[];
}) {
  const [active, setActive] = useState(0);
  const intent = useRef<ReturnType<typeof setTimeout>>(undefined);

  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:flex xl:h-[35rem] xl:gap-3">
      {items.map((item, i) => {
        const open = active === i;
        return (
          <li
            key={item.role}
            data-open={open}
            onPointerEnter={() => {
              clearTimeout(intent.current);
              intent.current = setTimeout(() => setActive(i), HOVER_INTENT_MS);
            }}
            onPointerLeave={() => clearTimeout(intent.current)}
            onFocus={() => setActive(i)}
            className="group/card reveal min-w-0 xl:flex-[1_1_0] xl:transition-[flex-grow] xl:duration-[650ms] xl:ease-[cubic-bezier(0.22,1,0.36,1)] xl:data-[open=true]:grow-[3.2]"
          >
            <SpotlightCard className="flex h-full flex-col">
              <div aria-hidden className="p-2 pb-0">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.1rem] sm:aspect-[16/10] lg:aspect-[4/3] xl:aspect-auto xl:h-52">
                  {/* Kanvas selebar kartu terbuka & di tengah; kartu sempit hanya menampilkan bagian tengahnya. */}
                  <div className="absolute inset-0 xl:right-auto xl:left-1/2 xl:w-[46rem] xl:-translate-x-1/2">
                    <PixelCard
                      tone={item.tone}
                      seed={i * 17}
                      className="aspect-auto h-full sm:aspect-auto lg:aspect-auto xl:aspect-auto"
                    />
                  </div>
                  {/* Kartu kaca: miring mengikuti kursor; di kartu yang menyempit disembunyikan. */}
                  <div className="absolute inset-0 grid place-items-center p-5 sm:p-6">
                    <div className="grid w-full place-items-center transition-[transform,scale,opacity] duration-500 ease-out motion-safe:[transform:perspective(900px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] xl:scale-90 xl:opacity-0 xl:group-data-[open=true]/card:scale-100 xl:group-data-[open=true]/card:opacity-100 xl:group-data-[open=true]/card:delay-200 spot-on:scale-[1.04]">
                      {visuals[i]}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dua isi yang bertumpuk di sel grid yang sama: ringkas (kartu sempit) & detail. */}
              <div className="grid flex-1 overflow-hidden p-6 pt-5 sm:p-7 sm:pt-6">
                <div
                  aria-hidden
                  className="hidden w-[7rem] flex-col transition-opacity duration-300 [grid-area:1/1] min-[1400px]:w-[8.5rem] xl:flex xl:delay-200 xl:group-data-[open=true]/card:pointer-events-none xl:group-data-[open=true]/card:opacity-0 xl:group-data-[open=true]/card:delay-0"
                >
                  <p className="font-mono text-sm text-brand">{item.role}</p>
                  <p className="mt-3 text-lg leading-snug font-semibold tracking-[-0.02em]">{item.title}</p>
                  {/* Isi bagian bawah kartu sempit: nomor besar + ajakan membuka. */}
                  <div className="mt-auto flex items-end justify-between gap-2">
                    <span className="font-mono text-5xl leading-none font-semibold tracking-[-0.06em] text-line">
                      0{i + 1}
                    </span>
                    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors group-hover/card:border-brand group-hover/card:text-brand">
                      <Plus className="size-4" />
                    </span>
                  </div>
                </div>

                <div className="flex flex-col transition-opacity duration-300 [grid-area:1/1] xl:w-[30rem] xl:opacity-0 xl:group-data-[open=true]/card:opacity-100 xl:group-data-[open=true]/card:delay-200 2xl:w-[34rem]">
                  <p className="font-mono text-sm text-muted">
                    0{i + 1} <span className="ml-2 text-brand">{item.role}</span>
                  </p>
                  <h3 className="mt-2 text-[1.5rem] leading-tight font-semibold tracking-[-0.025em]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-muted">{item.body}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {item.points.map((point) => (
                      <li key={point} className="flex gap-2.5">
                        <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                          <Check aria-hidden className="size-3" strokeWidth={3} />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                  {/* Seluruh kartu bisa diklik: area tautan direntangkan menutupi kartu. */}
                  <Link
                    href={item.cta.href}
                    transitionTypes={["nav-forward"]}
                    className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-brand outline-none after:absolute after:inset-0 after:z-20 after:rounded-3xl"
                  >
                    {item.cta.label}
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform duration-300 spot-on:translate-x-1"
                    />
                  </Link>
                </div>
              </div>
            </SpotlightCard>
          </li>
        );
      })}
    </ul>
  );
}
