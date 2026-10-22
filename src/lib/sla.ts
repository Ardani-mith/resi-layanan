// Perhitungan SLA dalam JAM KERJA (Senin–Jumat 08.00–16.00 WIB, di luar libur), zona waktu
// WIB (UTC+7, tanpa DST). Satuan jam mengikuti Permendagri 19/2018: dokumen kependudukan
// terbit paling lama 24 jam setelah persyaratan dinyatakan lengkap.
// Server Vercel berjalan di UTC, jadi hari & tanggal selalu dihitung lewat offset WIB,
// bukan lewat getDay()/getDate() bawaan yang mengikuti zona waktu mesin.

import type { Step } from "./workflow.ts";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
const WIB_OFFSET_MS = 7 * HOUR_MS;
/** Jam layanan kantor (WIB). */
export const WORK_START_HOUR = 8;
export const WORK_END_HOUR = 16;
/** 1 hari kerja = 8 jam kerja. */
export const WORKDAY_HOURS = WORK_END_HOUR - WORK_START_HOUR;
/**
 * Janji Permendagri 19/2018: dokumen terbit paling lama 24 jam setelah persyaratan dinyatakan
 * lengkap. Di Pantas: tahap-tahap setelah Verifikasi berkas, maksimal 1 hari kerja.
 */
export const ISSUE_PROMISE_HOURS = WORKDAY_HOURS;

export type DateLike = Date | string | number;
/** Tanggal libur "YYYY-MM-DD" (WIB). */
export type Holidays = ReadonlySet<string> | readonly string[];

/** Bagian tahap yang dibutuhkan perhitungan waktu; field kosong diperlakukan seperti null/0. */
type TimedStep = Partial<
  Pick<Step, "startedAt" | "dueAt" | "completedAt" | "pausedAt" | "pausedMs" | "pausedWorkMs">
>;

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

// --- Jam kerja ----------------------------------------------------------------

/** Jendela jam kerja [mulai, selesai) pada tanggal WIB yang memuat `time` (ms). */
function workWindow(time: number): [number, number] {
  const wib = new Date(time + WIB_OFFSET_MS);
  const midnight = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - WIB_OFFSET_MS;
  return [midnight + WORK_START_HOUR * HOUR_MS, midnight + WORK_END_HOUR * HOUR_MS];
}

/**
 * Tambah `ms` waktu kerja. Waktu di luar jam kerja tidak dihitung: Senin 15.00 + 2 jam kerja
 * = Selasa 09.00; Jumat 17.00 + 1 jam = Senin 09.00; Sabtu + 1 jam = Senin 09.00.
 */
export function addWorkMs(start: DateLike, ms: number, holidays?: Holidays): Date {
  const set = toHolidaySet(holidays);
  let time = toDate(start).getTime();
  let left = ms;
  for (let guard = 0; guard < 3660; guard += 1) {
    const [open, close] = workWindow(time);
    if (!isWorkday(time, set) || time >= close) {
      time = workWindow(time + DAY_MS)[0];
      continue;
    }
    if (time < open) time = open;
    if (left <= close - time) return new Date(time + left);
    left -= close - time;
    time = workWindow(time + DAY_MS)[0];
  }
  throw new Error("addWorkMs: rentang terlalu panjang.");
}

export function addWorkHours(start: DateLike, hours: number, holidays?: Holidays): Date {
  return addWorkMs(start, hours * HOUR_MS, holidays);
}

/** Lama waktu kerja (ms) di antara dua titik; 0 jika `to` ≤ `from`. */
export function workMsBetween(from: DateLike, to: DateLike, holidays?: Holidays): number {
  const set = toHolidaySet(holidays);
  const end = toDate(to).getTime();
  let time = toDate(from).getTime();
  let total = 0;
  while (time < end) {
    const [open, close] = workWindow(time);
    if (isWorkday(time, set)) total += Math.max(0, Math.min(close, end) - Math.max(open, time));
    time = workWindow(time + DAY_MS)[0] - WORK_START_HOUR * HOUR_MS; // tengah malam WIB berikutnya
  }
  return total;
}

