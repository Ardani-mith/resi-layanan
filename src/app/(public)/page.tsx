import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import ResiSearch from "@/components/application/ResiSearch";
import Countdown from "@/components/landing/Countdown";
import CountUp from "@/components/landing/CountUp";
import HeroSection from "@/components/landing/HeroSection";
import PerspectiveCards from "@/components/landing/PerspectiveCards";
import { type DecorationName, PixelCard, PixelDecoration, PixelStreet } from "@/components/landing/PixelArt";
import Spotlight from "@/components/landing/Spotlight";
import SpotlightCard from "@/components/landing/SpotlightCard";
import SummaryStats, { SummaryStatsSkeleton } from "@/components/landing/SummaryStats";
import Testimonials from "@/components/landing/Testimonials";
import SectionError from "@/components/SectionError";
import { Button, PageSlide, SectionLabel } from "@/components/ui";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";

function Section({
  id,
  index,
  label,
  title,
  intro,
  decoration,
  children,
  className,
}: {
  id: string;
  index: string;
  label: string;
  title: string;
  intro?: string;
  /** Hiasan piksel beranimasi di samping judul (seperti situs portofolio). */
  decoration?: DecorationName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("px-page py-14 sm:py-24", className)}>
      <SectionLabel index={index} className="reveal">
        {label}
      </SectionLabel>
      <div className="mt-6 flex items-end justify-between gap-8">
        <h2
          id={`${id}-title`}
          className="reveal max-w-3xl text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.06] font-semibold tracking-[-0.04em] text-balance"
        >
          {title}
        </h2>
        {/* {decoration && <PixelDecoration name={decoration} className="mb-1 hidden sm:block" />} */}
      </div>
      {intro && <p className="reveal mt-4 max-w-2xl text-lg text-muted">{intro}</p>}
      <div className="mt-12">{children}</div>
    </section>
  );
}

// --- Kartu kaca untuk "Satu resi, empat sudut pandang" (ilustrasi, aria-hidden) -------------

/** Kartu "kaca gelap" di atas langit piksel: teks putih, tepi tipis. */
function GlassCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[19rem] rounded-md border border-white/15 bg-[#1b1f24]/70 p-4 text-white shadow-[0_20px_40px_-12px_rgb(0_0_0/0.45)] backdrop-blur-md">
      {children}
    </div>
  );
}

function GlassHead({ title, meta }: { title: string; meta: string }) {
  return (
    <p className="mb-3 flex items-center justify-between gap-2 text-[13px] font-semibold">
      {title}
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-normal whitespace-nowrap text-white/70">
        <span className="size-1.5 bg-white/80" />
        {meta}
      </span>
    </p>
  );
}

// Demo mini: diam dalam keadaan awal, lalu "berjalan" saat kartunya aktif (varian spot-on:
// disorot, difokus, atau layar sentuh). Gerakan hanya untuk motion-safe.

function MiniCitizen() {
  return (
    <GlassCard>
      <GlassHead title="Langkah berikutnya" meta={site.hero.exampleResi} />
      <p className="text-sm">Tidak ada yang perlu Anda lakukan sekarang.</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1 flex-1 bg-white/20">
          <div className="h-full w-2/5 bg-white transition-[width] duration-[1.6s] ease-out spot-on:w-3/5" />
        </div>
        <span className="font-mono text-[12px] font-semibold">
          sisa <Countdown seconds={4365} />
        </span>
      </div>
    </GlassCard>
  );
}

