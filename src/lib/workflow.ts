// Mesin status permohonan. Murni (tanpa database) supaya bisa diuji dan dipakai
// ulang oleh API maupun skrip seed. Fungsi apply* mengubah objek app secara langsung
// dan mengembalikan event yang harus dicatat ke audit log.

import type { Types } from "mongoose";
import type { ActorRole, Role } from "./roles.ts";
import {
  addWorkHours,
  computeDueAt,
  type DateLike,
  type Holidays,
  pauseStep,
  resumeStep,
  WORKDAY_HOURS,
} from "./sla.ts";

export const STATUS = {
  /** Daftar online untuk layanan wajib hadir (mis. KTP-el): tenggat belum berjalan sampai warga datang. */
  MENUNGGU_KEDATANGAN: "menunggu_kedatangan",
  DIAJUKAN: "diajukan",
  DIPROSES: "diproses",
  SIAP_DIAMBIL: "siap_diambil",
  SELESAI: "selesai",
  PERLU_PERBAIKAN: "perlu_perbaikan",
  DITOLAK: "ditolak",
} as const;
export type Status = (typeof STATUS)[keyof typeof STATUS];

export const STATUS_LABELS: Record<Status, string> = {
  menunggu_kedatangan: "Menunggu Kedatangan",
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
  arrive: "Warga hadir di loket, verifikasi dimulai",
  complete: "Tahap diselesaikan",
  request_fix: "Diminta perbaikan",
  resume: "Berkas dilengkapi, proses dilanjutkan",
  reject: "Permohonan ditolak",
  escalated: "Eskalasi otomatis",
  expired: "Pendaftaran kedaluwarsa (warga tidak datang)",
  fix_expired: "Dibatalkan otomatis (perbaikan berkas tidak dilengkapi)",
  follow_up: "Pimpinan menindaklanjuti eskalasi",
  rated: "Warga memberi rating",
};

/** Konfirmasi untuk petugas setelah aksi (antrean & panel detail, dari ?selesai=&aksi=). */
export const ACTION_DONE: Record<string, string> = {
  arrive: "kedatangan warga dicatat, hitung mundur verifikasi dimulai",
  complete: "tahap diselesaikan dan diteruskan ke tahap berikutnya",
  request_fix: "permintaan perbaikan dikirim ke warga",
  resume: "berkas lengkap, proses dilanjutkan",
  reject: "permohonan ditolak; alasan sudah tampil di halaman lacak warga",
};

/** Status yang tahapnya sedang berjalan (hitung mundur aktif). */
export const RUNNING_STATUSES: readonly Status[] = [STATUS.DIAJUKAN, STATUS.DIPROSES, STATUS.SIAP_DIAMBIL];
/** Menunggu warga (datang pertama kali atau melengkapi berkas): tanpa hitung mundur instansi. */
export const WAITING_CITIZEN_STATUSES: readonly Status[] = [
  STATUS.MENUNGGU_KEDATANGAN,
  STATUS.PERLU_PERBAIKAN,
];
/** Status yang belum final (termasuk yang dijeda / belum dimulai). */
export const OPEN_STATUSES: readonly Status[] = [...RUNNING_STATUSES, ...WAITING_CITIZEN_STATUSES];

export const ACTIONS = ["arrive", "complete", "request_fix", "resume", "reject"] as const;
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
  /** Tindak lanjut pimpinan; null = belum ditanggapi. */
  response?: EscalationResponse | null;
}

