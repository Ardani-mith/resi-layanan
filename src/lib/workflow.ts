// Mesin status permohonan. Murni (tanpa database) supaya bisa diuji dan dipakai
// ulang oleh API maupun skrip seed. Fungsi apply* mengubah objek app secara langsung
// dan mengembalikan event yang harus dicatat ke audit log.

import type { Types } from "mongoose";
import type { ActorRole, Role } from "./roles.ts";
import { computeDueAt, type Holidays, pauseStep, resumeStep } from "./sla.ts";

export const STATUS = {
  DIAJUKAN: "diajukan",
  DIPROSES: "diproses",
  SIAP_DIAMBIL: "siap_diambil",
  SELESAI: "selesai",
  PERLU_PERBAIKAN: "perlu_perbaikan",
  DITOLAK: "ditolak",
} as const;
export type Status = (typeof STATUS)[keyof typeof STATUS];

export const STATUS_LABELS: Record<Status, string> = {
  diajukan: "Diajukan",
  diproses: "Diproses",
  siap_diambil: "Siap Diambil",
  selesai: "Selesai",
  perlu_perbaikan: "Perlu Perbaikan",
  ditolak: "Ditolak",
};

/** Label aksi di audit log. */
export const EVENT_LABELS: Record<string, string> = {
  created: "Permohonan dibuat",
  complete: "Tahap diselesaikan",
  request_fix: "Diminta perbaikan",
  resume: "Berkas dilengkapi, proses dilanjutkan",
  reject: "Permohonan ditolak",
  escalated: "Eskalasi otomatis",
  rated: "Warga memberi rating",
};

/** Konfirmasi untuk petugas setelah aksi (antrean & panel detail, dari ?selesai=&aksi=). */
export const ACTION_DONE: Record<string, string> = {
  complete: "tahap diselesaikan dan diteruskan ke tahap berikutnya",
  request_fix: "permintaan perbaikan dikirim ke warga",
  resume: "berkas lengkap, proses dilanjutkan",
  reject: "permohonan ditolak; alasan sudah tampil di halaman lacak warga",
};

/** Status yang tahapnya sedang berjalan (hitung mundur aktif). */
export const RUNNING_STATUSES: readonly Status[] = [STATUS.DIAJUKAN, STATUS.DIPROSES, STATUS.SIAP_DIAMBIL];
/** Status yang belum final (termasuk yang dijeda). */
export const OPEN_STATUSES: readonly Status[] = [...RUNNING_STATUSES, STATUS.PERLU_PERBAIKAN];

export const ACTIONS = ["complete", "request_fix", "resume", "reject"] as const;
export type Action = (typeof ACTIONS)[number];

// --- Bentuk data (sama dengan skema di models.ts) ----------------------------------

export type Channel = "online" | "loket";

/** Template tahap di layanan; disalin ke permohonan saat dibuat. */
export interface StepTemplate {
  key: string;
  name: string;
  role: Role;
  /** Jam kerja (1 hari kerja = 8 jam). null = tanpa tenggat (mis. menunggu warga mengambil dokumen). */
  slaHours: number | null;
  /** Syarat selesai: semua wajib dicentang petugas sebelum tahap bisa diselesaikan. */
  checklist?: string[];
  /** Persyaratan layanan ikut dicek di tahap ini (mis. verifikasi berkas asli). */
  checkRequirements?: boolean;
  /** Label bukti wajib diisi saat selesai, mis. "Nomor seri blangko"; null = tanpa bukti. */
  evidenceLabel?: string | null;
}