function MiniOfficer() {
  return (
    <GlassCard>
      <p className="mb-3 flex items-center justify-between gap-2 text-[13px] font-semibold">
        Syarat selesai
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-normal whitespace-nowrap text-white/70">
          <span className="size-1.5 bg-white/80" />
          <span className="spot-on:hidden">0/2</span>
          <span className="hidden spot-on:inline">2/2</span>
        </span>
      </p>
      {["Data diinput ke SIAK", "NIK & KK cocok"].map((item, i) => (
        <p
          key={item}
          className="flex items-center gap-2.5 px-2 py-1.5 text-[13px] transition-colors duration-300 spot-on:bg-white/10"
          style={{ transitionDelay: `${i * 350}ms` }}
        >
          <span
            className="grid size-4 place-items-center border border-white/50 text-[#1b1f24] transition-colors duration-300 spot-on:border-white spot-on:bg-white"
            style={{ transitionDelay: `${i * 350}ms` }}
          >
            <Check
              className="size-3 scale-50 opacity-0 transition duration-300 spot-on:scale-100 spot-on:opacity-100"
              style={{ transitionDelay: `${i * 350}ms` }}
              strokeWidth={3}
            />
          </span>
          {item}
        </p>
      ))}
      {/* Tombol baru aktif setelah semua syarat dicentang (sama dengan aturan di aplikasi). */}
      <div className="mt-3 flex gap-2 text-[13px]">
        <span className="flex flex-1 items-center justify-center gap-1.5 bg-white/15 py-1.5 font-semibold text-white/50 transition-colors duration-300 spot-on:bg-white spot-on:text-[#1b1f24] spot-on:delay-700">
          <Check className="size-3.5" /> Tandai selesai
        </span>
        <span className="border border-white/30 px-3 py-1.5">Perbaikan</span>
      </div>
    </GlassCard>
  );
}

function MiniLeader() {
  const rows = [
    { step: "Persetujuan", level: "Kasi", width: "w-3/5" },
    { step: "Perekaman", level: "Kabid", width: "w-11/12" },
    { step: "Entri data", level: "Kasi", width: "w-1/4" },
  ];
  return (
    <GlassCard>
      <GlassHead title="Eskalasi terbuka" meta="hari ini" />
      <ol className="space-y-2">
        {rows.map((row, i) => (
          <li key={row.step} className="grid grid-cols-[1rem_1fr_3.5rem] items-center gap-2 text-[13px]">
            <span className="text-white/60">{i + 1}</span>
            <span className="flex items-center gap-1.5 truncate">
              {row.step} <span className="text-white/60">· {row.level}</span>
              {row.level === "Kabid" && (
                <span className="size-1.5 shrink-0 rounded-full bg-[#ff7b70] opacity-0 spot-on:opacity-100 motion-safe:spot-on:animate-pulse" />
              )}
            </span>
            <span className="h-1 bg-white/20">
              <span
                className={cn("block h-full bg-white motion-safe:spot-on:animate-bar-grow", row.width)}
                style={{ animationDelay: `${i * 150}ms` }}
              />
            </span>
          </li>
        ))}
      </ol>
    </GlassCard>
  );
}

function MiniPublic() {
  const rows = [
    { service: "KTP-el", pct: "92%", width: "w-[92%]" },
    { service: "Kartu Keluarga", pct: "88%", width: "w-[88%]" },
    { service: "Akta Kelahiran", pct: "95%", width: "w-[95%]" },
  ];
  return (
    <GlassCard>
      <GlassHead title="Rapor SLA" meta="terbit ≤ 24 jam" />
      <ol className="space-y-2">
        {rows.map((row, i) => (
          <li key={row.service} className="grid grid-cols-[1fr_5rem_2.5rem] items-center gap-2 text-[13px]">
            <span className="truncate">{row.service}</span>
            <span className="h-1 bg-white/20">
              <span
                className={cn("block h-full bg-white motion-safe:spot-on:animate-bar-grow", row.width)}
                style={{ animationDelay: `${i * 150}ms` }}
              />
            </span>
            <span className="text-right font-mono text-xs">{row.pct}</span>
          </li>
        ))}
      </ol>
    </GlassCard>
  );
}

const MINI = [MiniCitizen, MiniOfficer, MiniLeader, MiniPublic];

// --- Penutup: kartu kaca melayang & pita berjalan -------------------------------------------

