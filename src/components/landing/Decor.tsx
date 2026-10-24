// Hiasan landing page.

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Label bagian bergaya dokumen: nomor mono + nama + garis rambut, seperti penomoran pasal.
 * Sengaja bukan "pil" berwarna (pola template yang terlalu umum).
 */
export function SectionLabel({
  index,
  className,
  children,
}: {
  index: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-mono text-xs tracking-[0.14em] text-muted uppercase",
        className,
      )}
    >
      <span className="text-brand">{index}</span>
      <span>{children}</span>
      <span aria-hidden className="h-px flex-1 bg-line" />
    </p>
  );
}

/** Kepala halaman warga: label kop + judul besar + pengantar, selaras dengan beranda. */
export function PageHeader({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header>
      <SectionLabel index="§">{label}</SectionLabel>
      <h1 className="mt-5 text-[clamp(2rem,5vw,2.9rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance">
        {title}
      </h1>
      {children && <p className="mt-3 max-w-2xl text-lg text-muted">{children}</p>}
    </header>
  );
}
