"use client";

import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

// Tombol ajakan utama (CTA), sengaja berbeda dari Button biasa: bentuk pil + bulatan panah,
// cahaya yang berputar di tepi (`cta-ring`, globals.css), pendar mengikuti kursor, sedikit
// "tertarik" ke arah kursor (magnet), panah meluncur keluar-masuk saat disorot, mengecil saat
// ditekan. Posisi kursor disimpan sebagai variabel CSS, jadi tanpa render ulang React.
// Layar sentuh: tanpa magnet/pendar. "Kurangi gerakan": cahaya diam, tanpa geser.

const VARIANTS = {
  // Biru brand di latar terang.
  solid: {
    base: "bg-brand text-on-brand shadow-[0_12px_30px_-12px_var(--brand)] hover:shadow-[0_20px_44px_-14px_var(--brand)]",
    chip: "bg-[color-mix(in_srgb,currentColor_16%,transparent)]",
    ring: "[--cta-ring:rgb(255_255_255/0.95)] focus-visible:outline-brand",
  },
  // Putih di atas panel gelap (hero/penutup/kartu pengajuan).
  light: {
    base: "bg-white text-[#0c1f5c] shadow-[0_12px_30px_-12px_rgb(0_0_0/0.6)] hover:shadow-[0_20px_44px_-14px_rgb(168_194_255/0.7)]",
    chip: "bg-[#0c1f5c] text-white",
    ring: "[--cta-ring:#2156d9] focus-visible:outline-white",
  },
  // Garis kaca di atas panel gelap: ajakan kedua.
  glass: {
    base: "border border-hero-line-strong bg-white/[0.06] text-hero-fg backdrop-blur hover:bg-white/[0.11]",
    chip: "bg-white text-[#0c1f5c]",
    ring: "[--cta-ring:var(--hero-accent)] focus-visible:outline-white",
  },
};

export type CtaVariant = keyof typeof VARIANTS;

function track(event: PointerEvent<HTMLAnchorElement>) {
  if (event.pointerType !== "mouse") return;
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  el.style.setProperty("--cta-x", `${x}px`);
  el.style.setProperty("--cta-y", `${y}px`);
  // Magnet: geser maks. ±5px mendatar, ±3px tegak ke arah kursor.
  el.style.setProperty("--cta-mx", `${(x / rect.width - 0.5) * 10}px`);
  el.style.setProperty("--cta-my", `${(y / rect.height - 0.5) * 6}px`);
}

function release(event: PointerEvent<HTMLAnchorElement>) {
  event.currentTarget.style.setProperty("--cta-mx", "0px");
  event.currentTarget.style.setProperty("--cta-my", "0px");
}

export default function CtaButton({
  variant = "solid",
  icon: Icon = ArrowRight,
  chip = true,
  className,
  children,
  ...props
}: {
  variant?: CtaVariant;
  icon?: LucideIcon;
  /** false = tanpa bulatan panah (ajakan kedua yang lebih ringan): teks + panah kecil. */
  chip?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  const v = VARIANTS[variant];
  return (
    <Link
      {...props}
      onPointerMove={track}
      onPointerLeave={release}
      className={cn(
        "group/cta relative isolate inline-flex min-h-12 items-center justify-between rounded-full py-1.5 text-sm font-semibold",
        chip ? "gap-3 pr-1.5 pl-6" : "gap-2 px-6",
        "[translate:var(--cta-mx,0px)_var(--cta-my,0px)] transition-[translate,scale,box-shadow,background-color] duration-300 ease-out active:scale-[0.97]",
        "focus-visible:outline-2 focus-visible:outline-offset-3 motion-reduce:[translate:none] motion-reduce:active:scale-100",
        v.base,
        v.ring,
        className,
      )}
    >
      {/* Cahaya berputar di tepi: hanya saat disorot/difokus (saat diam tepi bersih, juga di tangkapan layar). */}
      <span
        aria-hidden
        className="cta-ring opacity-0 transition-opacity duration-300 group-hover/cta:opacity-100 group-focus-visible/cta:opacity-100"
      />
      {/* Pendar lembut yang mengikuti kursor. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/cta:opacity-100"
        style={{
          background:
            "radial-gradient(90px circle at var(--cta-x, 50%) var(--cta-y, 50%), color-mix(in srgb, var(--cta-ring) 38%, transparent), transparent 70%)",
        }}
      />
      <span className="whitespace-nowrap">{children}</span>
      {/* Bulatan panah: panah lama meluncur keluar ke kanan, panah baru masuk dari kiri. */}
      <span
        aria-hidden
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden",
          chip
            ? cn("size-9 rounded-full transition-transform duration-300 group-hover/cta:scale-105", v.chip)
            : "size-4",
        )}
      >
        <Icon className="size-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-[180%] motion-reduce:transition-none" />
        <Icon className="absolute size-4 -translate-x-[180%] transition-transform duration-300 ease-out group-hover/cta:translate-x-0 motion-reduce:transition-none" />
      </span>
    </Link>
  );
}
