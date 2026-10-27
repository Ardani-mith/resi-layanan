// Kartu layanan di katalog: panel ilustrasi bernomor, label hasil layanan, judul, ringkasan,
// fakta singkat (tag), kinerja, dan bar ajakan. Ilustrasi dokumen (SVG) ada di DocumentArt:
// KTP-el, Kartu Keluarga, akta, atau dokumen umum untuk layanan baru buatan admin.

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { CatalogService } from "@/lib/dal";
import { formatPercent, formatWorkHours } from "@/lib/format";
import { AktaArt, GenericDocArt, KartuKeluargaArt, KtpArt } from "./DocumentArt";

const TINTS = 3;

const SHADOW = "drop-shadow-[0_20px_26px_rgb(15_27_45/0.3)]";

/** Dokumen yang menyerupai aslinya, sedikit miring di atas lembar kedua (lihat DocumentArt). */
function ServiceArt({ slug }: { slug: string }) {
  if (slug.includes("ktp")) {
    return (
      <div className={cn("relative w-[78%] -rotate-[5deg]", SHADOW)}>
        <span className="absolute inset-0 translate-x-3 translate-y-2 rotate-[7deg] rounded-[3.5%/5.6%] bg-sky-200/80" />
        <div className="relative">
          <KtpArt />
        </div>
      </div>
    );
  }
  if (slug.includes("kk") || slug.includes("keluarga")) {
    return (
      <div className={cn("relative w-[84%] rotate-[3deg]", SHADOW)}>
        <span className="absolute inset-0 -translate-x-2 translate-y-2 -rotate-[4deg] rounded-sm bg-white/70" />
        <div className="relative">
          <KartuKeluargaArt />
        </div>
      </div>
    );
  }
  if (slug.includes("akta")) {
    return (
      <div className={cn("relative w-[52%] -rotate-[4deg]", SHADOW)}>
        <span className="absolute inset-0 translate-x-3 translate-y-1 rotate-[6deg] rounded-sm bg-[#efe3c8]/80" />
        <div className="relative">
          <AktaArt />
        </div>
      </div>
    );
  }
  return (
    <div className={cn("relative w-[44%] rotate-[3deg]", SHADOW)}>
      <span className="absolute inset-0 -translate-x-3 translate-y-2 -rotate-[5deg] rounded-md bg-white/70" />
      <div className="relative">
        <GenericDocArt />
      </div>
    </div>
  );
}

export default function ServiceCard({ service, index }: { service: CatalogService; index: number }) {
  const tint = (index % TINTS) + 1;
  const style = {
    "--tint": `var(--tint-${tint})`,
    "--accent": `var(--tint-${tint}-accent)`,
  } as CSSProperties;
  const perf = service.performance;

  return (
    <Link
      href={`/layanan/${service.slug}`}
      transitionTypes={["nav-forward"]}
      style={style}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-card"
    >
      <div
        aria-hidden
        className="relative grid aspect-[16/11] place-items-center overflow-hidden bg-(--tint) bg-[radial-gradient(ellipse_at_30%_15%,var(--tint-glow),transparent_60%)] *:transition-transform *:duration-500 group-hover:*:scale-[1.03] sm:aspect-[6/5]"
      >
        <span className="absolute top-3 left-3 z-10 rounded-sm bg-surface px-2 py-1 text-[11px] font-medium text-text tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <ServiceArt slug={service.slug} />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-(--accent)" />
          {service.output || "Layanan kependudukan"}
        </p>
        <h2 className="mt-3 text-[27px] leading-tight font-medium tracking-[-0.03em] text-balance">
          {service.name}
        </h2>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">{service.description}</p>

        <ul className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-medium text-muted">
          <li className="rounded-sm bg-surface-2 px-2 py-1">
            terbit ≤ {formatWorkHours(service.issueSlaHours, { short: true })}
          </li>
          <li className="rounded-sm bg-surface-2 px-2 py-1">{service.steps.length} tahap</li>
          <li className="rounded-sm bg-surface-2 px-2 py-1">{service.requirements.length} syarat</li>
        </ul>

        <p className="mt-auto pt-6 text-[11px] font-medium text-muted">
          {perf.completed
            ? `${formatPercent(perf.onTimeRate)} selesai tepat waktu dari ${perf.completed} permohonan`
            : "Belum ada permohonan yang selesai"}
        </p>
        <span className="mt-2 flex items-center justify-between rounded-md bg-surface-2 px-4 py-3 text-sm transition-colors group-hover:bg-brand-soft group-hover:text-brand">
          Lihat persyaratan & tahapan
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
