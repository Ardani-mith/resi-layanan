import { formatDayMonth } from "@/lib/format";

/** stats.trend → data ColumnChart: % tepat waktu per minggu, jumlah selesai di keterangan. */
export function weeklyOnTime(trend) {
  return trend.map((week) => ({
    label: formatDayMonth(week.weekStart),
    value: week.onTimeRate,
    detail: `${week.completed} permohonan selesai`,
  }));
}
