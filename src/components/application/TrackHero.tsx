import Link from "next/link";
import type { ReactNode } from "react";
import ResiSearch from "@/components/application/ResiSearch";
import Spotlight from "@/components/landing/Spotlight";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";

/**
 * Kepala gelap halaman lacak, senada dengan hero beranda: gradien navy → biru, grid tipis, sorot
 * cahaya. Ditarik ke bawah navbar transparan (h-16 + garis 1px); seluruhnya [data-header-dark]
 * sehingga teks navbar putih di atasnya.
 * - biasa: kartu isi di bawahnya menumpuk ke tepi bawah (`pb-24`) lewat margin negatif;
 * - `full`: setinggi layar & isi di tengah, gradien kembali gelap di bawah agar menyambung ke
 *   footer tanpa celah terang (halaman cek resi & resi tidak ditemukan).
 */
export default function TrackHero({
  full = false,
  className,
  children,
}: {
  full?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-header-dark
      className={cn(
        "relative isolate -mt-[calc(4rem+1px)] overflow-hidden pt-[calc(4rem+1px)] pb-24 text-hero-fg",
        full && "flex min-h-dvh flex-col justify-center",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className={cn(
            "absolute inset-0",
            full
              ? "bg-[linear-gradient(to_bottom,var(--hero-g1)_0%,var(--hero-g2)_40%,color-mix(in_srgb,var(--hero-g3)_55%,var(--hero-g2))_68%,var(--hero-g1)_100%)]"
              : "bg-[linear-gradient(to_bottom,var(--hero-g1)_0%,var(--hero-g2)_62%,color-mix(in_srgb,var(--hero-g3)_70%,var(--hero-g2))_100%)]",
          )}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_75%_70%_at_50%_0%,#000_35%,transparent_100%)] bg-[size:56px_56px]" />
        <Spotlight className="top-0 left-[10%] lg:left-[32%]" />
        {/* Garis cahaya tipis di tepi bawah, tempat kartu isi menumpuk. */}
        {!full && (
          <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-hero-accent/50 to-transparent" />
        )}
      </div>
      <div className="relative px-page pt-8 sm:pt-12">{children}</div>
    </section>
  );
}

/** Isi hero `full` untuk mencari resi: judul, pengantar, kolom cek resi, tautan lupa resi. */
export function TrackSearchHero({
  title,
  body,
  autoFocus = false,
  children,
}: {
  title: string;
  body: string;
  autoFocus?: boolean;
  /** hiasan di atas judul (mis. label kecil) */
  children?: ReactNode;
}) {
  return (
    <TrackHero full>
      <div className="mx-auto max-w-2xl text-center">
        {children}
        <h1 className="text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-hero-muted">{body}</p>
        <div className="mt-9 text-left">
          <ResiSearch example={site.hero.exampleResi} variant="hero" autoFocus={autoFocus} />
        </div>
        <p className="mt-8 text-sm text-hero-muted">
          Lupa nomor resi?{" "}
          <Link
            href="/lacak/lupa"
            transitionTypes={["nav-forward"]}
            className="font-semibold text-hero-fg underline-offset-4 hover:underline"
          >
            Cari dengan NIK & nomor HP
          </Link>
        </p>
      </div>
    </TrackHero>
  );
}
