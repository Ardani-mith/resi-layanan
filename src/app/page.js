import ResiSearch from "@/components/application/ResiSearch";
import Button from "@/components/ui/Button";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";

function Section({ id, title, children, className = "" }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("mx-auto max-w-6xl px-4 py-14", className)}
    >
      <h2 id={`${id}-title`} className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Home() {
  const { hero, problem, howItWorks, features, closing } = site;
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-brand uppercase">{hero.eyebrow}</p>
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl">
              {hero.title}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">{hero.body}</p>
            <div className="mt-8 max-w-xl">
              <ResiSearch example={hero.exampleResi} />
            </div>
          </div>
          <div className="rounded-card border border-line bg-bg p-5 shadow-card" aria-hidden>
            <p className="font-mono text-sm text-muted">{hero.exampleResi}</p>
            <p className="mt-1 text-lg font-bold">Akta Kelahiran</p>
            <ol className="mt-5 space-y-4">
              {[
                ["Verifikasi berkas", "Selesai", "bg-ok"],
                ["Entri & validasi data", "Terlambat 1 hari · dieskalasi", "bg-late"],
                ["Persetujuan & TTE", "Menunggu", "bg-line"],
                ["Pencetakan akta", "Menunggu", "bg-line"],
              ].map(([name, state, dot]) => (
                <li key={name} className="flex items-start gap-3">
                  <span className={cn("mt-1.5 size-3 shrink-0 rounded-full", dot)} />
                  <span>
                    <span className="block font-medium">{name}</span>
                    <span className="text-sm text-muted">{state}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <Section id="masalah" title={problem.title}>
        <p className="max-w-3xl text-lg text-muted">{problem.body}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {problem.stats.map((s) => (
            <figure key={s.source} className="rounded-card border border-line bg-surface p-5">
              <p className="text-4xl font-extrabold text-late">{s.value}</p>
              <p className="mt-2 font-medium">{s.label}</p>
              <figcaption className="mt-3 text-xs text-muted">{s.source}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-8 max-w-3xl rounded-card border-l-4 border-brand bg-brand-soft p-4">{problem.gap}</p>
      </Section>

      <Section id="cara-kerja" title={howItWorks.title} className="border-t border-line">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.steps.map((step, i) => (
            <li key={step.title} className="rounded-card border border-line bg-surface p-5">
              <span className="grid size-9 place-items-center rounded-full bg-brand-soft font-bold text-brand">
                {i + 1}
              </span>
              <h3 className="mt-4 font-bold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="fitur" title={features.title} className="border-t border-line">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.items.map((f) => (
            <li key={f.title} className="rounded-card border border-line bg-surface p-5">
              <p className="text-xs font-semibold tracking-wide text-brand uppercase">{f.role}</p>
              <h3 className="mt-2 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{closing.title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted">{closing.body}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/ajukan">Ajukan permohonan</Button>
            <Button href="/rapor" variant="secondary">
              Lihat rapor SLA
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
