// Operasi permohonan yang menyentuh database. Dipakai bersama oleh route API
// dan server component, supaya aturan bisnis hanya ada di satu tempat.

import type { Types } from "mongoose";
import { Application, Event, type EventData, Service } from "../models.ts";
import type { Clock } from "./clock.ts";
import { syncEscalations } from "./escalation.ts";
import { KTP_MIN_AGE, ktpAgeAllowed, needsKtpData, nikInfo } from "./present.ts";
import { generateResi } from "./resi.ts";
import type { ActionInput, ApplicationInput } from "./validators.ts";
import {
  type Actor,
  AppError,
  type ApplicationData,
  applyAction,
  applyRating,
  type AuditEntry,
  buildApplication,
  canActOn,
  type KtpDetails,
  type ServiceData,
  WorkflowError,
} from "./workflow.ts";

const DUPLICATE_KEY = 11000;
type Ctx = Pick<Clock, "now" | "holidays">;

/** Permohonan lean berdasarkan resi, dengan eskalasi yang sudah disinkronkan. */
export async function loadByResi(resi: string, clock: Ctx): Promise<ApplicationData | null> {
  const app = await Application.findOne({ resi }).lean<ApplicationData>();
  if (app) await syncEscalations(app, clock.now, clock.holidays);
  return app;
}

/**
 * Isi KTP-el yang disimpan: isian warga + tanggal lahir & jenis kelamin dari NIK.
 * Menolak NIK dengan tanggal lahir tidak valid dan pemohon di bawah 17 tahun yang belum kawin.
 */
function ktpDetails(input: ApplicationInput, now: Date): KtpDetails {
  const info = nikInfo(input.applicant.nik, now);
  if (!info) {
    throw new AppError(422, "Periksa kembali isian Anda.", {
      "applicant.nik": "Digit tanggal lahir di NIK (digit 7–12) tidak valid.",
    });
  }
  const ktp = input.applicant.ktp;
  if (!ktp) {
    throw new AppError(422, "Lengkapi data KTP-el.", { "applicant.ktp": "Lengkapi data KTP-el." });
  }
  if (!ktpAgeAllowed(info.birthDate, ktp.marital, now)) {
    throw new AppError(422, "Periksa kembali isian Anda.", {
      "applicant.ktp.marital": `Menurut NIK, pemohon belum ${KTP_MIN_AGE} tahun. KTP-el bisa dibuat mulai ${KTP_MIN_AGE} tahun atau jika sudah/pernah kawin.`,
    });
  }
  return { ...ktp, birthDate: info.birthDate, gender: info.gender };
}

export async function createApplication({
  input,
  actor,
  clock,
}: {
  input: ApplicationInput;
  actor: Actor | null;
  clock: Ctx;
}): Promise<ApplicationData> {
  const service = await Service.findOne({ slug: input.serviceSlug, isActive: true }).lean<ServiceData>();
  if (!service) {
    throw new WorkflowError("unknown_service", "Layanan tidak ditemukan atau sedang tidak dibuka.");
  }

  const allowed = new Set(service.requirements);
  const applicant = {
    name: input.applicant.name,
    phone: input.applicant.phone,
    email: input.applicant.email || null,
    nik: input.applicant.nik,
    ktp: needsKtpData(service.slug) ? ktpDetails(input, clock.now) : null,
  };

  // Resi acak; kalau (sangat jarang) bentrok dengan unique index, coba lagi.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const resi = generateResi();
    const draft = buildApplication({
      service,
      applicant,
      channel: input.channel,
      resi,
      now: clock.now,
      holidays: clock.holidays,
      requirementsChecked: input.requirementsChecked.filter((r) => allowed.has(r)),
    });
    try {
      const app = await Application.create({ ...draft, resi });
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
      const mongoError = error as { code?: number; keyPattern?: Record<string, unknown> };
      if (mongoError?.code !== DUPLICATE_KEY || !mongoError.keyPattern?.resi) throw error;
    }
  }
  throw new Error("Gagal membuat nomor resi unik setelah 5 percobaan.");
}

/**
 * Jalankan satu aksi alur kerja dan simpan. Eskalasi disinkronkan dulu agar
 * keterlambatan yang belum sempat tercatat tidak hilang saat tahap diselesaikan.
 * optimisticConcurrency pada save() menolak jika dua petugas menindak bersamaan.
 */
async function mutate(
  resi: string,
  clock: Ctx,
  mutator: (
    app: ApplicationData,
  ) => AuditEntry & Partial<Pick<EventData, "actorId" | "actorName" | "actorRole">>,
): Promise<ApplicationData> {
  const snapshot = await Application.findOne({ resi })
    .select("status currentStep steps escalations")
    .lean<Pick<ApplicationData, "_id" | "status" | "currentStep" | "steps" | "escalations">>();
  if (!snapshot) throw new WorkflowError("not_found", "Permohonan tidak ditemukan.");
  await syncEscalations(snapshot, clock.now, clock.holidays);

  const app = await Application.findOne({ resi });
  if (!app) throw new WorkflowError("not_found", "Permohonan tidak ditemukan.");
  const event = mutator(app);
  await app.save();
  await Event.create({ applicationId: app._id, at: clock.now, ...event });
  return app.toObject();
}

export async function performAction({
  resi,
  input,
  actor,
  clock,
}: {
  resi: string;
  input: ActionInput;
  actor: Actor;
  clock: Ctx;
}) {
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
export async function performCitizenAction({
  resi,
  input,
  clock,
}: {
  resi: string;
  input: { action: "resubmit" } | { action: "rate"; score: number; comment?: string };
  clock: Ctx;
}) {
  const citizen: Actor = { id: null, name: "Warga", role: "warga" };
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
 */
export async function verifyApplicant(
  app: ApplicationData,
  last4: string,
  now: Date,
): Promise<"ok" | "wrong" | "locked"> {
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

export async function eventsFor(applicationId: Types.ObjectId | undefined): Promise<EventData[]> {
  return Event.find({ applicationId }).sort({ at: 1, _id: 1 }).lean<EventData[]>();
}