/** Dua kartu kaca contoh di kiri-kanan judul penutup (layar lebar saja, hiasan). */
function FloatingChips() {
  const glass =
    "absolute hidden w-64 rounded-2xl border border-white/15 bg-white/[0.07] p-4 text-left text-hero-fg shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)] backdrop-blur-md xl:block motion-safe:animate-float";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden xl:block">
      <div className={cn(glass, "top-40 left-[6%] -rotate-3")}>
        <p className="flex items-center justify-between font-mono text-xs text-hero-muted">
          {site.hero.exampleResi}
          <span className="rounded-full bg-white/10 px-2 py-0.5">tahap 3/5</span>
        </p>
        <p className="mt-2 text-sm font-semibold">Entri & perekaman</p>
        <div className="mt-3 h-1 bg-white/15">
          <div className="h-full w-3/5 bg-hero-accent" />
        </div>
        <p className="mt-2 font-mono text-xs text-hero-muted">
          sisa <Countdown seconds={4365} />
        </p>
      </div>
      <div className={cn(glass, "top-64 right-[6%] rotate-3 [animation-delay:-3s]")}>
        <p className="flex items-center gap-2 font-mono text-xs text-hero-muted">
          <span className="size-1.5 rounded-full bg-[#ffb4ab]" /> Eskalasi · Kepala Seksi
        </p>
        <p className="mt-2 text-sm font-semibold">Ditanggapi pimpinan</p>
        <p className="mt-1 text-xs text-hero-muted">Target selesai dalam 8 jam kerja.</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#4ade80]/15 px-2.5 py-1 text-xs text-[#86efac]">
          <Check className="size-3.5" /> tampil di halaman lacak warga
        </p>
      </div>
    </div>
  );
}

