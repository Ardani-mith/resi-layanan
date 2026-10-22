import { CheckCircle2, FileCheck2 } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatTile } from "@/components/charts";
import { Button, Skeleton } from "@/components/ui";
import type { ParamsOf } from "@/lib/api";
import { getServiceCatalog } from "@/lib/dal";
import { formatPercent, formatWorkHours } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";

export const metadata = { title: "Detail layanan" };

const number = (value: number | null, suffix = "") =>
  value === null ? "—" : `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}${suffix}`;

async function ServiceDetail({ params }: ParamsOf<{ slug: string }>) {
  const { slug } = await params;
  const service = (await getServiceCatalog()).find((s) => s.slug === slug);
  if (!service) notFound();
  const perf = service.performance;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{service.name}</h1>
          <p className="mt-2 text-muted">{service.description}</p>
        </div>
        <Button href={`/ajukan?layanan=${service.slug}`}>Ajukan sekarang</Button>
      </div>

      <section aria-labelledby="kinerja" className="mt-8">
        <h2 id="kinerja" className="sr-only">
          Kinerja layanan
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Selesai tepat waktu"
            value={formatPercent(perf.onTimeRate)}
            note={`dari ${perf.completed} permohonan`}
          />
          <StatTile
            label="Terbit ≤ 24 jam"
            value={formatPercent(perf.promiseRate)}
            note={`rata-rata ${formatWorkHours(perf.avgIssueHours)} setelah berkas lengkap`}
          />
          <StatTile
            label="Kepuasan warga"
            value={number(perf.ratingAvg, "/5")}
            note={`${perf.ratingCount} penilaian`}
          />
          <StatTile label="Sedang diproses" value={perf.open} />
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section aria-labelledby="syarat" className="rounded-card border border-line bg-surface p-5">
          <h2 id="syarat" className="text-lg font-bold">
            Persyaratan
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {service.requirements.map((r) => (
              <li key={r} className="flex gap-2">
                <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-4 flex gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <FileCheck2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>
              Hasil: <span className="font-semibold">{service.output}</span>
            </span>
          </p>
        </section>

        <section aria-labelledby="tahapan" className="rounded-card border border-line bg-surface p-5">
          <h2 id="tahapan" className="text-lg font-bold">
            Tahapan & janji waktu
          </h2>
          <p className="text-sm text-muted">
            Verifikasi berkas paling lama {formatWorkHours(service.steps[0]?.slaHours)}; setelah berkas
            lengkap, dokumen terbit paling lama {formatWorkHours(service.issueSlaHours)} (Permendagri 19/2018:
            maksimal 24 jam). Jam kerja Senin–Jumat 08.00–16.00 WIB. Waktu menunggu perbaikan berkas dari
            warga tidak dihitung.
          </p>
          <ol className="mt-4 space-y-3">
            {service.steps.map((step, i) => (
              <li key={step.key} className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-medium">{step.name}</p>
                  <p className="text-sm text-muted">
                    {ROLE_LABELS[step.role]} ·{" "}
                    {step.slaHours ? formatWorkHours(step.slaHours) : "tanpa tenggat"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}

export default function ServiceDetailPage({ params }: ParamsOf<{ slug: string }>) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<Skeleton />}>
        <ServiceDetail params={params} />
      </Suspense>
    </div>
  );
}
