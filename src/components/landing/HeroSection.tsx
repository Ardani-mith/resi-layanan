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
    // Gradien atas → bawah; -mt-16 + pt-16 menarik hero ke bawah navbar transparan (tinggi h-16).
    <section
      aria-labelledby="hero-title"
      className="relative -mt-16 overflow-hidden border-b border-line bg-[linear-gradient(to_bottom,var(--hero-from),var(--bg)_65%)] pt-16"
    >
      {/* Teks di tengah: label, judul, pengantar, lalu satu aksi utama (cek resi). */}
      <div className="relative mx-auto max-w-4xl px-4 pt-16 text-center sm:pt-20 lg:pt-24">
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted shadow-card motion-safe:animate-fade-up">
          <span aria-hidden className="size-1.5 rounded-full bg-ok motion-safe:animate-pulse" />
          {hero.kicker}
          <span aria-hidden className="hidden h-3 w-px bg-line sm:block" />
          <span className="hidden text-text sm:inline">{site.agency}</span>
        </p>

        {/* HP: teks mengalir alami (text-balance). Desktop: tiap baris naik bergantian dari balik
            "jendela" overflow-hidden. */}
        <h1
          id="hero-title"
          className="mt-6 text-[clamp(2.3rem,9vw,3.1rem)] leading-[1.03] font-extrabold tracking-[-0.035em] text-balance motion-safe:animate-fade-up lg:text-[clamp(3.2rem,5.2vw,4.6rem)] lg:motion-safe:animate-none"
        >
          {hero.titleLines.map((line, i) => (
            <span key={line} className="lg:-mb-1 lg:block lg:overflow-hidden lg:pb-1">
              <span
                className={cn("lg:block lg:motion-safe:animate-rise", i === lastLine && "text-brand")}
                style={delay(100 + i * 90)}
              >
                {line}
              </span>
              {i < lastLine && " "}
            </span>
          ))}
        </h1>

        <p
          className="mx-auto mt-5 max-w-xl text-lg text-muted motion-safe:animate-fade-up"
          style={delay(300)}
        >
          {hero.body}
        </p>
        <div className="mx-auto mt-8 max-w-xl text-left motion-safe:animate-fade-up" style={delay(400)}>
          <ResiSearch example={hero.exampleResi} />
        </div>
      </div>

      {/* Visual produk: kantor transparan dalam bingkai jendela aplikasi. */}
      <div className="relative px-page pt-14 pb-12 motion-safe:animate-fade-up" style={delay(550)}>
        <div className="rounded-[1.75rem] border border-line bg-surface-2/70 p-2 shadow-[0_40px_80px_-40px_rgb(15_27_45/0.35)] sm:p-3">
          <div className="rounded-[1.35rem] border border-line bg-surface px-3 pt-3 pb-4 sm:px-5 sm:pt-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <p className="flex items-center gap-3 text-sm">
                <span aria-hidden className="hidden gap-1.5 sm:flex">
                  <span className="size-2.5 rounded-full bg-line" />
                  <span className="size-2.5 rounded-full bg-line" />
                  <span className="size-2.5 rounded-full bg-line" />
                </span>
                <span className="font-semibold">{hero.office.label}</span>
                <span className="hidden text-muted sm:inline">{hero.office.caption}</span>
              </p>
              <p className="flex items-center gap-2 rounded-full bg-ok-soft px-2.5 py-0.5 font-mono text-xs text-ok">
                <span aria-hidden className="size-1.5 rounded-full bg-ok motion-safe:animate-pulse" />
                {hero.office.live}
              </p>
            </div>
            <SectionError message="Denah kantor sementara tidak dapat dimuat. Lacak resi tetap bisa dipakai.">
              <Suspense fallback={<OfficeSkeleton />}>
                <OfficeLive />
              </Suspense>
            </SectionError>
          </div>
        </div>

        {/* Strip fakta singkat di bawah visual. */}
        <div className="mt-8 flex flex-col items-center gap-3 text-sm text-muted">
          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            {hero.highlights.map((text, i) => (
              <li key={text} className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-brand">0{i + 1}</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-center text-xs">
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
