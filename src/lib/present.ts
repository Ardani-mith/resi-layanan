// Bentuk data yang keluar ke klien. Satu tempat untuk aturan privasi:
// publik = progres + nama disamarkan; terverifikasi (4 digit HP) = + detail pemohon;
// petugas = + catatan internal, nama petugas, eskalasi, audit log. NIK tidak pernah keluar.

import type { EventData } from "../models.ts";
import {
  type DateLike,
  estimateCompletion,
  finishedLate,
  type Holidays,
  issuePromise,
  remainingMs,
  type StepState,
  stepState,
} from "./sla.ts";
import { type ApplicationData, STATUS, STATUS_LABELS, type Step } from "./workflow.ts";

// --- Penyamaran data pribadi --------------------------------------------------------

/** "Ardani Setiawan" → "Ar*** S***". Nama lengkap tidak pernah keluar ke tampilan publik. */
export function maskName(name: unknown): string {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "***";
  return words.map((word, i) => `${word.slice(0, i === 0 ? 2 : 1)}***`).join(" ");
}

/** "081234567890" → "0812****7890". */
export function maskPhone(phone: unknown): string {
  const digits = String(phone ?? "");
  if (digits.length < 8) return "****";
  return `${digits.slice(0, 4)}${"*".repeat(digits.length - 8)}${digits.slice(-4)}`;
}

/** Nomor HP dinormalisasi ke format 08xxxxxxxxxx. */
export function normalizePhone(input: unknown): string {
  const digits = String(input ?? "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+62")) return `0${digits.slice(3)}`;
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

/**
 * Tanggal lahir & jenis kelamin yang tersimpan di NIK: digit 7–12 = DDMMYY, dan tanggal
 * ditambah 40 untuk perempuan. null jika belum 12 digit atau tanggalnya tidak masuk akal.
 * Hanya untuk membantu warga memeriksa ketikan NIK-nya (pratinjau), bukan validasi resmi.
 */
export function nikInfo(
  nik: string,
  now: Date = new Date(),
): { birthDate: string; gender: "LAKI-LAKI" | "PEREMPUAN" } | null {
  if (!/^\d{12}/.test(nik)) return null;
  let day = Number(nik.slice(6, 8));
  const month = Number(nik.slice(8, 10));
  const yy = Number(nik.slice(10, 12));
  const female = day > 40;
  if (female) day -= 40;
  const year = (yy > now.getFullYear() % 100 ? 1900 : 2000) + yy;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (month < 1 || month > 12 || day < 1 || date.getUTCDate() !== day) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { birthDate: `${pad(day)}-${pad(month)}-${year}`, gender: female ? "PEREMPUAN" : "LAKI-LAKI" };
}

// --- Data KTP-el (layanan perekaman KTP-el) ------------------------------------------

/** Layanan yang menerbitkan KTP-el: form meminta isi kartu (alamat, agama, dst.). */
export const needsKtpData = (slug: string) => slug.includes("ktp");

export const RELIGIONS = [
  "ISLAM",
  "KRISTEN",
  "KATOLIK",
  "HINDU",
  "BUDDHA",
  "KHONGHUCU",
  "KEPERCAYAAN TERHADAP TUHAN YME",
] as const;
export const MARITAL_STATUSES = ["BELUM KAWIN", "KAWIN", "CERAI HIDUP", "CERAI MATI"] as const;
export const BLOOD_TYPES = ["A", "B", "AB", "O", "-"] as const;
export const KTP_MIN_AGE = 17;

/** Umur dalam tahun penuh pada `now`, dari tanggal "DD-MM-YYYY". */
export function ageOn(birthDate: string, now: Date = new Date()): number {
  const [day, month, year] = birthDate.split("-").map(Number);
  const age = now.getUTCFullYear() - year;
  const beforeBirthday =
    now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day);
  return beforeBirthday ? age - 1 : age;
}

/** Syarat KTP-el: minimal 17 tahun, atau sudah/pernah kawin. */
export function ktpAgeAllowed(birthDate: string, marital: string, now?: Date): boolean {
  return marital !== "BELUM KAWIN" || ageOn(birthDate, now) >= KTP_MIN_AGE;
}

/** Pemohon (yang mengajukan & bertanggung jawab atas data) minimal 17 tahun: cakap hukum. */
export const APPLICANT_MIN_AGE = 17;

export type NikCheck =
  | {
      ok: true;
      birthDate: string;
      gender: "LAKI-LAKI" | "PEREMPUAN";
      age: number;
      /** Di bawah 17 tahun untuk KTP-el: hanya boleh jika sudah/pernah kawin (dicek di isian KTP). */
      needsMarried: boolean;
    }
  | { ok: false; message: string };

/**
 * Pemeriksaan NIK pemohon tanpa database (dipakai di browser saat mengetik DAN di server):
 * format, tanggal lahir di digit 7–12, dan umur pemohon. Kode wilayah (digit 1–6) sengaja
 * TIDAK dipakai untuk menolak: NIK tidak berubah saat warga pindah, jadi domisili dibuktikan
 * dari KK, bukan dari NIK. Layanan KTP-el boleh di bawah 17 tahun jika sudah/pernah kawin
 * (dicek lagi bersama status perkawinan di form KTP).
 */
