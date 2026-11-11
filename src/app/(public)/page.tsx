import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import ResiSearch from "@/components/application/ResiSearch";
import CtaButton from "@/components/CtaButton";
import AssistantDemo from "@/components/landing/AssistantDemo";
import Countdown from "@/components/landing/Countdown";
import CountUp from "@/components/landing/CountUp";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import PerspectiveCards from "@/components/landing/PerspectiveCards";
import { type DecorationName, PixelCard, PixelDecoration, PixelStreet } from "@/components/landing/PixelArt";
import { MarkReveal, ScrollSequence, ScrollWords } from "@/components/landing/ScrollReveal";
import SmoothScroll from "@/components/landing/SmoothScroll";
import Spotlight from "@/components/landing/Spotlight";
import SummaryStats, { SummaryStatsSkeleton } from "@/components/landing/SummaryStats";
import Testimonials from "@/components/landing/Testimonials";
import { maskStyle } from "@/components/Logo";
import SectionError from "@/components/SectionError";
import { Button, PageSlide, SectionLabel, VerifiedBadge } from "@/components/ui";
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
    { step: "Persetujuan", level: "Kepala Seksi", width: "w-3/5" },
    { step: "Perekaman", level: "Kepala Bidang", width: "w-11/12" },
    { step: "Entri data", level: "Kepala Seksi", width: "w-1/4" },
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
              {row.level === "Kepala Bidang" && (
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
      <GlassHead title="Rapor SLA" meta="terbit ± 24 jam" />
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

// --- Pembanding dengan layanan yang sudah ada (bagian "Masalah") ----------------------------

type LandscapeValue = boolean | string;

/** Isi sel: ✓ (ada), – (tidak ditemukan/bukan fungsinya), atau keterangan singkat. */
function Mark({ value, strong }: { value: LandscapeValue; strong?: boolean }) {
  const kind = strong ? "pantas" : "other";
  if (typeof value === "string")
    return (
      <span data-mark={kind} className="inline-block text-xs leading-snug font-semibold">
        {value}
      </span>
    );
  if (!value)
    return (
      <span data-mark={kind} className="inline-block">
        <span aria-hidden className="text-base text-muted">
          –
        </span>
        <span className="sr-only">Tidak ditemukan</span>
      </span>
    );
  if (strong)
    return (
      <span data-mark={kind} className="inline-grid">
        <VerifiedBadge className="size-7" />
        <span className="sr-only">Ada</span>
      </span>
    );
  return (
    <span
      data-mark={kind}
      className="inline-grid size-6 place-items-center rounded-full bg-surface-2 text-text ring-1 ring-line"
    >
      <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
      <span className="sr-only">Ada</span>
    </span>
  );
}

/** Tabel jujur: yang sudah ada (IKD, aplikasi daerah, SP4N-LAPOR!) vs yang ditambahkan Pantas. */
function Landscape() {
  const { title, body, checkedAt, apps, rows } = site.problem.landscape;
  return (
    <div className="mt-16 sm:mt-20">
      <h3 className="reveal max-w-2xl text-2xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[1.75rem]">
        {title}
      </h3>
      <p className="reveal mt-3 max-w-2xl text-muted">{body}</p>
      <p aria-hidden className="mt-6 font-mono text-xs text-muted sm:hidden">
        Geser tabel ke samping →
      </p>
      <MarkReveal className="reveal mt-2 overflow-x-auto rounded-3xl border border-line bg-surface shadow-card sm:mt-8">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <caption className="sr-only">Perbandingan fitur Pantas dengan layanan yang sudah ada</caption>
          <thead>
            <tr className="border-b border-line align-bottom">
              <th scope="col" className="sticky left-0 z-10 w-36 bg-surface px-4 py-4 sm:w-52 sm:px-5">
                <span className="sr-only">Fitur</span>
              </th>
              {apps.map((app) => (
                <th scope="col" key={app.name} className="px-3 py-4 text-center font-normal">
                  <a
                    href={app.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex flex-col items-center gap-2"
                  >
                    <Image
                      src={app.logo}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 rounded-xl border border-line bg-white object-cover"
                    />
                    <span className="text-[13px] leading-tight font-semibold text-text group-hover:underline">
                      {app.name}
                    </span>
                    <span className="text-xs leading-tight text-muted">{app.owner}</span>
                    <span className="sr-only">(sumber, buka di tab baru)</span>
                  </a>
                </th>
              ))}
              {/* HP: kolom Pantas menempel di kanan; kolom layanan lain bergeser di antaranya. */}
              <th
                scope="col"
                className="sticky right-0 z-10 bg-brand-soft px-3 py-4 text-center font-normal shadow-[-10px_0_14px_-10px_rgb(0_0_0/0.18)] sm:static sm:shadow-none"
              >
                <span className="inline-flex flex-col items-center gap-2">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand">
                    <span
                      aria-hidden
                      className="aspect-[293/358] h-5 bg-on-brand"
                      style={maskStyle("/brand/pantas-p.png")}
                    />
                  </span>
                  <span className="text-[13px] leading-tight font-semibold text-brand">{site.name}</span>
                  <span className="text-xs leading-tight text-muted">Lapisan transparansi</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="[&>tr+tr>*]:shadow-[inset_0_1px_0_var(--line)]">
            {rows.map((row) => (
              <tr key={row.label}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface px-4 py-3.5 leading-snug font-medium sm:px-5"
                >
                  {row.label}
                </th>
                {row.values.map((value, i) => (
                  <td key={apps[i].name} className="px-3 py-3.5 text-center">
                    <Mark value={value} />
                  </td>
                ))}
                <td className="sticky right-0 z-10 bg-brand-soft px-3 py-3.5 text-center shadow-[-10px_0_14px_-10px_rgb(0_0_0/0.18)] sm:static sm:bg-brand-soft/60 sm:shadow-none">
                  <Mark value={row.pantas} strong />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </MarkReveal>
      <p className="mt-3 max-w-3xl text-xs text-muted">
        ✓ = tercantum di sumber publik · – = tidak kami temukan atau bukan fungsinya. Dicek {checkedAt}; klik
        logo untuk sumbernya. Logo milik pemiliknya masing-masing; {site.name} tidak berafiliasi dengan
        layanan tersebut.
      </p>
    </div>
  );
}

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
          <span className="rounded-full bg-white/10 px-2 py-0.5">tahap 2/5</span>
        </p>
        <p className="mt-2 text-sm font-semibold">Entri & validasi data</p>
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
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 py-1 pr-2.5 pl-1.5 text-xs text-hero-fg">
          <VerifiedBadge className="size-4" /> tampil di halaman lacak warga
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
          <VerifiedBadge />
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

// --- Asisten & kabar: tiruan kartu Asisten Pantas + layar kunci HP (ilustrasi, aria-hidden) ---

/** Layar kunci HP berisi notifikasi Pantas yang masuk berurutan saat digulir ke layar. */
function PhoneMock() {
  const { phone, notifications } = site.assistant;
  return (
    <div aria-hidden className="reveal mx-auto w-full max-w-[19rem]">
      <div className="relative overflow-hidden rounded-[2.75rem] border border-white/15 bg-[linear-gradient(160deg,#1a2a6c_0%,#0c1f5c_45%,#040a1a_100%)] p-3 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8),inset_0_0_0_6px_rgb(0_0_0/0.35)]">
        <div className="mx-auto h-6 w-24 rounded-full bg-black/70" />
        <div className="mt-6 text-center text-white">
          <p className="text-xs text-white/70">{phone.date}</p>
          <p className="text-6xl font-light tracking-[-0.02em] tabular-nums">{phone.time}</p>
        </div>
        <ul className="mt-8 space-y-2.5 pb-16">
          {notifications.map((n, i) => (
            <li
              key={n.title}
              data-seq
              className="flex gap-2.5 rounded-2xl border border-white/10 bg-white/[0.12] p-3 text-white backdrop-blur-xl"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#0f1b2d]">
                <span className="aspect-[293/358] h-4 bg-white" style={maskStyle("/brand/pantas-p.png")} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-semibold">Pantas</span>
                  <span className="shrink-0 text-white/60">{n.when}</span>
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug font-semibold">{n.title}</span>
                <span className="block text-xs leading-snug text-white/75">{n.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="absolute inset-x-0 bottom-3 mx-auto h-1 w-28 rounded-full bg-white/60" />
      </div>
    </div>
  );
}

/** Section gelap "Asisten & kabar": dua tiruan produk + tiga pagar pengaman. */
function AssistantSection() {
  const { assistant } = site;
  return (
    <section
      id="asisten"
      data-header-dark
      aria-labelledby="asisten-title"
      className="relative isolate overflow-clip bg-(--hero-g1) px-page py-16 text-hero-fg sm:py-24"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_20%_0%,color-mix(in_srgb,var(--hero-g3)_55%,transparent),transparent_70%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_60%_at_30%_0%,#000_30%,transparent_100%)] bg-[size:56px_56px]"
      />
      <Spotlight className="top-0 left-[5%] -z-10" />

      <p className="reveal inline-flex items-center gap-2 rounded-full border border-hero-line bg-hero-chip px-3 py-1 font-mono text-xs tracking-[0.12em] text-hero-muted uppercase backdrop-blur">
        <span className="text-hero-accent">04</span>
        <span aria-hidden className="h-3 w-px bg-hero-line" />
        {assistant.label}
      </p>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="max-w-3xl">
          <h2
            id="asisten-title"
            className="reveal text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.06] font-semibold tracking-[-0.04em] text-balance"
          >
            {assistant.title}
          </h2>
          <p className="reveal mt-4 max-w-2xl text-lg text-hero-muted">{assistant.intro}</p>
        </div>
        <CtaButton
          href={assistant.cta.href}
          transitionTypes={["nav-forward"]}
          variant="glass"
          className="reveal"
        >
          {assistant.cta.label}
        </CtaButton>
      </div>

      {/* Desktop: adegan menempel; jawaban asisten lalu tiga notifikasi masuk mengikuti scroll. */}
      <ScrollSequence className="mt-12 lg:h-[190vh]">
        <div className="grid items-center gap-10 lg:sticky lg:top-[max(5rem,calc(50vh-20rem))] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
          <AssistantDemo demo={site.assistant.demo} resi={site.hero.exampleResi} />
          <PhoneMock />
        </div>
      </ScrollSequence>

      <ul className="mt-14 grid gap-6 border-t border-hero-line pt-10 sm:grid-cols-3">
        {assistant.guards.map((g) => (
          <li key={g.title} className="reveal">
            <p className="flex items-center gap-2 font-semibold">
              <VerifiedBadge />
              {g.title}
            </p>
            <p className="mt-1.5 text-sm text-hero-muted">{g.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  const { hero, summary, problem, howItWorks, perspectives, testimonials, closing } = site;
  return (
    <PageSlide>
      <SmoothScroll />
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
        {/* Pernyataan masalah: kata-kata menyala satu per satu mengikuti scroll. */}
        <ScrollWords
          text={problem.body}
          className="-mt-4 max-w-4xl text-[clamp(1.45rem,3.1vw,2.4rem)] leading-[1.22] font-medium tracking-[-0.025em] text-balance"
        />
        {/* Tiga angka Ombudsman sebagai satu baris bukti. */}
        <ul className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-3">
          {problem.stats.map((s) => (
            <li key={s.source} className="reveal bg-surface p-6 sm:p-7">
              <span className="block font-mono text-4xl font-medium tracking-tight text-late tabular-nums">
                <CountUp value={s.value} />
              </span>
              <span className="mt-3 block text-sm font-medium">{s.label}</span>
              <span className="mt-1 block text-xs text-muted">{s.source}</span>
            </li>
          ))}
        </ul>
        <Landscape />
      </Section>

      <div className="border-y border-line bg-surface">
        {/* Judul ikut menempel di kolom kiri selama langkah digulir (HowItWorks). */}
        <section id="cara-kerja" aria-labelledby="cara-kerja-title" className="px-page py-14 sm:py-24">
          <HowItWorks
            data={howItWorks}
            resi={hero.exampleResi}
            index="02"
            label="Cara kerja"
            titleId="cara-kerja-title"
          />
        </section>
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

      {/* Asisten AI & notifikasi push: pita gelap di tengah halaman. */}
      <AssistantSection />

      {/* Suara lapangan: kutipan wawancara tiga orang (Testimonials). */}
      <div className="bg-surface">
        <Section
          id="suara-lapangan"
          index="05"
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
          <p className="reveal mx-auto mt-5 max-w-xl text-lg text-balance text-hero-muted">{closing.body}</p>
          <div className="reveal mx-auto mt-10 max-w-xl text-left">
            <ResiSearch example={hero.exampleResi} variant="hero" />
          </div>
          <div className="reveal mt-8 flex flex-wrap justify-center gap-3">
            <CtaButton href="/layanan" transitionTypes={["nav-forward"]} variant="light">
              Ajukan permohonan
            </CtaButton>
            <CtaButton href="/rapor" transitionTypes={["nav-forward"]} variant="glass" chip={false}>
              Lihat rapor SLA
            </CtaButton>
          </div>
        </div>
        <Marquee items={closing.marquee} />
      </section>
    </PageSlide>
  );
}
