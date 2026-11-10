"use client";

import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import Select from "@/components/Select";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { BOTTLENECK_PERIODS, type Bottlenecks, filterBottlenecks } from "@/lib/stats";

const ALL = "semua";
/** Tahap dengan selesai lebih sedikit dari ini tidak dijadikan "paling sering molor" (terlalu sedikit data). */
const MIN_SAMPLE = 5;

const monthFmt = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "Asia/Jakarta" });
const monthLongFmt = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});
const monthDate = (key: string) => new Date(`${key}-15T12:00:00+07:00`);

type Cell = { completed: number; late: number };
const sum = (cells: Cell[]) =>
  cells.reduce((t, c) => ({ completed: t.completed + c.completed, late: t.late + c.late }), {
    completed: 0,
    late: 0,
  });
const rate = (c: Cell) => (c.completed ? c.late / c.completed : null);
const percent = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)}%`);

/** Warna sel: satu hue merah ("terlambat"), makin pekat makin sering molor; ≥ 60% = penuh. */
function heat(value: number | null) {
  if (value === null) return undefined;
  if (value === 0) return { background: "var(--surface-2)" };
  const strength = Math.round(18 + Math.min(1, value / 0.6) * 82);
  return { background: `color-mix(in srgb, var(--late) ${strength}%, var(--surface))` };
}

/**
 * Tren bottleneck bulanan di rapor SLA: heatmap tahap × bulan (persen tahap yang selesai melewati
 * tenggat), filter layanan & periode (3/6/12 bulan, langsung tanpa memuat ulang), ringkasan tahap
 * yang paling sering molor, dan unduhan CSV sesuai filter (/api/stats/bottlenecks).
 */
export default function BottleneckTrend({ data }: { data: Bottlenecks }) {
  const [service, setService] = useState<string>(ALL);
  const [months, setMonths] = useState<number>(6);
  const view = filterBottlenecks(data, service === ALL ? null : service, months);
  const grouped = service === ALL;

  // Tahap paling sering molor dalam periode (cukup data), beserta arah trennya (awal vs akhir periode).
  const ranked = view.services
    .flatMap((s) => s.steps.map((step) => ({ service: s.name, step, total: sum(step.cells) })))
    .filter((r) => r.total.completed >= MIN_SAMPLE)
    .sort((a, b) => (rate(b.total) ?? 0) - (rate(a.total) ?? 0));
  const worst = ranked[0] && (rate(ranked[0].total) ?? 0) > 0 ? ranked[0] : null;
  const third = Math.max(1, Math.floor(view.months.length / 3));
  const trend = worst
    ? (rate(sum(worst.step.cells.slice(-third))) ?? 0) - (rate(sum(worst.step.cells.slice(0, third))) ?? 0)
    : 0;

  const csv = `/api/stats/bottlenecks?bulan=${months}${service === ALL ? "" : `&layanan=${service}`}`;
  const options = [
    { value: ALL, label: "Semua layanan" },
    ...data.services.map((s) => ({ value: s.slug, label: s.name })),
  ];

  return (
    <section className="rounded-card border border-line bg-surface" aria-labelledby="bottleneck-title">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line p-5">
        <div className="max-w-xl">
          <h2 id="bottleneck-title" className="text-lg font-bold">
            Tren bottleneck bulanan
          </h2>
          <p className="mt-1 text-sm text-muted">
            Persen tahap yang selesai melewati tenggat, per bulan selesainya. Makin merah, makin sering molor.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Layanan"
            name="layanan"
            options={options}
            defaultValue={ALL}
            onValueChange={setService}
            className="w-56"
          />
          <div>
            <span id="periode-label" className="mb-1.5 block text-sm font-medium">
              Periode
            </span>
            <div
              role="group"
              aria-labelledby="periode-label"
              className="inline-flex h-11 rounded-card border border-line bg-surface-2 p-1"
            >
              {BOTTLENECK_PERIODS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={months === n}
                  onClick={() => setMonths(n)}
                  className={cn(
                    "rounded-md px-3 text-sm font-medium transition-colors",
                    months === n ? "bg-surface text-text shadow-card" : "text-muted hover:text-text",
                  )}
                >
                  {n} bln
                </button>
              ))}
            </div>
          </div>
          <a href={csv} download className={buttonClass("secondary")}>
            <Download aria-hidden className="size-4" />
            Unduh CSV
          </a>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <p aria-live="polite" className="rounded-lg border border-line bg-surface-2/60 px-4 py-3 text-sm">
          {worst ? (
            <>
              Paling sering molor dalam {months} bulan terakhir:{" "}
              <span className="font-semibold">{worst.step.name}</span>
              {grouped && <span className="text-muted"> · {worst.service}</span>},{" "}
              {percent(rate(worst.total))} melewati tenggat ({worst.total.late} dari {worst.total.completed}{" "}
              tahap).
              {Math.abs(trend) >= 0.05 && (
                <span
                  className={cn(
                    "ml-2 inline-flex items-center gap-1 font-medium",
                    trend < 0 ? "text-ok" : "text-late",
                  )}
                >
                  {trend < 0 ? (
                    <TrendingDown aria-hidden className="size-4" />
                  ) : (
                    <TrendingUp aria-hidden className="size-4" />
                  )}
                  {trend < 0 ? "membaik" : "memburuk"} {Math.round(Math.abs(trend) * 100)} poin
                </span>
              )}
            </>
          ) : (
            <>Belum ada tahap yang melewati tenggat dalam {months} bulan terakhir.</>
          )}
        </p>

        {/* relative: label sr-only (absolute) di sel tabel ikut terpotong di sini, tidak melebarkan halaman di HP. */}
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[36rem] border-separate border-spacing-1 text-sm">
            <caption className="sr-only">
              Persen tahap yang selesai melewati tenggat per bulan, {months} bulan terakhir
            </caption>
            <thead>
              <tr className="text-xs text-muted">
                {/* Kolom tahap menempel di kiri saat bulan digeser (HP). */}
                <th scope="col" className="sticky left-0 z-10 w-36 bg-surface text-left font-medium sm:w-56">
                  Tahap
                </th>
                {view.months.map((m, i) => (
                  <th key={m} scope="col" className="font-medium">
                    <span className="sr-only">{monthLongFmt.format(monthDate(m))}</span>
                    <span aria-hidden>
                      {monthFmt.format(monthDate(m))}
                      {(i === 0 || m.endsWith("-01")) && (
                        <span className="block text-[0.7rem] text-muted/70">{m.slice(0, 4)}</span>
                      )}
                    </span>
                  </th>
                ))}
                <th scope="col" className="font-semibold text-text">
                  Total
                </th>
              </tr>
            </thead>
            {view.services.map((s) => (
              <tbody key={s.slug}>
                {grouped && (
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={view.months.length + 2}
                      className="sticky left-0 bg-surface pt-3 text-left text-xs font-semibold tracking-wide text-muted uppercase"
                    >
                      {s.name}
                    </th>
                  </tr>
                )}
                {s.steps.map((step) => {
                  const total = sum(step.cells);
                  return (
                    <tr key={step.key}>
                      <th scope="row" className="sticky left-0 z-10 bg-surface pr-2 text-left font-medium">
                        {step.name}
                      </th>
                      {step.cells.map((c, i) => {
                        const value = rate(c);
                        return (
                          <td key={view.months[i]} className="p-0">
                            <span
                              title={
                                c.completed
                                  ? `${monthLongFmt.format(monthDate(view.months[i]))}: ${c.late} dari ${c.completed} tahap melewati tenggat`
                                  : "Belum ada tahap selesai"
                              }
                              style={heat(value)}
                              className={cn(
                                "flex h-9 items-center justify-center rounded-md font-mono text-xs tabular-nums",
                                value === null && "text-muted/50",
                                value !== null && value >= 0.35 && "font-semibold text-white",
                              )}
                            >
                              {percent(value)}
                              {c.completed > 0 && (
                                <span className="sr-only">
                                  , {c.late} dari {c.completed} tahap
                                </span>
                              )}
                            </span>
                          </td>
                        );
                      })}
                      <td className="p-0">
                        <span
                          className="flex h-9 items-center justify-center rounded-md border border-line font-mono text-xs font-semibold tabular-nums"
                          title={`${total.late} dari ${total.completed} tahap melewati tenggat`}
                        >
                          {percent(rate(total))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>

        {/* Legenda skala warna. */}
        <div aria-hidden className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
          <span className="flex items-center gap-2">
            0%
            <span
              className="h-2 w-40 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, var(--surface-2), color-mix(in srgb, var(--late) 18%, var(--surface)), var(--late))",
              }}
            />
            ≥ 60% melewati tenggat
          </span>
          <span>— = belum ada tahap selesai</span>
        </div>
      </div>
    </section>
  );
}