/** Tenggat awal sebuah tahap; null jika tahap tidak punya SLA (mis. penyerahan). */
export function computeDueAt(
  startedAt: DateLike | null,
  slaHours: number | null,
  holidays?: Holidays,
): Date | null {
  if (!startedAt || !slaHours) return null;
  return addWorkHours(startedAt, slaHours, holidays);
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
 * Akhiri jeda: durasi jeda ditambahkan ke pausedMs, dan tenggat dihitung ulang dari
 * SISA JAM KERJA saat dijeda, sehingga jatah waktu instansi persis seperti sebelum dijeda
 * (dijeda Senin 15.00 dengan sisa 2 jam, dilanjutkan Rabu 10.00 → tenggat Rabu 12.00).
 */
export function resumeStep<T extends TimedStep>(step: T, now: DateLike, holidays?: Holidays): T {
  if (!step.pausedAt) return step;
  const pausedAt = toDate(step.pausedAt);
  const delta = Math.max(0, toDate(now).getTime() - pausedAt.getTime());
  step.pausedMs = (step.pausedMs || 0) + delta;
  step.pausedWorkMs = (step.pausedWorkMs || 0) + workMsBetween(pausedAt, now, holidays);
  if (step.dueAt) {
    const due = toDate(step.dueAt);
    step.dueAt =
      due > pausedAt
        ? addWorkMs(now, workMsBetween(pausedAt, due, holidays), holidays)
        : new Date(due.getTime() + delta); // sudah terlambat saat dijeda: keterlambatan tetap
  }
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

/** Lama tahap dalam JAM KERJA (ms), tanpa jeda menunggu warga. */
export function workedWorkMs(step: TimedStep, now: DateLike, holidays?: Holidays): number {
  if (!step.startedAt) return 0;
  const end = step.completedAt ? toDate(step.completedAt) : referenceTime(step, now);
  return Math.max(0, workMsBetween(step.startedAt, end, holidays) - (step.pausedWorkMs || 0));
}

/** Durasi kerja efektif sebuah tahap (tanpa waktu jeda), dalam ms kalender. */
export function workedMs(step: TimedStep, now: DateLike = Date.now()): number {
  if (!step.startedAt) return 0;
  const end = step.completedAt ? toDate(step.completedAt) : referenceTime(step, now);
  return Math.max(0, end.getTime() - toDate(step.startedAt).getTime() - (step.pausedMs || 0));
}

// --- Janji terbit (Permendagri 19/2018) ------------------------------------------

type PromiseStep = TimedStep & { slaHours: number | null };

/**
 * Janji terbit sebuah permohonan: berkas lengkap (Verifikasi selesai) + 1 hari kerja, digeser
 * sebesar jeda menunggu warga di tahap berikutnya. null jika belum diverifikasi atau tidak
 * ada tahap penerbitan.
 */
export function issuePromise(steps: readonly PromiseStep[], now: DateLike, holidays?: Holidays) {
  const verifiedAt = steps[0]?.completedAt;
  const issueSteps = steps.slice(1).filter((s) => s.slaHours);
  if (!verifiedAt || !issueSteps.length) return null;
  const pausedWork = issueSteps.reduce((sum, s) => sum + (s.pausedWorkMs || 0), 0);
  const dueAt = addWorkMs(verifiedAt, ISSUE_PROMISE_HOURS * HOUR_MS + pausedWork, holidays);
  const issuedAt = issueSteps.every((s) => s.completedAt) ? toDate(issueSteps.at(-1)!.completedAt!) : null;
  const end = issuedAt ?? toDate(now);
  return {
    verifiedAt: toDate(verifiedAt),
    dueAt,
    issuedAt,
    /** Lama terbit dalam jam kerja (ms), tanpa jeda; untuk yang belum terbit = sampai sekarang. */
    workMs: Math.max(0, workMsBetween(verifiedAt, end, holidays) - pausedWork),
    kept: end <= dueAt,
  };
}

/**
 * Estimasi selesai seluruh permohonan: tenggat tahap berjalan (atau sekarang jika
 * sudah lewat) ditambah SLA tahap-tahap berikutnya. Null selama dijeda, karena
 * selesainya bergantung pada kapan warga melengkapi berkas.
 */
export function estimateCompletion(
  steps: readonly (TimedStep & { slaHours: number | null })[],
  currentIndex: number,
  now: DateLike,
  holidays?: Holidays,
): Date | null {
  const current = steps[currentIndex];
  if (!current || current.completedAt || current.pausedAt) return null;
  let cursor = current.dueAt ? toDate(current.dueAt) : toDate(now);
  if (cursor < toDate(now)) cursor = toDate(now);
  for (const step of steps.slice(currentIndex + 1)) {
    if (step.slaHours) cursor = addWorkHours(cursor, step.slaHours, holidays);
  }
  return cursor;
}
