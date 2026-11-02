"use client";

import type { PointerEvent } from "react";
import { maskStyle } from "@/components/Logo";
import { cn } from "@/lib/cn";

// Lapisan loading bergaya kaca di atas kerangka (absolute, menutupi induknya yang `relative`):
// - sapuan kilau diagonal yang terus melintas, seperti pantulan di permukaan kaca;
// - pantulan cahaya yang mengikuti kursor;
// - kartu kaca buram (posisi bebas lewat `position`) berisi logo P dengan cincin berputar,
//   teks status, dan bar progres berjalan; kartunya miring mengikuti kursor.
// Hiasan saja (aria-hidden): status untuk pembaca layar ada di pembungkusnya (LoadingFrame).

function track(event: PointerEvent<HTMLDivElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  el.style.setProperty("--gx", `${x * 100}%`);
  el.style.setProperty("--gy", `${y * 100}%`);
  el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
  el.style.setProperty("--rx", `${(0.5 - y) * 14}deg`);
}

function reset(event: PointerEvent<HTMLDivElement>) {
  event.currentTarget.style.setProperty("--rx", "0deg");
  event.currentTarget.style.setProperty("--ry", "0deg");
}

export default function LoadingGlass({
  label,
  position = "top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2",
}: {
  label: string;
  /** Kelas posisi kartu kaca (absolute di dalam induk), mis. "top-24 left-1/2 -translate-x-1/2". */
  position?: string;
}) {
  return (
    <div
      aria-hidden
      onPointerMove={track}
      onPointerLeave={reset}
      className="group/glass absolute inset-0 z-10 overflow-hidden rounded-[inherit]"
    >
      {/* Sapuan kilau kaca. */}
      <div className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/45 to-transparent motion-safe:animate-glass-sweep dark:via-white/10" />
      {/* Pantulan yang mengikuti kursor. */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/glass:opacity-100"
        style={{
          background:
            "radial-gradient(260px circle at var(--gx, 50%) var(--gy, 30%), color-mix(in srgb, var(--brand) 14%, transparent), transparent 70%)",
        }}
      />

      <div className={cn("absolute", position)}>
        <div className="flex [transform:perspective(700px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] items-center gap-3.5 rounded-2xl border border-white/70 bg-surface/55 py-3 pr-5 pl-3 shadow-[0_24px_60px_-24px_rgb(15_27_45/0.45),inset_0_1px_0_rgb(255_255_255/0.6)] backdrop-blur-xl transition-transform duration-300 ease-out dark:border-white/10 dark:shadow-[0_24px_60px_-24px_rgb(0_0_0/0.7),inset_0_1px_0_rgb(255_255_255/0.08)]">
          {/* Logo P dengan cincin berputar (gradien kerucut yang dimask jadi cincin). */}
          <span className="relative grid size-11 shrink-0 place-items-center">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,var(--brand),transparent_75%)] [mask:radial-gradient(farthest-side,transparent_calc(100%-3px),#000_calc(100%-2.5px))] motion-safe:animate-spin" />
            <span className="absolute inset-[5px] rounded-full bg-surface/70" />
            <span
              className="relative aspect-[293/358] h-5 bg-brand"
              style={maskStyle("/brand/pantas-p.png")}
            />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium whitespace-nowrap">{label}</span>
            <span className="mt-2 block h-1 w-40 overflow-hidden rounded-full bg-line/70">
              <span className="block h-full w-1/3 rounded-full bg-brand motion-safe:animate-indeterminate" />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