export interface Step extends Omit<StepTemplate, "checklist" | "checkRequirements"> {
  /** Syarat selesai tahap ini (persyaratan layanan sudah digabung saat permohonan dibuat). */
  checklist: string[];
  /** Yang dicentang petugas saat menyelesaikan (= checklist) dan bukti yang diisi. */
  checked: string[];
  evidence: string | null;
  startedAt: Date | null;
  dueAt: Date | null;
  completedAt: Date | null;
  pausedAt: Date | null;
  pausedMs: number;
  /** Bagian jeda yang jatuh di jam kerja (untuk lama kerja efektif dalam jam kerja). */
  pausedWorkMs: number;
  handledBy: Types.ObjectId | string | null;
  handledByName: string | null;
  publicNote: string | null;
  internalNote: string | null;
}

export interface Escalation {
  stepKey: string;
  level: number;
  target: string;
  note: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

/** Isi KTP-el yang diajukan warga (hanya untuk layanan perekaman KTP-el). */
export interface KtpDetails {
  birthPlace: string;
  /** "DD-MM-YYYY", dibaca dari NIK. */
  birthDate: string;
  /** Dibaca dari NIK. */
  gender: "LAKI-LAKI" | "PEREMPUAN";
  bloodType: string;
  address: string;
  rtRw: string;
  village: string;
  district: string;
  religion: string;
  marital: string;
  job: string;
}

export interface Applicant {
  name: string;
  phone: string;
  email: string | null;
  nik?: string | null;
  ktp?: KtpDetails | null;
}

export interface Rating {
  score: number;
  comment: string | null;
  createdAt: Date;
}

export interface ServiceData {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  output: string;
  requirements: string[];
  steps: StepTemplate[];
  isActive: boolean;
  order: number;
}

export interface ApplicationData {
  _id?: Types.ObjectId;
  resi: string;
  serviceId: Types.ObjectId;
  serviceName: string;
  serviceSlug: string;
  applicant: Applicant;
  channel: Channel;
  status: Status;
  currentStep: number;
  /** Salinan dueAt tahap berjalan (null saat dijeda/final) agar antrean cukup satu query berindeks. */
  currentDueAt: Date | null;
  steps: Step[];
  escalations: Escalation[];
  requirementsChecked: string[];
  rejectionReason: string | null;
  completedAt: Date | null;
  rating: Rating | null;
  verifyLock?: { fails: number; until: Date | null };
  createdAt: Date;
  updatedAt?: Date;
}

export interface Actor {
  id: string | null;
  name: string;
  role: ActorRole;
}

export interface AuditEntry {
  action: string;
  payload: Record<string, unknown>;
}

/** Error yang aman ditampilkan ke pengguna; route() mengubahnya menjadi respons `status`. */
export class AppError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export class WorkflowError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Status turunan dari posisi tahap: tahap pertama = diajukan (verifikasi berkas),
 * tahap terakhir = siap_diambil (penyerahan), di antaranya = diproses.
 */
export function statusForStep(index: number, total: number): Status {
  if (index >= total) return STATUS.SELESAI;
  if (index === 0) return STATUS.DIAJUKAN;
  if (index === total - 1) return STATUS.SIAP_DIAMBIL;
  return STATUS.DIPROSES;
}

function startStep(step: Step, now: Date, holidays?: Holidays) {
  step.startedAt = now;
  step.dueAt = computeDueAt(now, step.slaHours, holidays);
  step.pausedMs = 0;
  step.pausedWorkMs = 0;
  step.pausedAt = null;
}

/** Objek permohonan baru; tahapan disalin dari template layanan (snapshot). */
export function buildApplication<R extends string | null>({
  service,
  applicant,
  channel,
  resi,
  now,
  holidays,
  requirementsChecked = [],
}: {
  service: Pick<ServiceData, "_id" | "name" | "slug" | "steps"> & { requirements?: string[] };
  applicant: Applicant;
  channel: Channel;
  resi: R;
  now: Date;
  holidays?: Holidays;
  requirementsChecked?: string[];
}): Omit<ApplicationData, "resi"> & { resi: R } {
  const steps: Step[] = service.steps.map((s) => ({
    key: s.key,
    name: s.name,
    role: s.role,
    slaHours: s.slaHours ?? null,
    checklist: [
      ...(s.checkRequirements ? (service.requirements ?? []).map((r) => `Berkas asli diperiksa: ${r}`) : []),
      ...(s.checklist ?? []),
    ],
    evidenceLabel: s.evidenceLabel || null,
    checked: [],
    evidence: null,
    startedAt: null,
    dueAt: null,
    completedAt: null,
    pausedAt: null,
    pausedMs: 0,
    pausedWorkMs: 0,
    handledBy: null,
    handledByName: null,
    publicNote: null,
    internalNote: null,
  }));
  startStep(steps[0], now, holidays);
  return {
    resi,
    serviceId: service._id,
    serviceName: service.name,
    serviceSlug: service.slug,
    applicant,
    channel,
    status: STATUS.DIAJUKAN,
    currentStep: 0,
    currentDueAt: steps[0].dueAt,
    steps,
    escalations: [],
    requirementsChecked,
    rejectionReason: null,
    completedAt: null,
    rating: null,
    createdAt: now,
  };
}

type WorkflowApp = Pick<
  ApplicationData,
  "status" | "currentStep" | "currentDueAt" | "steps" | "escalations" | "rejectionReason" | "completedAt"
>;

/**
 * Peran yang boleh menindak tahap saat ini: HANYA peran pemilik tahap (pemisahan tugas).
 * Pimpinan & admin tidak bisa menyelesaikan tahap peran lain, termasuk yang terlambat: mereka
 * memantau lewat eskalasi, supaya jelas siapa yang mengerjakan apa di timeline & audit log.
 * Pengecualian: berkas yang menunggu perbaikan ditangani petugas loket.
 */
export function canActOn(app: Pick<ApplicationData, "status" | "currentStep" | "steps">, role: ActorRole) {
  const step = app.steps[app.currentStep];
  if (!step) return false;
  if (app.status === STATUS.PERLU_PERBAIKAN && role === "petugas_loket") return true;
  return step.role === role;
}

function resolveEscalations(app: WorkflowApp, stepKey: string, now: Date) {
  for (const esc of app.escalations ?? []) {
    if (esc.stepKey === stepKey && !esc.resolvedAt) esc.resolvedAt = now;
  }
}

function requireNote(note: string | null, message: string): asserts note is string {
  if (!note || !note.trim()) throw new WorkflowError("note_required", message);
}

/**
 * Terapkan aksi petugas. Mengembalikan { action, payload } untuk audit log.
 * actor: { id, name, role } (warga: role "warga", id null).
 */
export function applyAction(
  app: WorkflowApp,
  {
    action,
    actor,
    publicNote,
    internalNote,
    now,
    holidays,
    checked = [],
    evidence,
  }: {
    action: Action;
    actor: Actor;
    publicNote?: string;
    internalNote?: string;
    /** Syarat selesai yang dicentang (aksi "complete"). */
    checked?: string[];
    /** Bukti wajib, mis. nomor seri blangko (aksi "complete"). */
    evidence?: string;
    now: Date;
    holidays?: Holidays;
  },
): AuditEntry {
  const step = app.steps[app.currentStep];
  const payload: Record<string, unknown> = { stepKey: step?.key, from: app.status };
  const cleanPublic = publicNote?.trim() || null;
  const cleanInternal = internalNote?.trim() || null;

  switch (action) {
    case "complete": {
      if (!RUNNING_STATUSES.includes(app.status)) {
        throw new WorkflowError("invalid_state", "Permohonan ini tidak sedang berjalan.");
      }
      // Tahap hanya bisa diselesaikan dengan dasar yang tercatat: semua syarat dicentang + bukti.
      const missing = (step.checklist ?? []).filter((item) => !checked.includes(item));
      const cleanEvidence = evidence?.trim() || null;
      if (missing.length || (step.evidenceLabel && !cleanEvidence)) {
        throw new AppError(422, "Lengkapi syarat selesai tahap ini.", {
          ...(missing.length && { checked: `Belum dicentang: ${missing.join("; ")}.` }),
          ...(step.evidenceLabel && !cleanEvidence && { evidence: `${step.evidenceLabel} wajib diisi.` }),
        });
      }
      step.checked = [...(step.checklist ?? [])];
      step.evidence = cleanEvidence;
      if (step.checked.length) payload.checked = step.checked;
      if (cleanEvidence) payload.evidence = { label: step.evidenceLabel, value: cleanEvidence };
      step.completedAt = now;
      step.handledBy = actor.id ?? null;
      step.handledByName = actor.name ?? null;
      if (cleanPublic) step.publicNote = cleanPublic;
      if (cleanInternal) step.internalNote = cleanInternal;
      resolveEscalations(app, step.key, now);

      const nextIndex = app.currentStep + 1;
      app.status = statusForStep(nextIndex, app.steps.length);
      if (nextIndex < app.steps.length) {
        app.currentStep = nextIndex;
        startStep(app.steps[nextIndex], now, holidays);
        app.currentDueAt = app.steps[nextIndex].dueAt;
      } else {
        app.currentDueAt = null;
        app.completedAt = now;
      }
      break;
    }

    case "request_fix": {
      if (!RUNNING_STATUSES.includes(app.status)) {
        throw new WorkflowError("invalid_state", "Permohonan ini tidak sedang berjalan.");
      }
      requireNote(cleanPublic, "Jelaskan kepada warga apa yang perlu diperbaiki.");
      pauseStep(step, now);
      step.publicNote = cleanPublic;
      if (cleanInternal) step.internalNote = cleanInternal;
      app.status = STATUS.PERLU_PERBAIKAN;
      app.currentDueAt = null;
      break;
    }

    case "resume": {
      if (app.status !== STATUS.PERLU_PERBAIKAN) {
        throw new WorkflowError("invalid_state", "Permohonan ini tidak sedang menunggu perbaikan.");
      }
      resumeStep(step, now, holidays);
      if (cleanInternal) step.internalNote = cleanInternal;
      app.status = statusForStep(app.currentStep, app.steps.length);
      app.currentDueAt = step.dueAt;
      break;
    }

    case "reject": {
      if (!OPEN_STATUSES.includes(app.status)) {
        throw new WorkflowError("invalid_state", "Permohonan ini sudah final.");
      }
      requireNote(cleanPublic, "Alasan penolakan wajib diisi dan akan dibaca warga.");
      if (step.pausedAt) resumeStep(step, now, holidays);
      step.handledBy = actor.id ?? null;
      step.handledByName = actor.name ?? null;
      step.publicNote = cleanPublic;
      if (cleanInternal) step.internalNote = cleanInternal;
      resolveEscalations(app, step.key, now);
      app.status = STATUS.DITOLAK;
      app.rejectionReason = cleanPublic;
      app.currentDueAt = null;
      app.completedAt = now;
      break;
    }

    default:
      throw new WorkflowError("unknown_action", "Aksi tidak dikenal.");
  }

  payload.to = app.status;
  if (cleanPublic) payload.publicNote = cleanPublic;
  return { action, payload };
}

/** Rating hanya untuk permohonan selesai, sekali saja. */
export function applyRating(
  app: Pick<ApplicationData, "status" | "rating">,
  { score, comment, now }: { score: number; comment?: string; now: Date },
): AuditEntry {
  if (app.status !== STATUS.SELESAI) {
    throw new WorkflowError("invalid_state", "Rating bisa diberikan setelah permohonan selesai.");
  }
  if (app.rating?.score) {
    throw new WorkflowError("already_rated", "Permohonan ini sudah diberi rating.");
  }
  app.rating = { score, comment: comment?.trim() || null, createdAt: now };
  return { action: "rated", payload: { score } };
}
