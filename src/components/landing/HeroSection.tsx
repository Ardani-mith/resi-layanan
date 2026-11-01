import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import ResiSearch from "@/components/application/ResiSearch";
import Spotlight from "@/components/landing/Spotlight";
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

/** Hiasan latar hero: gradien, grid tipis, sorot cahaya, garis tepi kolom (aria-hidden). */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[58rem] sm:h-[62rem]">
      {/* Navy di atas → biru terang di sekitar kolom resi → memudar ke warna latar halaman. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--hero-g1)_0%,var(--hero-g2)_28%,var(--hero-g3)_54%,var(--hero-g4)_70%,var(--bg)_100%)]" />
      {/* Grid tipis (gaya "Grid Background" Aceternity UI), hanya terlihat di bagian atas. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_40%,transparent_100%)] bg-[size:56px_56px]" />
      <Spotlight className="top-0 left-[10%] lg:left-[38%]" />
      {/* Bagian gelap gradien: navbar di atasnya berteks putih (HeaderTone). */}
      <div data-header-dark className="absolute inset-x-0 top-0 h-[36rem]" />
      {/* Garis tepi kolom konten, seperti bingkai blueprint. */}
      <span className="absolute inset-y-0 left-4 w-px bg-gradient-to-b from-white/10 to-transparent sm:left-8 lg:left-20" />
      <span className="absolute inset-y-0 right-4 w-px bg-gradient-to-b from-white/10 to-transparent sm:right-8 lg:right-20" />
    </div>
  );
}

export default function HeroSection({ hero }: { hero: typeof site.hero }) {
  const lastLine = hero.titleLines.length - 1;
  return (
    // Hero ditarik ke bawah navbar transparan setinggi navbar persis: h-16 + garis bawah 1px
    // (kalau kurang, tersisa garis putih di paling atas).
    <section
      aria-labelledby="hero-title"
      className="relative isolate -mt-[calc(4rem+1px)] overflow-hidden pt-[calc(4rem+1px)]"
    >
      <HeroBackdrop />

      {/* Teks di tengah: label, judul, pengantar, lalu satu aksi utama (cek resi). */}
      <div className="relative mx-auto max-w-5xl px-4 pt-20 text-center sm:pt-28 lg:pt-32">
        <Link
          href="/rapor"
          transitionTypes={["nav-forward"]}
          className="inline-flex max-w-full items-center gap-3 rounded-full border border-hero-line bg-hero-chip py-1.5 pr-1.5 pl-4 text-sm text-hero-muted shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur transition-colors hover:border-hero-line-strong motion-safe:animate-fade-up"
        >
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-[#4ade80] motion-safe:animate-pulse"
          />
          <span className="sm:hidden">{hero.kickerShort}</span>
          <span className="hidden sm:inline">{hero.kicker}</span>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-hero-soft px-3 py-0.5 font-medium text-hero-fg">
            {hero.kickerCta} <ArrowRight aria-hidden className="size-3.5" />
          </span>
        </Link>

        {/* Tiap kalimat di baris sendiri (di HP boleh terlipat, text-balance). Desktop: tiap baris
            naik bergantian dari balik "jendela" overflow-hidden. */}
        <h1
          id="hero-title"
          className="mt-8 text-[clamp(2.5rem,10vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.045em] text-balance text-hero-fg motion-safe:animate-fade-up lg:text-[clamp(3.2rem,4.9vw,4.6rem)] lg:motion-safe:animate-none"
        >
          {hero.titleLines.map((line, i) => (
            <span key={line} className="block lg:-mb-2 lg:overflow-hidden lg:pb-2">
              <span
                className={cn("lg:block lg:motion-safe:animate-rise", i === lastLine && "text-hero-accent")}
                style={delay(100 + i * 90)}
              >
                {line}
              </span>
            </span>
          ))}
        </h1>

        <p
          className="mx-auto mt-6 max-w-4xl text-lg text-hero-muted motion-safe:animate-fade-up sm:text-xl"
          style={delay(300)}
        >
          {hero.body}
        </p>
        <div className="mx-auto mt-10 max-w-xl text-left motion-safe:animate-fade-up" style={delay(400)}>
          <ResiSearch example={hero.exampleResi} variant="hero" />
        </div>
      </div>

      {/* Visual produk: kantor transparan dalam bingkai kaca, menumpang di peralihan gradien. */}
      <div className="relative px-page pt-16 motion-safe:animate-fade-up sm:pt-20" style={delay(550)}>
        <div className="rounded-[1.75rem] border border-white/25 bg-white/10 p-2 shadow-[0_50px_100px_-40px_rgb(4_10_40/0.55)] backdrop-blur-sm sm:p-3">
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
        <p className="mt-4 text-center text-xs text-muted">
          <span className="mr-2 rounded-sm border border-line px-1.5 py-0.5 font-semibold">
            {site.demo.badge}
          </span>
          {site.agency} (fiktif) · peta memakai contoh lokasi di DKI Jakarta
        </p>
      </div>

      {/* Dasar aturan (seperti strip logo di landing page SaaS, tapi berisi regulasi acuan). */}
      <div className="relative grid gap-6 px-page py-12 sm:py-14 lg:grid-cols-[15rem_1fr] lg:items-center lg:gap-12">
        <p className="text-sm text-muted">{hero.basis.title}</p>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {hero.basis.items.map((item) => (
            <li key={item.code} className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap">
                {item.code}
              </span>
              <span className="mt-1 block text-xs text-muted">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
