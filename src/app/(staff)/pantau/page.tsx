import Link from "next/link";
import { Suspense } from "react";
import { Meter, StatTile, weeklyOnTime } from "@/components/charts";
import ColumnChart from "@/components/charts/ColumnChart";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getStats, requireStaffPage } from "@/lib/dal";
import { formatDuration, formatPercent, formatWorkHours } from "@/lib/format";
import type { Stats } from "@/lib/stats";

export const metadata = { title: "Pantau kinerja" };

// Sama dengan ambang "waspada" pada Meter: di bawah ini keterlambatan dianggap wajar.
const BOTTLENECK_MIN_RATE = 0.15;

/** Tahap dengan tingkat keterlambatan tertinggi, jika sudah di atas ambang waspada. */
function bottleneckKey(steps: Stats["services"][number]["steps"]): string | null {
  const worst = steps.reduce<(typeof steps)[number] | null>(
    (a, b) => ((b.lateRate ?? 0) > (a?.lateRate ?? 0) ? b : a),
    null,
  );
  return worst && (worst.lateRate ?? 0) >= BOTTLENECK_MIN_RATE ? worst.key : null;
}

async function Dashboard() {
  await requireStaffPage(["pimpinan", "admin"], "/pantau");
  const stats = await getStats({ internal: true });
  const { overall, services, escalations, trend } = stats;

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pantau kinerja layanan</h1>
        <p className="text-muted">Keterlambatan dan eskalasi dihitung ulang setiap halaman dibuka.</p>
      </div>

      <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile
          label="Sedang berjalan"
          value={overall.open}
          note={`${overall.waitingFix} menunggu perbaikan warga`}
        />
        <StatTile
          label="Terlambat sekarang"
          value={overall.overdueNow}
          note={`${escalations.length} eskalasi terbuka`}
          tone={overall.overdueNow > 0 ? "late" : undefined}
        />
        <StatTile
          label="Selesai tepat waktu"
          value={formatPercent(overall.onTimeRate)}
          note={`dari ${overall.completed} permohonan selesai`}
        />
        <StatTile
          label="Terbit ≤ 24 jam"
          value={formatPercent(overall.promiseRate)}
          note={`rata-rata ${formatWorkHours(overall.avgIssueHours)} setelah berkas lengkap`}
        />
        <StatTile
          label="Kepuasan warga"
          value={overall.ratingAvg === null ? "—" : `${overall.ratingAvg.toLocaleString("id-ID")} / 5`}
          note={`${overall.ratingCount} penilaian`}
        />
      </section>

      <section className="rounded-card border border-line bg-surface" aria-labelledby="esc-title">
        <div className="border-b border-line p-5">
          <h2 id="esc-title" className="text-lg font-bold">
            Eskalasi terbuka
          </h2>
          <p className="text-sm text-muted">
            Level 1 diteruskan ke Kepala Seksi; lewat 1 hari kerja dari tenggat naik ke Kepala Bidang.
          </p>
        </div>
        {escalations.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th scope="col" className="px-5 py-2 font-medium">
                    Resi
                  </th>
                  <th scope="col" className="px-5 py-2 font-medium">
                    Tahap
                  </th>
                  <th scope="col" className="px-5 py-2 font-medium">
                    Pemohon
                  </th>
                  <th scope="col" className="px-5 py-2 font-medium">
                    Level
                  </th>
                  <th scope="col" className="px-5 py-2 text-right font-medium">
                    Terlambat
                  </th>
                </tr>
              </thead>
              <tbody>
                {escalations.map((e) => (
                  <tr key={`${e.resi}-${e.stepName}-${e.level}`} className="border-t border-line">
                    <td className="px-5 py-2.5">
                      <Link href={`/kerja/${e.resi}`} className="font-mono text-brand hover:underline">
                        {e.resi}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5">
                      {e.stepName}
                      <span className="block text-xs text-muted">{e.serviceName}</span>
                    </td>
                    <td className="px-5 py-2.5">{e.applicantName}</td>
                    <td className="px-5 py-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          e.level === 2 ? "bg-late text-surface" : "bg-late-soft text-late",
                        )}
                      >
                        {e.level} · {e.target}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {e.lateMs ? formatDuration(e.lateMs) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-muted">Tidak ada eskalasi terbuka.</p>
        )}
      </section>

      <ColumnChart
        title="Selesai tepat waktu per minggu"
        description="Persentase permohonan yang selesai tanpa satu tahap pun melewati tenggat."
        data={weeklyOnTime(trend)}
        emptyLabel="Belum ada yang selesai"
      />

      <section aria-labelledby="bottleneck-title" className="space-y-3">
        <div>
          <h2 id="bottleneck-title" className="text-lg font-bold">
            Analisis bottleneck per tahap
          </h2>
          <p className="text-sm text-muted">
            Rata-rata lama pengerjaan dalam jam kerja (tanpa waktu jeda) dibanding target, dan seberapa sering
            tahap itu terlambat.
          </p>
        </div>
        <div className="space-y-4">
          {services.map((service) => {
            const worst = bottleneckKey(service.steps);
            return (
              <article key={service.slug} className="rounded-card border border-line bg-surface p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="font-bold">{service.name}</h3>
                  <p className="text-sm text-muted">
                    {formatPercent(service.onTimeRate)} tepat waktu · {formatPercent(service.promiseRate)}{" "}
                    terbit ≤ 24 jam · target terbit {formatWorkHours(service.issueTargetHours)} ·{" "}
                    {service.open} berjalan
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="mt-3 w-full min-w-[34rem] table-fixed text-left text-sm">
                    <thead className="text-muted">
                      <tr>
                        <th scope="col" className="pb-2 font-medium">
                          Tahap
                        </th>
                        <th scope="col" className="w-32 pb-2 font-medium">
                          Target
                        </th>
                        <th scope="col" className="w-44 pb-2 font-medium">
                          Rata-rata pengerjaan
                        </th>
                        <th scope="col" className="w-52 pb-2 font-medium">
                          Selesai terlambat
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {service.steps.map((step) => (
                        <tr key={step.key} className="border-t border-line">
                          <td className="py-2.5 pr-3">
                            {step.name}
                            {step.key === worst && (
                              <span className="ml-2 rounded bg-late-soft px-1.5 py-0.5 text-[11px] font-semibold text-late">
                                bottleneck
                              </span>
                            )}
                            {step.overdueNow > 0 && (
                              <span className="block text-xs text-late">
                                {step.overdueNow} sedang terlambat
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-3 text-muted tabular-nums">
                            {step.slaHours ? formatWorkHours(step.slaHours) : "—"}
                          </td>
                          <td className="py-2.5 pr-3 tabular-nums">{formatWorkHours(step.avgHours)}</td>
                          <td className="py-2.5">
                            <Meter
                              value={step.slaHours ? step.lateRate : null}
                              label={`Tingkat terlambat ${step.name}`}
                              severity
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

export default function MonitorPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Suspense fallback={<Skeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}
