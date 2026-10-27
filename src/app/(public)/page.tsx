import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode, Suspense } from "react";
import ResiSearch from "@/components/application/ResiSearch";
import CountUp from "@/components/landing/CountUp";
import HeroSection from "@/components/landing/HeroSection";
import { type DecorationName, PixelCard, PixelDecoration, PixelStreet } from "@/components/landing/PixelArt";
import SummaryStats, { SummaryStatsSkeleton } from "@/components/landing/SummaryStats";
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
    <section id={id} aria-labelledby={`${id}-title`} className={cn("px-20 py-20 sm:py-24", className)}>
      <SectionLabel index={index} className="reveal">
        {label}
      </SectionLabel>
      <div className="mt-6 flex items-end justify-between gap-8">
        <h2
          id={`${id}-title`}
          className="reveal max-w-3xl text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance"
        >
          {title}
        </h2>
        {decoration && <PixelDecoration name={decoration} className="mb-1 hidden sm:block" />}
      </div>
      {intro && <p className="reveal mt-4 max-w-2xl text-lg text-muted">{intro}</p>}
      <div className="mt-12">{children}</div>
    </section>
  );
}

// --- Kartu kaca untuk "Satu resi, tiga sudut pandang" (ilustrasi, aria-hidden) -------------

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
      <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-normal whitespace-nowrap text-white/70">
        <span className="size-1.5 bg-white/80" />
        {meta}
      </span>
    </p>
  );
}

function MiniCitizen() {
  return (
    <GlassCard>
      <GlassHead title="Langkah berikutnya" meta="RL-HJ26-AKTA" />
      <p className="text-sm">Tidak ada yang perlu Anda lakukan sekarang.</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1 flex-1 bg-white/20">
          <div className="h-full w-2/5 bg-white" />
        </div>
        <span className="font-mono text-[12px] font-semibold">sisa 01:12:45</span>
      </div>
    </GlassCard>
  );
}

function MiniOfficer() {
  return (
    <GlassCard>
      <GlassHead title="Syarat selesai" meta="2/2" />
      {["Data diinput ke SIAK", "NIK & KK cocok"].map((item, i) => (
        <p
          key={item}
          className={cn("flex items-center gap-2.5 px-2 py-1.5 text-[13px]", i === 0 && "bg-white/10")}
        >
          <span className="grid size-4 place-items-center bg-white text-[#1b1f24]">
            <Check className="size-3" strokeWidth={3} />
          </span>
          {item}
        </p>
      ))}
      <div className="mt-3 flex gap-2 text-[13px]">
        <span className="flex flex-1 items-center justify-center gap-1.5 bg-white py-1.5 font-semibold text-[#1b1f24]">
          <Check className="size-3.5" /> Tandai selesai
        </span>
        <span className="border border-white/30 px-3 py-1.5">Perbaikan</span>
      </div>
    </GlassCard>
  );
}

function MiniLeader() {
  const rows = [
    { step: "Persetujuan", late: "lewat 2 jam", level: "Kasi", width: "w-3/5" },
    { step: "Perekaman", late: "lewat 1 hari", level: "Kabid", width: "w-11/12" },
    { step: "Entri data", late: "lewat 40 mnt", level: "Kasi", width: "w-1/4" },
  ];
  return (
    <GlassCard>
      <GlassHead title="Eskalasi terbuka" meta="hari ini" />
      <ol className="space-y-2">
        {rows.map((row, i) => (
          <li key={row.step} className="grid grid-cols-[1rem_1fr_3.5rem] items-center gap-2 text-[13px]">
            <span className="text-white/60">{i + 1}</span>
            <span className="truncate">
              {row.step} <span className="text-white/60">· {row.level}</span>
            </span>
            <span className="h-1 bg-white/20">
              <span className={cn("block h-full bg-white", row.width)} />
            </span>
          </li>
        ))}
      </ol>
    </GlassCard>
  );
}

const MINI = [MiniCitizen, MiniOfficer, MiniLeader];

/** Penanda kotak kecil di persilangan garis bingkai (gaya blueprint). */
function Corner({ className }: { className: string }) {
  return <span aria-hidden className={cn("absolute z-10 hidden size-1.5 bg-text lg:block", className)} />;
}

