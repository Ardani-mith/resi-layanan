import { Suspense } from "react";
import ResiSearch from "@/components/application/ResiSearch";
import PixelOffice from "@/components/office/PixelOffice";
import SectionError from "@/components/SectionError";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";
import { getOfficeSnapshot, getTracking } from "@/lib/dal";
import { emptyOffice, roomForStep } from "@/lib/present";
import { WAITING_CITIZEN_STATUSES } from "@/lib/workflow";

/** Jeda animasi (CSS murni) agar elemen hero muncul berurutan. */
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

/** Kantor transparan di beranda: isi ruangan dari data asli; resi contoh disorot di ruangannya. */
async function OfficeLive() {
  const [office, demo] = await Promise.all([getOfficeSnapshot(), getTracking(site.hero.exampleResi)]);
  const step = demo?.steps[demo.currentStep];
  const open = demo && demo.status !== "selesai" && demo.status !== "ditolak";
  return (
    <PixelOffice
      office={office}
      highlight={
        open
          ? {
              room: roomForStep(step?.key, WAITING_CITIZEN_STATUSES.includes(demo.status)),
              label: `Berkas ${demo.resi}`,
              late: demo.isLate,
            }
          : undefined
      }
    />
  );
}

/** Kerangka saat data dimuat: denah kosong (tetap terlihat utuh). */
function OfficeSkeleton() {
  return <PixelOffice office={emptyOffice()} />;
}

export default function HeroSection({ hero }: { hero: typeof site.hero }) {
  const lastLine = hero.titleLines.length - 1;
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-line">
      <div className="mx-auto max-w-6xl px-4 pt-12 sm:pt-16 lg:pt-20">
        {/* Baris kop: seperti kepala surat dinas, bukan label "pil". */}
        <p className="flex items-center gap-3 font-mono text-xs tracking-[0.14em] text-muted uppercase motion-safe:animate-fade-up">
          <span className="hidden sm:inline">{site.agency}</span>
          <span aria-hidden className="hidden h-px flex-1 bg-line sm:block" />
          <span className="text-brand">{hero.kicker}</span>
        </p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-14">
          {/* HP: teks mengalir alami (text-balance) dan muncul sebagai satu blok.
              Desktop: tiap baris naik bergantian dari balik "jendela" overflow-hidden. */}
          <h1
            id="hero-title"
            className="text-[clamp(2.3rem,9vw,3rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance motion-safe:animate-fade-up lg:text-[clamp(3rem,4.6vw,4.1rem)] lg:motion-safe:animate-none"
          >
            {hero.titleLines.map((line, i) => (
              <span key={line} className="lg:-mb-1 lg:block lg:overflow-hidden lg:pb-1">
                <span
                  className={cn(
                    "lg:block lg:whitespace-nowrap lg:motion-safe:animate-rise",
                    i === lastLine && "text-brand",
                  )}
                  style={delay(100 + i * 90)}
                >
                  {line}
                </span>
                {i < lastLine && " "}
              </span>
            ))}
          </h1>

          <div className="motion-safe:animate-fade-up" style={delay(350)}>
            <p className="text-lg text-muted">{hero.body}</p>
            <div className="mt-6">
              <ResiSearch example={hero.exampleResi} />
            </div>
          </div>
        </div>

        {/* Kantor transparan: denah pixel-art dengan berkas asli per ruangan. */}
        <div className="mt-14 motion-safe:animate-fade-up" style={delay(500)}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-4">
            <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">
              <span className="text-brand">{hero.office.label}</span> · {hero.office.caption}
            </p>
            <p className="flex items-center gap-2 font-mono text-xs text-muted">
              <span aria-hidden className="size-2 rounded-full bg-ok motion-safe:animate-pulse" />
              {hero.office.live}
            </p>
          </div>
          <SectionError message="Denah kantor sementara tidak dapat dimuat. Lacak resi tetap bisa dipakai.">
            <Suspense fallback={<OfficeSkeleton />}>
              <OfficeLive />
            </Suspense>
          </SectionError>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line py-5 text-sm text-muted">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {hero.highlights.map((text, i) => (
              <li key={text} className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-brand">0{i + 1}</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-xs">
            <span className="mr-2 rounded-sm border border-line px-1.5 py-0.5 font-semibold">
              {site.demo.badge}
            </span>
            {site.agency} (fiktif) · peta memakai contoh lokasi di DKI Jakarta
          </p>
        </div>
      </div>
    </section>
  );
}
