// Bentuk data yang keluar ke klien. Satu tempat untuk aturan privasi:
// publik = progres + nama disamarkan; terverifikasi (4 digit HP) = + detail pemohon;
// petugas = + catatan internal, nama petugas, eskalasi, audit log. NIK tidak pernah keluar.

import { maskName, maskPhone } from "./privacy.js";
import { estimateCompletion, finishedLate, remainingMs, stepState } from "./sla.js";
import { STATUS, STATUS_LABELS } from "./workflow.js";

function stepView(app, step, index, now) {
  const isCurrent = index === app.currentStep;
  let state = stepState(step, now);
  if (app.status === STATUS.DITOLAK && isCurrent) state = "ditolak";
  else if (app.status === STATUS.DITOLAK && !step.startedAt) state = "dibatalkan";

  return {
    key: step.key,
    name: step.name,
    role: step.role,
    slaDays: step.slaDays,
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
export function publicView(app, { now, holidays }) {
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
    fixNote: app.status === STATUS.PERLU_PERBAIKAN ? app.steps[app.currentStep]?.publicNote : null,
    rejectionReason: app.rejectionReason,
    rated: Boolean(app.rating?.score),
    steps,
  };
}

/** Setelah warga membuktikan 4 digit terakhir HP. */
export function verifiedView(app, ctx) {
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
export function staffView(app, ctx, events = []) {
  const base = verifiedView(app, ctx);
  return {
    ...base,
    id: String(app._id),
    applicant: { ...base.applicant, phone: app.applicant.phone },
    steps: base.steps.map((s, i) => ({
      ...s,
      internalNote: app.steps[i].internalNote,
      handledByName: app.steps[i].handledByName,
      pausedMs: app.steps[i].pausedMs,
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
export function queueItem(app, now) {
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
