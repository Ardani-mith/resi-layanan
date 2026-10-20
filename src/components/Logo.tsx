// Logo Pantas. "P" khusus: batang = garis waktu, lengkung = cincin progres yang belum
// tertutup, dan bulatan di celahnya = tahap yang sedang aktif (seperti titik di timeline
// pelacakan). Sisanya ("antas") memakai huruf situs yang tebal & rapat.

import { site } from "@/config/site";
import { cn } from "@/lib/cn";

/** Geometri P (viewBox 0 0 82 100). Dipakai juga oleh favicon & gambar bukti resi. */
export const P_GLYPH = {
  viewBox: "0 0 82 100",
  stem: { width: 19, height: 100 },
  bowl: "M9.5 9.5 H50 A22 22 0 0 1 50 53.5",
  stroke: 19,
  dot: { cx: 34.5, cy: 53.5, r: 9.5 },
};

/** Glyph P; warna = currentColor, bulatan status = var(--logo-dot) (bawaan: currentColor). */
export function PGlyph({ className }: { className?: string }) {
  const { viewBox, stem, bowl, stroke, dot } = P_GLYPH;
  return (
    <svg viewBox={viewBox} fill="currentColor" aria-hidden className={className}>
      <rect width={stem.width} height={stem.height} />
      <path d={bowl} fill="none" stroke="currentColor" strokeWidth={stroke} />
      <circle {...dot} fill="var(--logo-dot, currentColor)" />
    </svg>
  );
}

/** Logo kata "Pantas". Ukuran mengikuti font-size (atur lewat className, mis. text-2xl). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block leading-none font-extrabold tracking-[-0.055em] whitespace-nowrap",
        className,
      )}
    >
      <span aria-hidden className="[--logo-dot:var(--brand)]">
        <PGlyph className="mr-[0.015em] inline-block h-[0.715em] w-auto align-baseline" />
        {site.name.slice(1)}
      </span>
      <span className="sr-only">{site.name}</span>
    </span>
  );
}

/** Ikon persegi (navy tetap di kedua tema) untuk ruang sempit, mis. sidebar yang diciutkan. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-[#0f1b2d] text-white ring-1 ring-white/10 [--logo-dot:#5aa2ec]",
        className,
      )}
    >
      <PGlyph className="h-[56%] w-auto translate-x-[4%]" />
    </span>
  );
}
