// Mesin status permohonan. Murni (tanpa database) supaya bisa diuji dan dipakai
// ulang oleh API maupun skrip seed. Fungsi apply* mengubah objek app secara langsung
// dan mengembalikan event yang harus dicatat ke audit log.

import { computeDueAt, pauseStep, resumeStep } from "./sla.js";

export const STATUS = {
  DIAJUKAN: "diajukan",
  DIPROSES: "diproses",
  SIAP_DIAMBIL: "siap_diambil",
  SELESAI: "selesai",
  PERLU_PERBAIKAN: "perlu_perbaikan",
  DITOLAK: "ditolak",
};

export const STATUS_LABELS = {
  diajukan: "Diajukan",
  diproses: "Diproses",
  siap_diambil: "Siap Diambil",
  selesai: "Selesai",
  perlu_perbaikan: "Perlu Perbaikan",
  ditolak: "Ditolak",
};

/** Label aksi di audit log. */
export const EVENT_LABELS = {
  created: "Permohonan dibuat",
  complete: "Tahap diselesaikan",
  request_fix: "Diminta perbaikan",
  resume: "Berkas dilengkapi, proses dilanjutkan",
  reject: "Permohonan ditolak",
  escalated: "Eskalasi otomatis",
  rated: "Warga memberi rating",
};

/** Status yang tahapnya sedang berjalan (hitung mundur aktif). */
export const RUNNING_STATUSES = [STATUS.DIAJUKAN, STATUS.DIPROSES, STATUS.SIAP_DIAMBIL];
/** Status yang belum final (termasuk yang dijeda). */
export const OPEN_STATUSES = [...RUNNING_STATUSES, STATUS.PERLU_PERBAIKAN];

export const ACTIONS = ["complete", "request_fix", "resume", "reject"];

export class WorkflowError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Status turunan dari posisi tahap: tahap pertama = diajukan (verifikasi berkas),
 * tahap terakhir = siap_diambil (penyerahan), di antaranya = diproses.
 */
export function statusForStep(index, total) {
  if (index >= total) return STATUS.SELESAI;
  if (index === 0) return STATUS.DIAJUKAN;
  if (index === total - 1) return STATUS.SIAP_DIAMBIL;
  return STATUS.DIPROSES;
}

function startStep(step, now, holidays) {
  step.startedAt = now;
  step.dueAt = computeDueAt(now, step.slaDays, holidays);
  step.pausedMs = 0;
  step.pausedAt = null;
}

/** Objek permohonan baru; tahapan disalin dari template layanan (snapshot). */
export function buildApplication({
  service,
  applicant,
  channel,
  resi,
  now,
  holidays,
  requirementsChecked = [],
}) {
  const steps = service.steps.map((s) => ({
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

/** Peran yang boleh menindak tahap saat ini. Pimpinan & admin selalu boleh. */
export function canActOn(app, role) {
  if (role === "admin" || role === "pimpinan") return true;
  const step = app.steps[app.currentStep];
  if (!step) return false;
  if (app.status === STATUS.PERLU_PERBAIKAN && role === "petugas_loket") return true;
  return step.role === role;
}

function resolveEscalations(app, stepKey, now) {
  for (const esc of app.escalations ?? []) {
    if (esc.stepKey === stepKey && !esc.resolvedAt) esc.resolvedAt = now;
  }
}

function requireNote(note, message) {
  if (!note || !String(note).trim()) throw new WorkflowError("note_required", message);
}

/**
 * Terapkan aksi petugas. Mengembalikan { action, payload } untuk audit log.
 * actor: { id, name, role } (warga: role "warga", id null).
 */
export function applyAction(app, { action, actor, publicNote, internalNote, now, holidays }) {
  const step = app.steps[app.currentStep];
  const payload = { stepKey: step?.key, from: app.status };
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
export function applyRating(app, { score, comment, now }) {
  if (app.status !== STATUS.SELESAI) {
    throw new WorkflowError("invalid_state", "Rating bisa diberikan setelah permohonan selesai.");
  }
  if (app.rating?.score) {
    throw new WorkflowError("already_rated", "Permohonan ini sudah diberi rating.");
  }
  app.rating = { score, comment: comment?.trim() || null, createdAt: now };
  return { action: "rated", payload: { score } };
}
