// KPI untuk dashboard pimpinan dan rapor SLA publik. Fungsi murni di atas daftar
// permohonan (lean); volume demo kecil, jadi agregasi di JS lebih mudah dibaca
// daripada pipeline $group yang panjang.

import {
  type DateLike,
  DAY_MS,
  finishedLate,
  type Holidays,
  HOUR_MS,
  isOverdue,
  ISSUE_PROMISE_HOURS,
  issuePromise,
  workedWorkMs,
} from "./sla.ts";
import {
  type ApplicationData,
  type Escalation,
  OPEN_STATUSES,
  RUNNING_STATUSES,
  STATUS,
  type StepTemplate,
} from "./workflow.ts";

/** Permohonan lean (field yang dipilih getStats). */
type StatsApp = Pick<
  ApplicationData,
  | "resi"
  | "serviceId"
  | "serviceName"
  | "applicant"
  | "status"
  | "currentStep"
  | "steps"
  | "escalations"
  | "rating"
  | "createdAt"
  | "completedAt"
>;
type StatsService = { _id: unknown; slug: string; name: string; steps?: Pick<StepTemplate, "slaHours">[] };

const WEEK_MS = 7 * DAY_MS;

function round(value: number | null, digits = 1): number | null {
  if (value === null || Number.isNaN(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function ratio(part: number, whole: number): number | null {
  return whole ? part / whole : null;
}

const isCompleted = (app: StatsApp) => app.status === STATUS.SELESAI;
const completedOnTime = (app: StatsApp) => app.steps.every((s) => !finishedLate(s));
const isOverdueNow = (app: StatsApp, now: DateLike) =>
  RUNNING_STATUSES.includes(app.status) && isOverdue(app.steps[app.currentStep], now);

/** Lama terbit (jam kerja, ms) sejak berkas lengkap; null jika dokumen belum terbit. */
function issueWorkMs(app: StatsApp, now: DateLike, holidays?: Holidays): number | null {
  const promise = issuePromise(app.steps, now, holidays);
  return promise?.issuedAt ? promise.workMs : null;
}

function summarize(apps: StatsApp[], now: DateLike, holidays?: Holidays) {
  const completed = apps.filter(isCompleted);
  const rated = completed.filter((a) => a.rating?.score);
  const issued = apps
    .filter((a) => a.status !== STATUS.DITOLAK)
    .map((a) => issueWorkMs(a, now, holidays))
    .filter((ms): ms is number => ms !== null);
  return {
    total: apps.length,
    open: apps.filter((a) => OPEN_STATUSES.includes(a.status)).length,
    waitingFix: apps.filter((a) => a.status === STATUS.PERLU_PERBAIKAN).length,
    overdueNow: apps.filter((a) => isOverdueNow(a, now)).length,
    completed: completed.length,
    rejected: apps.filter((a) => a.status === STATUS.DITOLAK).length,
    onTimeRate: round(ratio(completed.filter(completedOnTime).length, completed.length), 3),
    issued: issued.length,
    /** Rata-rata jam kerja dari berkas lengkap sampai dokumen terbit. */
    avgIssueHours: round((average(issued) ?? NaN) / HOUR_MS),
    /** Porsi dokumen yang terbit ≤ 1 hari kerja setelah berkas lengkap (Permendagri 19/2018). */
    promiseRate: round(
      ratio(issued.filter((ms) => ms <= ISSUE_PROMISE_HOURS * HOUR_MS).length, issued.length),
      3,
    ),
    ratingAvg: round(average(rated.map((a) => a.rating?.score ?? 0))),
    ratingCount: rated.length,
  };
}

/** Rata-rata durasi & tingkat keterlambatan per tahap (analisis bottleneck). */
interface StepRow {
  key: string;
  name: string;
  slaHours: number | null;
  durations: number[];
  done: number;
  late: number;
  overdueNow: number;
}

function stepBreakdown(apps: StatsApp[], now: DateLike, holidays?: Holidays) {
  const byKey = new Map<string, StepRow>();
  for (const app of apps) {
    for (const step of app.steps) {
      if (!step.startedAt) continue;
      const row = byKey.get(step.key) ?? {
        key: step.key,
        name: step.name,
        slaHours: step.slaHours,
        durations: [],
        done: 0,
        late: 0,
        overdueNow: 0,
      };
      if (step.completedAt) {
        row.done += 1;
        row.durations.push(workedWorkMs(step, now, holidays));
        if (finishedLate(step)) row.late += 1;
      } else if (RUNNING_STATUSES.includes(app.status) && isOverdue(step, now)) {
        row.overdueNow += 1;
      }
      byKey.set(step.key, row);
    }
  }
  return [...byKey.values()].map(({ durations, done, late, ...row }) => ({
    ...row,
    completed: done,
    /** Rata-rata lama tahap dalam jam kerja. */
    avgHours: round((average(durations) ?? NaN) / HOUR_MS),
    lateRate: round(ratio(late, done), 3),
  }));
}

/** Tren mingguan: jumlah selesai & persentase tepat waktu, minggu terlama dulu. */
function weeklyTrend(apps: StatsApp[], now: DateLike, weeks: number) {
  const end = new Date(now).getTime();
  return Array.from({ length: weeks }, (_, i) => {
    const to = end - (weeks - 1 - i) * WEEK_MS;
    const from = to - WEEK_MS;
    const done = apps.filter((a) => {
      if (!isCompleted(a)) return false;
      const t = Number(a.completedAt);
      return t > from && t <= to;
    });
    return {
      weekStart: new Date(from),
      completed: done.length,
      onTimeRate: round(ratio(done.filter(completedOnTime).length, done.length), 3),
    };
  });
}

export function computeStats(
  apps: StatsApp[],
  services: StatsService[],
  now: DateLike,
  { weeks = 8, holidays }: { weeks?: number; holidays?: Holidays } = {},
) {
  return {
    generatedAt: new Date(now),
    overall: summarize(apps, now, holidays),
    services: services.map((service) => {
      const own = apps.filter((a) => String(a.serviceId) === String(service._id));
      return {
        id: String(service._id),
        slug: service.slug,
        name: service.name,
        targetHours: service.steps?.reduce((sum, step) => sum + (step.slaHours || 0), 0) ?? null,
        /** Target terbit setelah berkas lengkap (tahap ber-SLA setelah verifikasi). */
        issueTargetHours:
          service.steps?.slice(1).reduce((sum, step) => sum + (step.slaHours || 0), 0) ?? null,
        ...summarize(own, now, holidays),
        steps: stepBreakdown(own, now, holidays),
      };
    }),
    trend: weeklyTrend(apps, now, weeks),
  };
}

/**
 * Eskalasi yang belum selesai, satu baris per tahap dengan level tertingginya
 * (tahap di level 2 tidak muncul dua kali). Paling parah & paling lama dulu. Khusus petugas.
 */
export function openEscalations(apps: StatsApp[], now: DateLike) {
  const rows = [];
  for (const app of apps) {
    const highest = new Map<string, Escalation>();
    for (const esc of app.escalations ?? []) {
      if (esc.resolvedAt) continue;
      if ((highest.get(esc.stepKey)?.level ?? 0) < esc.level) highest.set(esc.stepKey, esc);
    }
    for (const esc of highest.values()) {
      const step = app.steps.find((s) => s.key === esc.stepKey);
      rows.push({
        resi: app.resi,
        serviceName: app.serviceName,
        applicantName: app.applicant?.name,
        stepName: step?.name ?? esc.stepKey,
        level: esc.level,
        target: esc.target,
        createdAt: esc.createdAt,
        lateMs: step?.dueAt ? Number(new Date(now)) - Number(step.dueAt) : null,
      });
    }
  }
  return rows.sort((a, b) => b.level - a.level || (b.lateMs ?? 0) - (a.lateMs ?? 0));
}

export type Stats = ReturnType<typeof computeStats>;
export type OpenEscalation = ReturnType<typeof openEscalations>[number];
