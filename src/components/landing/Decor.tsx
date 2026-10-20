// Hiasan & ikon landing page.

import {
  BarChart3,
  BellRing,
  FilePlus2,
  FileWarning,
  LayoutDashboard,
  ListOrdered,
  Lock,
  type LucideProps,
  ShieldCheck,
  Smartphone,
  Star,
  Timer,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Nama ikon di src/config/site.ts → komponen lucide (config tetap data polos). */
const ICONS = {
  bell: BellRing,
  chart: BarChart3,
  dashboard: LayoutDashboard,
  file: FilePlus2,
  fix: FileWarning,
  lock: Lock,
  phone: Smartphone,
  queue: ListOrdered,
  shield: ShieldCheck,
  star: Star,
  timer: Timer,
};
export type IconName = keyof typeof ICONS;

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const Component = ICONS[name];
  return <Component aria-hidden {...props} />;
}

/** Label kecil berhuruf kapital dengan titik persegi. `tone="hero"` untuk latar hero/penutup. */
export function Eyebrow({
  tone = "default",
  className,
  children,
}: {
  tone?: "default" | "hero";
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex w-fit items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold tracking-[0.08em] uppercase",
        tone === "hero" ? "bg-hero-soft text-hero-muted" : "bg-brand-soft text-brand",
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5", tone === "hero" ? "bg-hero-accent" : "bg-brand")} />
      {children}
    </p>
  );
}

/** Pita garis miring pemisah bagian (gaya blueprint). */
export function Hatch({ className }: { className?: string }) {
  return <div aria-hidden className={cn("h-9 border-y border-hero-line pattern-hatch", className)} />;
}

function Crosshair({ className }: { className: string }) {
  return (
    <span className={cn("absolute size-[11px] -translate-x-1/2 -translate-y-1/2", className)}>
      <span className="absolute top-0 left-[5px] h-full w-px bg-hero-line-strong" />
      <span className="absolute top-[5px] left-0 h-px w-full bg-hero-line-strong" />
    </span>
  );
}

/** Garis panduan tipis dengan tanda "+" di persilangan; hanya di layar lebar. */
export function GuideLines() {
  const line = "absolute bg-hero-line";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      <span className={cn(line, "inset-y-0 left-0 w-px")} />
      <span className={cn(line, "inset-y-0 right-0 w-px")} />
      <span className={cn(line, "inset-x-0 top-10 h-px")} />
      <Crosshair className="top-10 left-0" />
      <Crosshair className="top-10 left-full" />
    </div>
  );
}