export default function Home() {
  const { hero, summary, problem, howItWorks, perspectives, closing } = site;
  return (
    <PageSlide>
      <HeroSection hero={hero} />

      {/* Rapor ringkas: angka asli dari database, di-stream setelah kerangka halaman tampil. */}
      <section aria-labelledby="rapor-ringkas-title" className="border-b border-line bg-surface">
        <div className="grid gap-10 px-20 py-12 lg:grid-cols-[16rem_1fr] lg:items-end">
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
          <div className="reveal overflow-hidden rounded-card border border-line bg-surface">
            {/* HP: daftar bertumpuk (tabel tiga kolom terlalu sempit). */}
            <dl className="divide-y divide-line sm:hidden">
              {problem.compare.map((row) => (
                <div key={row.topic} className="space-y-1.5 p-4">
                  <dt className="font-semibold">{row.topic}</dt>
                  <dd className="text-sm text-muted line-through decoration-line">{row.today}</dd>
                  <dd className="rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium">
                    <span className="mr-1.5 font-mono text-[11px] font-semibold text-brand uppercase">
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
                <tr className="border-b border-line font-mono text-[11px] tracking-[0.12em] uppercase">
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
          {/* Jalur seperti rute paket: titik + garis putus-putus, label waktu di atas. */}
          <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <span
              aria-hidden
              className="absolute top-[30px] right-8 left-2 hidden h-px [--paper-line:var(--brand)] rule-dashed lg:block"
            />
            {howItWorks.steps.map((step, i) => (
              <li key={step.title} className="reveal relative">
                <p className="font-mono text-xs font-semibold tracking-[0.08em] text-brand uppercase">
                  {step.time}
                </p>
                <span
                  aria-hidden
                  className={cn(
                    "relative mt-2 grid size-5 place-items-center rounded-full border-2 border-brand",
                    i === 0 ? "bg-brand" : "bg-surface",
                  )}
                />
                <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
                <p className="mt-1.5 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {/* Satu resi, tiga sudut pandang: bingkai blueprint, kepala dua kolom, panel pemandangan. */}
      <section aria-labelledby="sudut-pandang-title" className="px-20 py-20 sm:py-24">
        <SectionLabel index="03" className="reveal">
          Untuk siapa
        </SectionLabel>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <h2
            id="sudut-pandang-title"
            className="reveal text-[clamp(2rem,5.5vw,3.25rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-balance"
          >
            {perspectives.title}
          </h2>
          <div className="reveal flex items-end gap-6 lg:pb-2">
            <p className="text-muted">{perspectives.body}</p>
            <PixelDecoration name="receipt" className="hidden sm:block" />
          </div>
        </div>

        <div className="relative mt-14 border-y border-line lg:border-x">
          {/* Penanda sudut & persilangan (hanya layar lebar, saat kolom berdampingan). */}
          {["left-0", "left-1/3", "left-2/3", "left-full"].map((x) => (
            <Fragment key={x}>
              <Corner className={cn("-top-[3.5px] -translate-x-1/2", x)} />
              <Corner className={cn("-bottom-[3.5px] -translate-x-1/2", x)} />
            </Fragment>
          ))}
          <ul className="grid divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {perspectives.items.map((item, i) => {
              const Mini = MINI[i];
              return (
                <li key={item.role} className="reveal flex flex-col p-5 sm:p-7">
                  <div aria-hidden>
                    <PixelCard tone={item.tone} seed={i * 17}>
                      <Mini />
                    </PixelCard>
                  </div>
                  <p className="mt-8 font-mono text-sm text-muted">
                    0{i + 1} <span className="ml-2 text-brand">{item.role}</span>
                  </p>
                  <h3 className="mt-3 text-[1.6rem] leading-tight font-medium tracking-[-0.02em]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-muted">{item.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="reveal mt-8 text-sm text-muted">
          {perspectives.more}{" "}
          <Link
            href="/rapor"
            transitionTypes={["nav-forward"]}
            className="font-semibold text-brand hover:underline"
          >
            Buka rapor SLA
          </Link>
        </p>
      </section>

      {/* Penutup: sobekan struk berisi ajakan & kolom cek resi. */}
      <section aria-labelledby="penutup-title" className="px-20 pb-20">
        <div className="drop-shadow-[0_18px_30px_rgb(15_27_45/0.10)]">
          <div className="relative grid gap-10 bg-paper px-6 pt-14 pb-10 receipt-edge-top sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <PixelDecoration name="stamp" className="absolute top-12 right-10 hidden lg:block" />
            <div>
              <p className="font-mono text-xs tracking-[0.14em] text-ink-soft uppercase">
                — potong di sini —
              </p>
              <h2
                id="penutup-title"
                className="reveal mt-4 text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance"
              >
                {closing.title}
              </h2>
              <p className="reveal mt-4 max-w-xl text-lg text-muted">{closing.body}</p>
              <div className="reveal mt-6 flex flex-wrap gap-3">
                <Button href="/ajukan" transitionTypes={["nav-forward"]}>
                  Ajukan permohonan
                </Button>
                <Button href="/rapor" transitionTypes={["nav-forward"]} variant="secondary">
                  Lihat rapor SLA
                </Button>
              </div>
            </div>
            <div className="reveal">
              <p className="mb-3 text-sm font-semibold">Sudah punya resi?</p>
              <ResiSearch example={hero.exampleResi} />
            </div>
          </div>
        </div>
      </section>

      {/* Strip penutup: warga & petugas arsip berjalan ke/dari kantor di atas awan. */}
      <PixelStreet />
    </PageSlide>
  );
}
