// Format tanggal/durasi untuk UI. Zona waktu selalu Asia/Jakarta (WIB) secara
// eksplisit supaya hasil render server (UTC di Vercel) sama persis dengan browser.

const TZ = "Asia/Jakarta";

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortDateFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dayMonthFmt = new Intl.DateTimeFormat("id-ID", { timeZone: TZ, day: "numeric", month: "short" });

type DateInput = Date | string | number | null | undefined;

const valid = (value: DateInput): value is Date | string | number =>
  value !== null && value !== undefined && !Number.isNaN(new Date(value).getTime());

/** "Sen, 12 Okt 14.30" */
export function formatDateTime(value: DateInput): string {
  return valid(value) ? `${dateTimeFmt.format(new Date(value))} WIB` : "—";
}

/** "Senin, 12 Oktober 2026" */
export function formatDate(value: DateInput): string {
  return valid(value) ? dateFmt.format(new Date(value)) : "—";
}

/** "12 Okt 2026" */
export function formatShortDate(value: DateInput): string {
  return valid(value) ? shortDateFmt.format(new Date(value)) : "—";
}

/** "12 Okt" */
export function formatDayMonth(value: DateInput): string {
  return valid(value) ? dayMonthFmt.format(new Date(value)) : "—";
}

/** Jam → "5 jam" / "1,5 hari" (1 hari = 24 jam kalender). */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "—";
  if (hours < 24) return `${Math.round(hours)} jam`;
  return `${(hours / 24).toLocaleString("id-ID", { maximumFractionDigits: 1 })} hari`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Durasi ringkas, dua satuan terbesar: "2 hari 4 jam", "3 jam 20 menit", "kurang dari 1 menit". */
export function formatDuration(ms: number | null | undefined): string {
  const abs = Math.abs(ms ?? 0);
  if (abs < MINUTE) return "kurang dari 1 menit";
  const days = Math.floor(abs / DAY);
  const hours = Math.floor((abs % DAY) / HOUR);
  const minutes = Math.floor((abs % HOUR) / MINUTE);
  const parts: string[] = [];
  if (days) parts.push(`${days} hari`);
  if (hours) parts.push(`${hours} jam`);
  if (!days && minutes) parts.push(`${minutes} menit`);
  return parts.slice(0, 2).join(" ");
}

export function formatPercent(ratio: number | null | undefined): string {
  return ratio === null || ratio === undefined ? "—" : `${Math.round(ratio * 100)}%`;
}