export interface EscalationResponse {
  /** Tanggapan untuk warga: tampil di halaman lacak (tanpa nama pimpinan). */
  note: string;
  /** Arahan untuk petugas pemilik tahap; hanya terlihat petugas. */
  instruction: string | null;
  byId: Types.ObjectId | string | null;
  byName: string;
  at: Date;
  /** Janji selesai dari pimpinan. Tenggat SLA tahap tidak berubah: keterlambatan tetap tercatat. */
  promisedAt: Date | null;
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
  /** HMAC NIK untuk pencarian (lib/pii.ts). NIK asli tidak disimpan. */
  nikHash?: string | null;
  /** NIK terenkripsi AES-256-GCM, untuk kebutuhan resmi (decryptNik). */
  nikEnc?: string | null;
  /** Kode wilayah + 4 digit terakhir, untuk tampilan petugas. */
  nikMasked?: string | null;
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
  /**
   * Wajib hadir di loket (mis. KTP-el: perekaman biometrik). Pengajuan online menjadi pendaftaran
   * awal berstatus "menunggu_kedatangan"; tenggat tahap pertama baru berjalan saat warga datang.
   */
  requiresVisit?: boolean;
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

/**
 * Objek permohonan baru; tahapan disalin dari template layanan (snapshot).
 * `awaitVisit`: tahap pertama belum dimulai (status menunggu_kedatangan, tanpa tenggat).
 */
export function buildApplication<R extends string | null>({
  service,
  applicant,
  channel,
  resi,
  now,
  holidays,
  requirementsChecked = [],
  awaitVisit = false,
}: {
  service: Pick<ServiceData, "_id" | "name" | "slug" | "steps"> & { requirements?: string[] };
  applicant: Applicant;
  channel: Channel;
  resi: R;
  now: Date;
  holidays?: Holidays;
  requirementsChecked?: string[];
  awaitVisit?: boolean;
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
  if (!awaitVisit) startStep(steps[0], now, holidays);
  return {
    resi,
    serviceId: service._id,
    serviceName: service.name,
    serviceSlug: service.slug,
    applicant,
    channel,
    status: awaitVisit ? STATUS.MENUNGGU_KEDATANGAN : STATUS.DIAJUKAN,
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
 * Pengecualian: berkas yang menunggu warga (datang / perbaikan) ditangani petugas loket.
 */
export function canActOn(app: Pick<ApplicationData, "status" | "currentStep" | "steps">, role: ActorRole) {
  const step = app.steps[app.currentStep];
  if (!step) return false;
  if (WAITING_CITIZEN_STATUSES.includes(app.status) && role === "petugas_loket") return true;
  return step.role === role;
}

function resolveEscalations(app: Pick<WorkflowApp, "escalations">, stepKey: string, now: Date) {
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
    case "arrive": {
      // Warga datang membawa dokumen asli: tahap pertama (verifikasi) mulai dan tenggatnya berjalan.
      if (app.status !== STATUS.MENUNGGU_KEDATANGAN) {
        throw new WorkflowError("invalid_state", "Permohonan ini tidak sedang menunggu kedatangan warga.");
      }
      startStep(step, now, holidays);
      if (cleanInternal) step.internalNote = cleanInternal;
      app.status = statusForStep(app.currentStep, app.steps.length);
      app.currentDueAt = step.dueAt;
      break;
    }

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

// --- Tindak lanjut eskalasi (pimpinan) -----------------------------------------------

/** Pilihan janji selesai saat menindaklanjuti, dalam jam kerja: setengah hari, 1 dan 2 hari kerja. */
export const FOLLOW_UP_PROMISE_HOURS = [4, 8, 16] as const;

/** Eskalasi tahap berjalan yang belum ditanggapi pimpinan. */
export function awaitingFollowUp(
  app: Pick<ApplicationData, "status" | "currentStep" | "steps" | "escalations">,
): Escalation[] {
  if (!OPEN_STATUSES.includes(app.status)) return [];
  const key = app.steps[app.currentStep]?.key;
  return (app.escalations ?? []).filter((e) => e.stepKey === key && !e.resolvedAt && !e.response);
}

/**
 * Pimpinan menanggapi eskalasi tahap berjalan: tanggapan untuk warga (wajib), arahan untuk
 * petugas, dan janji selesai (opsional). Tahapnya tetap diselesaikan peran pemiliknya (canActOn)
 * dan tenggat SLA tidak diubah, jadi keterlambatan tetap masuk rapor. Eskalasi level berikutnya
 * (naik ke Kepala Bidang) perlu ditanggapi lagi.
 */
export function applyFollowUp(
  app: WorkflowApp,
  {
    actor,
    publicNote,
    internalNote,
    promiseHours,
    now,
    holidays,
  }: {
    actor: Actor;
    publicNote?: string;
    internalNote?: string;
    promiseHours?: number;
    now: Date;
    holidays?: Holidays;
  },
): AuditEntry {
  if (actor.role !== "pimpinan") {
    throw new WorkflowError("forbidden", "Eskalasi hanya bisa ditindaklanjuti pimpinan.");
  }
  const open = awaitingFollowUp(app);
  if (!open.length) {
    throw new WorkflowError("invalid_state", "Tidak ada eskalasi yang menunggu tindak lanjut.");
  }
  const note = publicNote?.trim() || null;
  requireNote(note, "Tulis tanggapan untuk warga.");
  const promisedAt = promiseHours ? addWorkHours(now, promiseHours, holidays) : null;
  for (const esc of open) {
    esc.response = {
      note,
      instruction: internalNote?.trim() || null,
      byId: actor.id,
      byName: actor.name,
      at: now,
      promisedAt,
    };
  }
  return {
    action: "follow_up",
    payload: {
      stepKey: open[0].stepKey,
      levels: open.map((e) => e.level),
      publicNote: note,
      ...(promisedAt && { promisedAt }),
    },
  };
}

/** Tindak lanjut terbaru untuk satu tahap (level tertinggi yang sudah ditanggapi), atau null. */
export function followUpFor(escalations: Escalation[] | undefined, stepKey: string) {
  const latest = (escalations ?? []).reduce<Escalation | null>(
    (best, e) => (e.stepKey === stepKey && e.response && e.level > (best?.level ?? 0) ? e : best),
    null,
  );
  return latest?.response ? { target: latest.target, ...latest.response } : null;
}

// --- Batas kedatangan (layanan wajib hadir) ----------------------------------------

/** Pendaftaran online layanan wajib hadir berlaku 10 hari kerja; lewat itu dibatalkan otomatis. */
const ARRIVAL_WINDOW_WORK_HOURS = 10 * WORKDAY_HOURS;

/** Batas warga datang ke loket untuk pendaftaran yang dibuat pada `createdAt`. */
export function arrivalDeadline(createdAt: DateLike, holidays?: Holidays): Date {
  return addWorkHours(createdAt, ARRIVAL_WINDOW_WORK_HOURS, holidays);
}

export const EXPIRED_REASON =
  "Pendaftaran kedaluwarsa karena tidak datang ke loket dalam 10 hari kerja. Silakan daftar ulang bila masih memerlukan layanan ini.";

/**
 * Batalkan pendaftaran yang lewat batas kedatangan (status final "ditolak" dengan alasan yang
 * terlihat warga), supaya NIK-nya tidak terkunci oleh cek permohonan ganda selamanya.
 * null = belum waktunya / bukan pendaftaran yang menunggu.
 */
export function expireArrival(
  app: Pick<
    ApplicationData,
    "status" | "createdAt" | "currentStep" | "steps" | "currentDueAt" | "rejectionReason" | "completedAt"
  >,
  now: DateLike,
  holidays?: Holidays,
): AuditEntry | null {
  if (app.status !== STATUS.MENUNGGU_KEDATANGAN) return null;
  const deadline = arrivalDeadline(app.createdAt, holidays);
  if (new Date(now) < deadline) return null;
  app.status = STATUS.DITOLAK;
  app.rejectionReason = EXPIRED_REASON;
  app.steps[app.currentStep].publicNote = EXPIRED_REASON;
  app.currentDueAt = null;
  app.completedAt = deadline;
  return { action: "expired", payload: { from: STATUS.MENUNGGU_KEDATANGAN, to: STATUS.DITOLAK, deadline } };
}

// --- Batas perbaikan berkas -------------------------------------------------------

/** Berkas yang diminta perbaikan wajib dilengkapi dalam 10 hari kerja, sama dengan batas kedatangan. */
const FIX_WINDOW_WORK_HOURS = ARRIVAL_WINDOW_WORK_HOURS;

/** Batas warga melengkapi berkas yang diminta perbaikan pada `pausedAt`. */
export function fixDeadline(pausedAt: DateLike, holidays?: Holidays): Date {
  return addWorkHours(pausedAt, FIX_WINDOW_WORK_HOURS, holidays);
}

export const FIX_EXPIRED_REASON =
  "Permohonan dibatalkan karena berkas tidak dilengkapi dalam 10 hari kerja sejak diminta perbaikan. Silakan ajukan ulang bila masih memerlukan layanan ini.";

/**
 * Batalkan permohonan yang berkasnya tidak dilengkapi sampai batas (status final "ditolak"),
 * supaya tidak menggantung di antrean dan NIK-nya tidak terkunci cek permohonan ganda.
 * Jeda ditutup di batas waktu, eskalasi tahapnya dianggap selesai. null = belum waktunya.
 */
export function expireFix(
  app: Pick<
    ApplicationData,
    "status" | "currentStep" | "steps" | "escalations" | "currentDueAt" | "rejectionReason" | "completedAt"
  >,
  now: DateLike,
  holidays?: Holidays,
): AuditEntry | null {
  const step = app.steps[app.currentStep];
  if (app.status !== STATUS.PERLU_PERBAIKAN || !step?.pausedAt) return null;
  const deadline = fixDeadline(step.pausedAt, holidays);
  if (new Date(now) < deadline) return null;
  resumeStep(step, deadline, holidays);
  step.publicNote = FIX_EXPIRED_REASON;
  resolveEscalations(app, step.key, deadline);
  app.status = STATUS.DITOLAK;
  app.rejectionReason = FIX_EXPIRED_REASON;
  app.currentDueAt = null;
  app.completedAt = deadline;
  return {
    action: "fix_expired",
    payload: { stepKey: step.key, from: STATUS.PERLU_PERBAIKAN, to: STATUS.DITOLAK, deadline },
  };
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