/** Pita keunggulan yang berjalan terus (berhenti saat disorot); tepi kiri-kanan memudar. */
function Marquee({ items }: { items: readonly string[] }) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 gap-3 pr-3">
      {items.map((text) => (
        <li
          key={text}
          className="flex items-center gap-2.5 rounded-full border border-hero-line bg-hero-chip px-4 py-2 text-sm whitespace-nowrap text-hero-fg"
        >
          <span className="grid size-5 place-items-center rounded-full bg-hero-soft text-hero-accent">
            <Check aria-hidden className="size-3" strokeWidth={3} />
          </span>
          {text}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="group/mq relative -mx-4 mt-20 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)] py-8 sm:-mx-8 lg:-mx-20">
      <div className="flex w-max group-hover/mq:[animation-play-state:paused] motion-safe:animate-marquee">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

export default function Home() {
  const { hero, summary, problem, howItWorks, perspectives, testimonials, closing } = site;
  return (
    <PageSlide>
      <HeroSection hero={hero} />
      {/* Rapor ringkas: angka asli dari database, di-stream setelah kerangka halaman tampil. */}
      <section aria-labelledby="rapor-ringkas-title" className="border-b border-line bg-surface">
        <div className="grid gap-10 px-page py-12 lg:grid-cols-[16rem_1fr] lg:items-end">
          <div>
            {/* <PixelDecoration name="bars" className="mb-4" /> */}
            <h2 id="rapor-ringkas-title" className="font-mono text-xs tracking-[0.14em] text-brand uppercase">
              {summary.title}
            </h2>
            <p className="mt-3 text-sm text-muted">{summary.body}</p>
            <Link
              href="/rapor"
              transitionTypes={["nav-forward"]}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              {summary.cta} <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          {/* Jika database tidak terjangkau, hanya rapor ini yang diganti pesan; hero & cek resi tetap jalan. */}
          <SectionError message="Angka rapor sementara tidak dapat dimuat. Lacak resi tetap bisa dipakai.">
            <Suspense fallback={<SummaryStatsSkeleton />}>
              <SummaryStats />
            </Suspense>
          </SectionError>
        </div>
      </section>

      <Section id="masalah" index="01" label="Masalah" title={problem.title} decoration="hourglass">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="reveal text-lg text-muted">{problem.body}</p>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {problem.stats.map((s) => (
                <li key={s.source} className="reveal grid grid-cols-[6.5rem_1fr] items-baseline gap-4 py-4">
                  <span className="font-mono text-3xl font-medium tracking-tight text-late tabular-nums">
                    <CountUp value={s.value} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-xs text-muted">{s.source}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Perbandingan gaya buku besar: hari ini vs dengan Pantas. */}
          <div className="reveal overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
            {/* HP: daftar bertumpuk (tabel tiga kolom terlalu sempit). */}
            <dl className="divide-y divide-line sm:hidden">
              {problem.compare.map((row) => (
                <div key={row.topic} className="space-y-1.5 p-4">
                  <dt className="font-semibold">{row.topic}</dt>
                  <dd className="text-sm text-muted line-through decoration-line">{row.today}</dd>
                  <dd className="rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium">
                    <span className="mr-1.5 font-mono text-xs font-semibold text-brand uppercase">
                      {site.name}
                    </span>
                    {row.pantas}
                  </dd>
                </div>
              ))}
            </dl>
            <table className="hidden w-full text-left text-sm sm:table">
              <caption className="sr-only">Perbandingan layanan hari ini dan dengan Pantas</caption>
              <thead>
                <tr className="border-b border-line font-mono text-xs tracking-[0.12em] uppercase">
                  <th scope="col" className="w-1/4 px-4 py-3 font-medium text-muted sm:px-5">
                    <span className="sr-only">Hal</span>
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium text-muted sm:px-5">
                    Hari ini
                  </th>
                  <th scope="col" className="bg-brand-soft px-4 py-3 font-semibold text-brand sm:px-5">
                    Dengan {site.name}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {problem.compare.map((row) => (
                  <tr key={row.topic} className="align-top">
                    <th scope="row" className="px-4 py-4 font-semibold sm:px-5">
                      {row.topic}
                    </th>
                    <td className="px-4 py-4 text-muted line-through decoration-line sm:px-5">{row.today}</td>
                    <td className="bg-brand-soft/60 px-4 py-4 font-medium sm:px-5">{row.pantas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <div className="border-y border-line bg-surface">
        <Section id="cara-kerja" index="02" label="Cara kerja" title={howItWorks.title} decoration="route">
          {/* Empat kartu berurutan seperti rute paket; nomor & label waktu di atas. */}
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.steps.map((step, i) => (
              <li key={step.title} className="reveal">
                <SpotlightCard className="flex h-full flex-col p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-full font-mono text-sm font-semibold",
                        i === 0 ? "bg-brand text-on-brand" : "bg-brand-soft text-brand",
                      )}
                    >
                      0{i + 1}
                    </span>
                    <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-muted">
                      {step.time}
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-semibold tracking-[-0.01em]">{step.title}</h3>
                  <p className="mt-2 text-muted">{step.body}</p>
                </SpotlightCard>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {/* Satu resi, empat sudut pandang: kartu yang melebar saat disorot (PerspectiveCards). */}
      <Section
        id="sudut-pandang"
        index="03"
        label="Untuk siapa"
        title={perspectives.title}
        intro={perspectives.body}
        decoration="receipt"
      >
        <PerspectiveCards
          items={perspectives.items}
          visuals={MINI.map((Mini, i) => (
            <Mini key={i} />
          ))}
        />
      </Section>

      {/* Suara lapangan: kutipan wawancara tiga orang (Testimonials). */}
      <div className="border-t border-line bg-surface">
        <Section
          id="suara-lapangan"
          index="04"
          label={testimonials.label}
          title={testimonials.title}
          intro={testimonials.intro}
        >
          <Testimonials data={testimonials} />
        </Section>
      </div>

      {/* Strip peralihan: warga & petugas arsip berjalan ke/dari kantor; garis jalannya
          langsung bertemu blok penutup gelap. */}
      <PixelStreet />

      {/* Penutup selebar layar, menyambung tanpa jeda dengan footer gelap (latar sama). */}
      <section
        data-header-dark
        aria-labelledby="penutup-title"
        className="relative isolate overflow-hidden bg-(--hero-g1) px-page pt-20 sm:pt-28"
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_55%_at_50%_0%,var(--hero-g3),transparent_70%)]"
        />
        {/* Separuh atas pendar sambungan; separuh bawahnya di footer (glow-seam-top). */}
        <div aria-hidden className="absolute inset-0 -z-10 glow-seam-bottom" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_30%,transparent_100%)] bg-[size:56px_56px]"
        />
        <Spotlight className="top-0 left-[20%] -z-10" />
        <FloatingChips />
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="penutup-title"
            className="reveal text-[clamp(2.1rem,6vw,3.6rem)] leading-[1.04] font-semibold tracking-[-0.045em] text-balance text-hero-fg"
          >
            {closing.title}
          </h2>
          <p className="reveal mx-auto mt-5 max-w-xl text-lg text-hero-muted">{closing.body}</p>
          <div className="reveal mx-auto mt-10 max-w-xl text-left">
            <ResiSearch example={hero.exampleResi} variant="hero" />
          </div>
          <div className="reveal mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/ajukan" transitionTypes={["nav-forward"]}>
              Ajukan permohonan
            </Button>
            <Button href="/rapor" transitionTypes={["nav-forward"]} variant="hero">
              Lihat rapor SLA
            </Button>
          </div>
        </div>
        <Marquee items={closing.marquee} />
      </section>
    </PageSlide>
  );
}
