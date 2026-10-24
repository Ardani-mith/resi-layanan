// Grafik & angka ringkas yang aman untuk Server Component. Grafik kolom interaktif
// (client) ada di ColumnChart.tsx.

import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDayMonth } from "@/lib/format";
import type { Stats } from "@/lib/stats";
import type { ColumnDatum } from "./ColumnChart";

/** Stat tile: label · nilai · keterangan. `tone="late"` menambahkan penanda status + ikon (bukan warna saja). */
export function StatTile({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: "late";
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1.5 font-mono text-3xl font-medium tracking-tight tabular-nums",
          tone === "late" && "text-late",
        )}
      >
        {tone === "late" && <TriangleAlert aria-hidden className="size-6" />}
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

/**
 * Meter rasio 0–1 dengan angka di sampingnya (nilai tidak pernah hanya lewat warna).
 * severity=true: isi berubah warna sesuai tingkat (aman → waspada → kritis) untuk
 * metrik yang "makin tinggi makin buruk", mis. tingkat keterlambatan.
 */
export function Meter({
  value,
  label,
  severity = false,
  thresholds = [0.15, 0.3],
}: {
  value: number | null | undefined;
  label: string;
  severity?: boolean;
  thresholds?: [warn: number, critical: number];
}) {
  if (value === null || value === undefined) return <span className="text-sm text-muted">—</span>;
  const pct = Math.round(value * 100);
  const fill = !severity
    ? "bg-chart"
    : value >= thresholds[1]
      ? "bg-late"
      : value >= thresholds[0]
        ? "bg-warn"
        : "bg-ok";
  return (
    <div className="flex items-center gap-2">
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
        className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-chart-track"
      >
        <div
          className={cn("h-full rounded-full", fill)}
          style={{ width: `${Math.max(pct, value > 0 ? 3 : 0)}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-sm tabular-nums">{pct}%</span>
    </div>
  );
}

/** stats.trend → data ColumnChart: % tepat waktu per minggu, jumlah selesai di keterangan. */
export function weeklyOnTime(trend: Stats["trend"]): ColumnDatum[] {
  return trend.map((week) => ({
    label: formatDayMonth(week.weekStart),
    value: week.onTimeRate,
    detail: `${week.completed} permohonan selesai`,
  }));
}
