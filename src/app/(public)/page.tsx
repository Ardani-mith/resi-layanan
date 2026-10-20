import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import CountUp from "@/components/landing/CountUp";
import { Eyebrow, Hatch, Icon } from "@/components/landing/Decor";
import HeroSection from "@/components/landing/HeroSection";
import SummaryStats, { SummaryStatsSkeleton } from "@/components/landing/SummaryStats";
import SectionError from "@/components/SectionError";
import { Button } from "@/components/ui";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
  className,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("mx-auto max-w-6xl px-4 py-16 sm:py-20", className)}
    >
      {eyebrow && <Eyebrow className="reveal">{eyebrow}</Eyebrow>}
      <h2
        id={`${id}-title`}
        className="reveal mt-3 max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-4xl"
      >
        {title}
      </h2>
      {intro && <p className="reveal mt-4 max-w-3xl text-lg text-muted">{intro}</p>}
      <div className="mt-10">{children}</div>
    </section>
  );
}

export default function Home() {
  const { hero, summary, problem, howItWorks, features, closing } = site;
  return (
    <>
      <HeroSection hero={hero} />

      {/* Rapor ringkas: angka asli dari database, di-stream setelah kerangka halaman tampil. */}
      <section aria-labelledby="rapor-ringkas-title" className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[18rem_1fr] lg:items-center">
          <div>
            <Eyebrow>{summary.eyebrow}</Eyebrow>
            <h2 id="rapor-ringkas-title" className="mt-3 text-xl font-bold tracking-tight">
              {summary.title}
            </h2>
            <Link
              href="/rapor"
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

      <Section id="masalah" eyebrow="Masalah" title={problem.title} intro={problem.body}>
        <div className="grid gap-4 sm:grid-cols-3">
          {problem.stats.map((s) => (
            <figure key={s.source} className="reveal rounded-card border border-line bg-surface p-6">
              <p className="text-5xl font-extrabold tracking-tight text-late">
                <CountUp value={s.value} />
              </p>
              <p className="mt-3 font-medium">{s.label}</p>
              <figcaption className="mt-4 text-xs text-muted">{s.source}</figcaption>
            </figure>
          ))}
        </div>
        <p className="reveal mt-8 max-w-3xl rounded-card border-l-4 border-brand bg-brand-soft p-5 text-lg">
          {problem.gap}
        </p>
      </Section>

      <div className="border-t border-line bg-surface">
        <Section id="cara-kerja" eyebrow="Cara kerja" title={howItWorks.title}>
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {howItWorks.steps.map((step, i) => (
              <li key={step.title} className="reveal relative">
                {/* Garis penghubung antar-langkah, seperti timeline di halaman lacak. */}
                {i < howItWorks.steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-6 left-14 hidden h-0.5 w-[calc(100%-2.5rem)] bg-line lg:block"
                  />
                )}
                <span className="relative grid size-12 place-items-center rounded-2xl bg-brand text-on-brand shadow-card">
                  <Icon name={step.icon} className="size-5" />
                </span>
                <p className="mt-4 text-sm font-semibold text-brand">Langkah {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold">{step.title}</h3>
                <p className="mt-1 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      <Section id="fitur" eyebrow="Fitur" title={features.title} className="border-t border-line">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.items.map((f) => (
            <li
              key={f.title}
              className="reveal group rounded-card border border-line bg-surface p-6 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon name={f.icon} className="size-5" />
                </span>
                <span className="text-xs font-semibold tracking-wide text-muted uppercase">{f.role}</span>
              </div>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <section aria-labelledby="penutup-title" className="relative overflow-hidden surface-hero">
        <Hatch className="border-t-0" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2
            id="penutup-title"
            className="reveal text-3xl font-bold tracking-tight text-balance sm:text-4xl"
          >
            {closing.title}
          </h2>
          <p className="reveal mx-auto mt-4 max-w-2xl text-lg text-hero-muted">{closing.body}</p>
          <div className="reveal mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/ajukan">Ajukan permohonan</Button>
            <Button href="/rapor" variant="hero">
              Lihat rapor SLA
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
