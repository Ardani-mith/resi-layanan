// Operasi permohonan yang menyentuh database. Dipakai bersama oleh route API
// dan (nanti) server component, supaya aturan bisnis hanya ada di satu tempat.

import Application from "../models/Application.js";
import Event from "../models/Event.js";
import Service from "../models/Service.js";
import { syncEscalations } from "./escalation.js";
import { generateResi } from "./resi.js";
import { applyAction, applyRating, buildApplication, canActOn, WorkflowError } from "./workflow.js";

const DUPLICATE_KEY = 11000;

/** Permohonan lean berdasarkan resi, dengan eskalasi yang sudah disinkronkan. */
export async function loadByResi(resi, clock) {
  const app = await Application.findOne({ resi }).lean();
  if (app) await syncEscalations(app, clock.now, clock.holidays);
  return app;
}

export async function createApplication({ input, actor, clock }) {
  const service = await Service.findOne({ slug: input.serviceSlug, isActive: true }).lean();
  if (!service)
    throw new WorkflowError("unknown_service", "Layanan tidak ditemukan atau sedang tidak dibuka.");

  const allowed = new Set(service.requirements);
  const applicant = {
    name: input.applicant.name,
    phone: input.applicant.phone,
    email: input.applicant.email || null,
    nik: input.applicant.nik,
  };

  // Resi acak; kalau (sangat jarang) bentrok dengan unique index, coba lagi.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const draft = buildApplication({
      service,
      applicant,
      channel: input.channel,
      resi: generateResi(),
      now: clock.now,
      holidays: clock.holidays,
      requirementsChecked: input.requirementsChecked.filter((r) => allowed.has(r)),
    });
    try {
      const app = await Application.create(draft);
      await Event.create({
        applicationId: app._id,
        actorId: actor?.id ?? null,
        actorName: actor?.name ?? "Warga",
        actorRole: actor?.role ?? "warga",
        action: "created",
        payload: { channel: input.channel, serviceSlug: service.slug },
        at: clock.now,
      });
      return app.toObject();
    } catch (error) {
      if (error?.code !== DUPLICATE_KEY || !error?.keyPattern?.resi) throw error;
    }
  }
  throw new Error("Gagal membuat nomor resi unik setelah 5 percobaan.");
}

/**
 * Jalankan satu aksi alur kerja dan simpan. Eskalasi disinkronkan dulu agar
 * keterlambatan yang belum sempat tercatat tidak hilang saat tahap diselesaikan.
 * optimisticConcurrency pada save() menolak jika dua petugas menindak bersamaan.
 */
async function mutate(resi, clock, mutator) {
  const snapshot = await Application.findOne({ resi }).select("status currentStep steps escalations").lean();
  if (!snapshot) throw new WorkflowError("not_found", "Permohonan tidak ditemukan.");
  await syncEscalations(snapshot, clock.now, clock.holidays);

  const app = await Application.findOne({ resi });
  const event = mutator(app);
  await app.save();
  await Event.create({ applicationId: app._id, at: clock.now, ...event });
  return app.toObject();
}

export async function performAction({ resi, input, actor, clock }) {
  return mutate(resi, clock, (app) => {
    if (!canActOn(app, actor.role)) {
      throw new WorkflowError("forbidden", "Tahap ini bukan tugas peran Anda.");
    }
    const { action, payload } = applyAction(app, {
      ...input,
      actor,
      now: clock.now,
      holidays: clock.holidays,
    });
    return { action, payload, actorId: actor.id, actorName: actor.name, actorRole: actor.role };
  });
}

/** Aksi warga dari halaman lacak (sudah lolos verifikasi HP). */
export async function performCitizenAction({ resi, input, clock }) {
  const citizen = { id: null, name: "Warga", role: "warga" };
  return mutate(resi, clock, (app) => {
    const result =
      input.action === "rate"
        ? applyRating(app, { score: input.score, comment: input.comment, now: clock.now })
        : applyAction(app, { action: "resume", actor: citizen, now: clock.now, holidays: clock.holidays });
    return { ...result, actorName: citizen.name, actorRole: citizen.role };
  });
}

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

/**
 * Cek 4 digit terakhir HP dengan pembatas tebakan: 5 kali salah → dikunci 15 menit.
 * Mengembalikan "ok" | "wrong" | "locked".
 */
export async function verifyApplicant(app, last4, now) {
  if (app.verifyLock?.until && new Date(app.verifyLock.until) > now) return "locked";

  if (app.applicant.phone.slice(-4) === last4) {
    if (app.verifyLock?.fails) {
      await Application.updateOne(
        { _id: app._id },
        { $set: { "verifyLock.fails": 0, "verifyLock.until": null } },
      );
    }
    return "ok";
  }

  const fails = (app.verifyLock?.fails ?? 0) + 1;
  const update =
    fails >= MAX_FAILS
      ? { $set: { "verifyLock.fails": 0, "verifyLock.until": new Date(now.getTime() + LOCK_MS) } }
      : { $set: { "verifyLock.fails": fails } };
  await Application.updateOne({ _id: app._id }, update);
  return fails >= MAX_FAILS ? "locked" : "wrong";
}

export async function eventsFor(applicationId) {
  return Event.find({ applicationId }).sort({ at: 1, _id: 1 }).lean();
}
