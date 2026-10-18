// Eskalasi dihitung saat data dibaca (tanpa cron, yang terbatas di Vercel gratis),
// lalu ditulis secara idempoten: pembacaan berulang/paralel tidak membuat duplikat.

import Application from "../models/Application.js";
import Event from "../models/Event.js";
import { addWorkdays } from "./sla.js";
import { RUNNING_STATUSES } from "./workflow.js";

// Ambang dalam hari kerja, sama seperti SLA: tenggat Jumat yang dicek Senin baru
// terlambat 1 hari kerja, bukan 3 hari, jadi tidak langsung naik ke Kabid.
export const ESCALATION_LEVELS = [
  { level: 1, afterWorkdays: 0, target: "Kepala Seksi" },
  { level: 2, afterWorkdays: 3, target: "Kepala Bidang" },
];

/** Saat sebuah level eskalasi mulai berlaku untuk tenggat tertentu. */
export function escalationThreshold(dueAt, afterWorkdays, holidays) {
  return afterWorkdays ? addWorkdays(dueAt, afterWorkdays, holidays) : new Date(dueAt);
}

/** Eskalasi yang seharusnya ada untuk tahap berjalan tetapi belum tercatat. Murni. */
export function pendingEscalations(app, now, holidays) {
  if (!RUNNING_STATUSES.includes(app.status)) return [];
  const step = app.steps[app.currentStep];
  if (!step?.dueAt || step.completedAt || step.pausedAt) return [];

  const existing = app.escalations ?? [];
  return ESCALATION_LEVELS.filter(
    ({ level, afterWorkdays }) =>
      new Date(now) > escalationThreshold(step.dueAt, afterWorkdays, holidays) &&
      !existing.some((e) => e.stepKey === step.key && e.level === level),
  ).map(({ level, target }) => ({
    stepKey: step.key,
    level,
    target,
    note: `Tahap "${step.name}" melewati tenggat, diteruskan ke ${target}.`,
    createdAt: new Date(now),
    resolvedAt: null,
  }));
}

/**
 * Tulis eskalasi yang belum ada untuk satu permohonan. `app` harus objek lean:
 * array-nya ikut diperbarui di memori, dan pada dokumen Mongoose itu akan memicu
 * $push ganda saat save(). Filter $elemMatch membuat push hanya terjadi sekali per
 * (tahap, level), walau ada beberapa request bersamaan.
 */
export async function syncEscalations(app, now, holidays) {
  const created = [];
  for (const esc of pendingEscalations(app, now, holidays)) {
    const result = await Application.updateOne(
      { _id: app._id, escalations: { $not: { $elemMatch: { stepKey: esc.stepKey, level: esc.level } } } },
      { $push: { escalations: esc } },
    );
    if (result.modifiedCount === 1) {
      await Event.create({
        applicationId: app._id,
        action: "escalated",
        actorName: "Sistem",
        actorRole: "sistem",
        payload: { stepKey: esc.stepKey, level: esc.level, target: esc.target },
        at: esc.createdAt,
      });
      created.push(esc);
    }
    if (!app.escalations.some((e) => e.stepKey === esc.stepKey && e.level === esc.level)) {
      app.escalations.push(esc);
    }
  }
  return created;
}

/** Sinkronkan semua permohonan yang tahap berjalannya sudah lewat tenggat. */
export async function syncOverdue(now, holidays) {
  const overdue = await Application.find({
    status: { $in: RUNNING_STATUSES },
    currentDueAt: { $lt: now },
  })
    .select("status currentStep steps escalations")
    .lean();
  let created = 0;
  for (const app of overdue) created += (await syncEscalations(app, now, holidays)).length;
  return created;
}
