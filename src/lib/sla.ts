// Perhitungan SLA dalam hari kerja, zona waktu WIB (UTC+7, tanpa DST).
// Server Vercel berjalan di UTC, jadi hari & tanggal selalu dihitung lewat offset WIB,
// bukan lewat getDay()/getDate() bawaan yang mengikuti zona waktu mesin.

import type { Step } from "./workflow.ts";

export const DAY_MS = 24 * 60 * 60 * 1000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export type DateLike = Date | string | number;
/** Tanggal libur "YYYY-MM-DD" (WIB). */
export type Holidays = ReadonlySet<string> | readonly string[];

/** Bagian tahap yang dibutuhkan perhitungan waktu; field kosong diperlakukan seperti null/0. */
type TimedStep = Partial<Pick<Step, "startedAt" | "dueAt" | "completedAt" | "pausedAt" | "pausedMs">>;

function toDate(value: DateLike): Date {
  return value instanceof Date ? value : new Date(value);
}

function toHolidaySet(holidays?: Holidays | null): ReadonlySet<string> {
  return holidays instanceof Set ? holidays : new Set((holidays as readonly string[] | null) ?? []);
}

/** Tanggal kalender WIB dalam format YYYY-MM-DD. */
export function wibDateKey(value: DateLike): string {
  return new Date(toDate(value).getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Hari kerja = Senin–Jumat WIB dan bukan tanggal libur. */
export function isWorkday(value: DateLike, holidays?: Holidays): boolean {
  const wib = new Date(toDate(value).getTime() + WIB_OFFSET_MS);
  const day = wib.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !toHolidaySet(holidays).has(wib.toISOString().slice(0, 10));
}

/**
 * Tambah n hari kerja dengan jam yang sama. Hari pengajuan tidak dihitung,
 * jadi Jumat 10.00 + 1 hari kerja = Senin 10.00, Sabtu 10.00 + 1 = Senin 10.00.
 */
export function addWorkdays(start: DateLike, days: number, holidays?: Holidays): Date {
  const set = toHolidaySet(holidays);
  let time = toDate(start).getTime();
  let added = 0;
  while (added < days) {
    time += DAY_MS;
    if (isWorkday(time, set)) added += 1;
  }
  return new Date(time);
}

/** Tenggat awal sebuah tahap; null jika tahap tidak punya SLA (mis. penyerahan). */
export function computeDueAt(
  startedAt: DateLike | null,
  slaDays: number | null,
  holidays?: Holidays,
): Date | null {
  if (!startedAt || !slaDays) return null;
  return addWorkdays(startedAt, slaDays, holidays);
}

/** Waktu "sekarang" setelah digeser simulasi demo. */
export function nowWithOffset(offsetMs = 0, realNow = Date.now()): Date {
  return new Date(realNow + (offsetMs || 0));
}

// --- Jeda (perlu_perbaikan) -------------------------------------------------

/** Mulai jeda: hitung mundur berhenti di titik ini. Mengubah step secara langsung. */
export function pauseStep<T extends TimedStep>(step: T, now: DateLike): T {
  if (step.pausedAt) return step;
  step.pausedAt = toDate(now);
  return step;
}

/**
 * Akhiri jeda: durasi jeda ditambahkan ke pausedMs dan tenggat digeser sebesar
 * durasi yang sama, sehingga sisa waktu instansi persis seperti saat dijeda.
 */
export function resumeStep<T extends TimedStep>(step: T, now: DateLike): T {
  if (!step.pausedAt) return step;
  const delta = Math.max(0, toDate(now).getTime() - toDate(step.pausedAt).getTime());
  step.pausedMs = (step.pausedMs || 0) + delta;
  if (step.dueAt) step.dueAt = new Date(toDate(step.dueAt).getTime() + delta);
  step.pausedAt = null;
  return step;
}

// --- Status tahap -----------------------------------------------------------

/** Titik acuan waktu tahap: jika dijeda, waktu dibekukan di pausedAt. */
function referenceTime(step: TimedStep, now: DateLike): Date {
  return step.pausedAt ? toDate(step.pausedAt) : toDate(now);
}

/** Sisa waktu (ms) sampai tenggat; negatif berarti terlambat; null jika tanpa SLA. */
export function remainingMs(step: TimedStep, now: DateLike): number | null {
  if (!step.dueAt || step.completedAt) return null;
  return toDate(step.dueAt).getTime() - referenceTime(step, now).getTime();
}

export function isOverdue(step: TimedStep, now: DateLike): boolean {
  const left = remainingMs(step, now);
  return left !== null && left < 0;
}

/** Apakah tahap yang sudah selesai melewati tenggatnya. */
export function finishedLate(step: TimedStep): boolean {
  return Boolean(step.completedAt && step.dueAt && toDate(step.completedAt) > toDate(step.dueAt));
}

export type StepState = "selesai" | "berjalan" | "dijeda" | "terlambat" | "menunggu";

/** Status tampilan sebuah tahap. */
export function stepState(step: TimedStep, now: DateLike): StepState {
  if (step.completedAt) return "selesai";
  if (!step.startedAt) return "menunggu";
  if (step.pausedAt) return "dijeda";
  if (isOverdue(step, now)) return "terlambat";
  return "berjalan";
}

/** Durasi kerja efektif sebuah tahap (tanpa waktu jeda), dalam ms. */
export function workedMs(step: TimedStep, now: DateLike = Date.now()): number {
  if (!step.startedAt) return 0;
  const end = step.completedAt ? toDate(step.completedAt) : referenceTime(step, now);
  return Math.max(0, end.getTime() - toDate(step.startedAt).getTime() - (step.pausedMs || 0));
}

/**
 * Estimasi selesai seluruh permohonan: tenggat tahap berjalan (atau sekarang jika
 * sudah lewat) ditambah SLA tahap-tahap berikutnya. Null selama dijeda, karena
 * selesainya bergantung pada kapan warga melengkapi berkas.
 */
export function estimateCompletion(
  steps: readonly (TimedStep & { slaDays: number | null })[],
  currentIndex: number,
  now: DateLike,
  holidays?: Holidays,
): Date | null {
  const current = steps[currentIndex];
  if (!current || current.completedAt || current.pausedAt) return null;
  let cursor = current.dueAt ? toDate(current.dueAt) : toDate(now);
  if (cursor < toDate(now)) cursor = toDate(now);
  for (const step of steps.slice(currentIndex + 1)) {
    if (step.slaDays) cursor = addWorkdays(cursor, step.slaDays, holidays);
  }
  return cursor;
}