export function checkNik(nik: string, serviceSlug: string, now: Date = new Date()): NikCheck {
  if (!/^\d{16}$/.test(nik)) return { ok: false, message: "NIK harus 16 digit angka." };
  const info = nikInfo(nik, now);
  const [day, month, year] = info?.birthDate.split("-").map(Number) ?? [];
  if (!info || Date.UTC(year, month - 1, day) > now.getTime()) {
    return {
      ok: false,
      message: "Digit tanggal lahir di NIK (digit 7–12) tidak valid. Periksa kembali NIK Anda.",
    };
  }
  const age = ageOn(info.birthDate, now);
  if (age < APPLICANT_MIN_AGE && !needsKtpData(serviceSlug)) {
    return {
      ok: false,
      message: `Menurut NIK, pemohon berusia ${age} tahun. Pemohon minimal ${APPLICANT_MIN_AGE} tahun: untuk anak, ajukan oleh orang tua/wali dengan NIK orang tua/wali.`,
    };
  }
  return { ok: true, ...info, age, needsMarried: age < APPLICANT_MIN_AGE };
}

// --- Tampilan permohonan ------------------------------------------------------------

export type StepViewState = StepState | "ditolak" | "dibatalkan";

interface Ctx {
  now: DateLike;
  holidays?: Holidays;
}

function stepView(app: ApplicationData, step: Step, index: number, now: DateLike) {
  const isCurrent = index === app.currentStep;
  let state: StepViewState = stepState(step, now);
  if (app.status === STATUS.DITOLAK && isCurrent) state = "ditolak";
  else if (app.status === STATUS.DITOLAK && !step.startedAt) state = "dibatalkan";

  return {
    key: step.key,
    name: step.name,
    role: step.role,
    slaHours: step.slaHours,
    state,
    isCurrent,
    startedAt: step.startedAt,
    dueAt: step.dueAt,
    completedAt: step.completedAt,
    remainingMs: state === "ditolak" ? null : remainingMs(step, now),
    finishedLate: finishedLate(step),
    escalated: (app.escalations ?? []).some((e) => e.stepKey === step.key),
    publicNote: step.publicNote,
  };
}

/** Untuk siapa pun yang tahu nomor resi. */
export function publicView(app: ApplicationData, { now, holidays }: Ctx) {
  const steps = app.steps.map((s, i) => stepView(app, s, i, now));
  const current = steps[app.currentStep];
  return {
    resi: app.resi,
    serviceName: app.serviceName,
    serviceSlug: app.serviceSlug,
    status: app.status,
    statusLabel: STATUS_LABELS[app.status],
    applicantMasked: maskName(app.applicant.name),
    channel: app.channel,
    createdAt: app.createdAt,
    completedAt: app.completedAt,
    currentStep: app.currentStep,
    currentStepName: current?.name ?? null,
    isLate: current?.state === "terlambat",
    isEscalated: (app.escalations ?? []).some((e) => !e.resolvedAt),
    estimatedCompletion:
      app.status === STATUS.SELESAI || app.status === STATUS.DITOLAK
        ? null
        : estimateCompletion(app.steps, app.currentStep, now, holidays),
    /** Janji terbit ≤ 24 jam (1 hari kerja) setelah berkas lengkap, Permendagri 19/2018. */
    issuePromise: app.status === STATUS.DITOLAK ? null : issuePromise(app.steps, now, holidays),
    fixNote: app.status === STATUS.PERLU_PERBAIKAN ? (app.steps[app.currentStep]?.publicNote ?? null) : null,
    rejectionReason: app.rejectionReason,
    rated: Boolean(app.rating?.score),
    steps,
  };
}

/** Setelah warga membuktikan 4 digit terakhir HP. */
export function verifiedView(app: ApplicationData, ctx: Ctx) {
  return {
    ...publicView(app, ctx),
    applicant: {
      name: app.applicant.name,
      phoneMasked: maskPhone(app.applicant.phone),
      email: app.applicant.email,
    },
    requirementsChecked: app.requirementsChecked ?? [],
    rating: app.rating ?? null,
  };
}

/** Untuk petugas yang login. */
export function staffView(app: ApplicationData, ctx: Ctx, events: EventData[] = []) {
  const base = verifiedView(app, ctx);
  return {
    ...base,
    id: String(app._id),
    applicant: { ...base.applicant, phone: app.applicant.phone, ktp: app.applicant.ktp ?? null },
    steps: base.steps.map((s, i) => ({
      ...s,
      internalNote: app.steps[i].internalNote,
      handledByName: app.steps[i].handledByName,
      pausedMs: app.steps[i].pausedMs,
      // Syarat selesai & bukti hanya untuk petugas (nomor blangko dsb. tidak ditampilkan publik).
      checklist: app.steps[i].checklist ?? [],
      checked: app.steps[i].checked ?? [],
      evidenceLabel: app.steps[i].evidenceLabel ?? null,
      evidence: app.steps[i].evidence ?? null,
    })),
    escalations: app.escalations ?? [],
    events: events.map((e) => ({
      action: e.action,
      actorName: e.actorName,
      actorRole: e.actorRole,
      payload: e.payload,
      at: e.at,
    })),
  };
}

/** Baris ringkas untuk antrean petugas. */
export function queueItem(app: ApplicationData, now: DateLike) {
  const step = app.steps[app.currentStep];
  return {
    resi: app.resi,
    serviceName: app.serviceName,
    applicantName: app.applicant.name,
    channel: app.channel,
    status: app.status,
    statusLabel: STATUS_LABELS[app.status],
    stepName: step?.name ?? null,
    stepRole: step?.role ?? null,
    stepState: step ? stepState(step, now) : null,
    dueAt: step?.dueAt ?? null,
    remainingMs: step ? remainingMs(step, now) : null,
    escalationLevel: Math.max(0, ...(app.escalations ?? []).filter((e) => !e.resolvedAt).map((e) => e.level)),
    createdAt: app.createdAt,
  };
}

export type PublicView = ReturnType<typeof publicView>;
export type VerifiedView = ReturnType<typeof verifiedView>;
export type StaffView = ReturnType<typeof staffView>;
export type QueueItem = ReturnType<typeof queueItem>;
