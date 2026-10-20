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
  /** Hari kerja. null = tanpa tenggat (mis. menunggu warga mengambil dokumen). */
  slaDays: number | null;
}

export interface Step extends StepTemplate {
  startedAt: Date | null;
  dueAt: Date | null;
  completedAt: Date | null;
  pausedAt: Date | null;
  pausedMs: number;
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
  step.dueAt = computeDueAt(now, step.slaDays, holidays);
  step.pausedMs = 0;
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
  service: Pick<ServiceData, "_id" | "name" | "slug" | "steps">;
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
    slaDays: s.slaDays ?? null,
    startedAt: null,
    dueAt: null,
    completedAt: null,
    pausedAt: null,
    pausedMs: 0,
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

/** Peran yang boleh menindak tahap saat ini. Pimpinan & admin selalu boleh. */
export function canActOn(app: Pick<ApplicationData, "status" | "currentStep" | "steps">, role: ActorRole) {
  if (role === "admin" || role === "pimpinan") return true;
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
  }: {
    action: Action;
    actor: Actor;
    publicNote?: string;
    internalNote?: string;
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
      resumeStep(step, now);
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
      if (step.pausedAt) resumeStep(step, now);
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
