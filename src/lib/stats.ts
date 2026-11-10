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
  wibDateKey,
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
type StatsService = {
  _id: unknown;
  slug: string;
  name: string;
  steps?: (Partial<Pick<StepTemplate, "key" | "name">> & Pick<StepTemplate, "slaHours">)[];
};

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
    /** Porsi dokumen yang terbit ± 1 hari kerja setelah berkas lengkap (Permendagri 19/2018). */
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

/** Rentang tren bottleneck: 12 bulan terakhir (filter 3/6/12 bulan di rapor memotong dari sini). */
export const BOTTLENECK_MONTHS = 12;

/** "2026-11" untuk bulan berjalan & `count - 1` bulan sebelumnya (WIB), terlama dulu. */
function monthKeys(now: DateLike, count: number): string[] {
  const [year, month] = wibDateKey(now).split("-").map(Number);
  const current = year * 12 + (month - 1);
  return Array.from({ length: count }, (_, i) => {
    const index = current - (count - 1 - i);
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
  });
}

/**
 * Tren bottleneck bulanan: per layanan & tahap, berapa tahap yang SELESAI di bulan itu dan berapa
 * yang melewati tenggatnya. Bulan dihitung dari waktu tahap selesai (WIB). Urutan tahap mengikuti
 * templat layanan; tahap lama yang sudah tidak ada di templat ikut di akhir.
 */
function monthlyBottlenecks(apps: StatsApp[], services: StatsService[], now: DateLike) {
  const months = monthKeys(now, BOTTLENECK_MONTHS);
  const column = new Map(months.map((m, i) => [m, i]));
  return {
    months,
    services: services.map((service) => {
      const rows = new Map<
        string,
        { key: string; name: string; cells: { completed: number; late: number }[] }
      >();
      const row = (key: string, name: string) => {
        if (!rows.has(key)) {
          rows.set(key, { key, name, cells: months.map(() => ({ completed: 0, late: 0 })) });
        }
        return rows.get(key)!;
      };
      for (const step of service.steps ?? []) if (step.key) row(step.key, step.name ?? step.key);
      for (const app of apps) {
        if (String(app.serviceId) !== String(service._id)) continue;
        for (const step of app.steps) {
          if (!step.completedAt) continue;
          const i = column.get(wibDateKey(step.completedAt).slice(0, 7));
          if (i === undefined) continue;
          const cell = row(step.key, step.name).cells[i];
          cell.completed += 1;
          if (finishedLate(step)) cell.late += 1;
        }
      }
      return { slug: service.slug, name: service.name, steps: [...rows.values()] };
    }),
  };
}

export type Bottlenecks = ReturnType<typeof monthlyBottlenecks>;

/** Pilihan periode di rapor (bulan terakhir). */
export const BOTTLENECK_PERIODS = [3, 6, 12] as const;

/** Potong tren sesuai filter rapor: layanan (slug; null = semua) & `months` bulan terakhir. */
export function filterBottlenecks(data: Bottlenecks, service: string | null, months: number): Bottlenecks {
  const from = Math.max(0, data.months.length - months);
  return {
    months: data.months.slice(from),
    services: data.services
      .filter((s) => !service || s.slug === service)
      .map((s) => ({ ...s, steps: s.steps.map((step) => ({ ...step, cells: step.cells.slice(from) })) })),
  };
}

/**
 * CSV untuk evaluasi instansi: satu baris per bulan × layanan × tahap (RFC 4180, CRLF). Diawali
 * BOM UTF-8 agar Excel membaca huruf dengan benar; persen terlambat dibulatkan (tanpa desimal).
 */
export function bottleneckCsv(data: Bottlenecks): string {
  const cell = (value: string | number) => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [["bulan", "layanan", "tahap", "tahap_selesai", "melewati_tenggat", "persen_terlambat"]];
  for (const service of data.services) {
    for (const step of service.steps) {
      step.cells.forEach((c, i) => {
        const rate = c.completed ? String(Math.round((c.late / c.completed) * 100)) : "";
        lines.push([data.months[i], service.name, step.name, String(c.completed), String(c.late), rate]);
      });
    }
  }
  return `\uFEFF${lines.map((line) => line.map(cell).join(",")).join("\r\n")}\r\n`;
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
    bottlenecks: monthlyBottlenecks(apps, services, now),
  };
}

/**
 * Eskalasi yang belum selesai, satu baris per tahap dengan level tertingginya
 * (tahap di level 2 tidak muncul dua kali), beserta status tindak lanjut pimpinan. Khusus petugas.
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
        respondedAt: esc.response?.at ?? null,
        promisedAt: esc.response?.promisedAt ?? null,
      });
    }
  }
  // Yang belum ditanggapi pimpinan di atas, lalu level tertinggi & paling lama terlambat.
  return rows.sort(
    (a, b) =>
      Number(Boolean(a.respondedAt)) - Number(Boolean(b.respondedAt)) ||
      b.level - a.level ||
      (b.lateMs ?? 0) - (a.lateMs ?? 0),
  );
}

export type Stats = ReturnType<typeof computeStats>;
export type OpenEscalation = ReturnType<typeof openEscalations>[number];
