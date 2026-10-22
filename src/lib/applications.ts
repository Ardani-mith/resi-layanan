// Operasi permohonan yang menyentuh database. Dipakai bersama oleh route API
// dan server component, supaya aturan bisnis hanya ada di satu tempat.

import { createHash, randomInt } from "node:crypto";
import mongoose, { type Types } from "mongoose";
import {
  Application,
  Event,
  type EventData,
  Service,
  Verification,
  type VerificationData,
} from "../models.ts";
import type { Clock } from "./clock.ts";
import { syncEscalations } from "./escalation.ts";
import { checkNik, KTP_MIN_AGE, ktpAgeAllowed, needsKtpData } from "./present.ts";
import { generateResi } from "./resi.ts";
import { DAY_MS } from "./sla.ts";
import type { ActionInput, ApplicationInput, RecoverInput } from "./validators.ts";
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
  OPEN_STATUSES,
  type ServiceData,
  STATUS_LABELS,
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
 * Menolak pemohon di bawah 17 tahun yang belum kawin.
 */
function ktpDetails(input: ApplicationInput, birthDate: string, gender: KtpDetails["gender"], now: Date) {
  const ktp = input.applicant.ktp;
  if (!ktp) {
    throw new AppError(422, "Lengkapi data KTP-el.", { "applicant.ktp": "Lengkapi data KTP-el." });
  }
  if (!ktpAgeAllowed(birthDate, ktp.marital, now)) {
    throw new AppError(422, "Periksa kembali isian Anda.", {
      "applicant.ktp.marital": `Menurut NIK, pemohon belum ${KTP_MIN_AGE} tahun. KTP-el bisa dibuat mulai ${KTP_MIN_AGE} tahun atau jika sudah/pernah kawin.`,
    });
  }
  return { ...ktp, birthDate, gender };
}

// --- Pengaman pengajuan ---------------------------------------------------------------

/** Pengajuan online per NIK atau nomor HP dalam 24 jam. Loket tidak dibatasi (warga hadir). */
export const DAILY_ONLINE_LIMIT = 3;
const OTP_TTL_MS = 5 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PER_HOUR = 5;

const otpHash = (code: string, phone: string, nik: string) =>
  createHash("sha256").update(`${code}:${phone}:${nik}`).digest("hex");

/**
 * Semua pemeriksaan sebelum permohonan boleh dibuat (dipanggil sebelum OTP dikirim DAN saat
 * membuat): layanan aktif, NIK (format, tanggal lahir, umur pemohon), data KTP-el, batas harian.
 */
async function prepare(input: ApplicationInput, clock: Ctx) {
  const service = await Service.findOne({ slug: input.serviceSlug, isActive: true }).lean<ServiceData>();
  if (!service) {
    throw new WorkflowError("unknown_service", "Layanan tidak ditemukan atau sedang tidak dibuka.");
  }
  const { nik, phone } = input.applicant;
  if (input.channel === "online" && !input.consent) {
    throw new AppError(422, "Centang pernyataan kebenaran data.", {
      consent: "Centang pernyataan ini untuk melanjutkan.",
    });
  }
  const check = checkNik(nik, service.slug, clock.now);
  if (!check.ok) throw new AppError(422, "Periksa kembali NIK Anda.", { "applicant.nik": check.message });

  if (input.channel === "online") {
    const recent = await Application.countDocuments({
      channel: "online",
      createdAt: { $gte: new Date(clock.now.getTime() - DAY_MS) },
      $or: [{ "applicant.nik": nik }, { "applicant.phone": phone }],
    });
    if (recent >= DAILY_ONLINE_LIMIT) {
      throw new AppError(
        429,
        `Batas ${DAILY_ONLINE_LIMIT} pengajuan online per hari untuk NIK atau nomor HP ini sudah tercapai. Coba lagi besok, atau datang langsung ke loket.`,
      );
    }
  }

  const applicant = {
    name: input.applicant.name,
    phone,
    email: input.applicant.email || null,
    nik,
    ktp: needsKtpData(service.slug) ? ktpDetails(input, check.birthDate, check.gender, clock.now) : null,
  };
  return { service, applicant };
}

/**
 * Langkah 1 pengajuan online: periksa semua isian, lalu kirim kode 6 digit ke nomor HP.
 * Mengembalikan kode juga, untuk dikirim pemanggil (atau ditampilkan di mode demo).
 */
export async function startVerification({ input, clock }: { input: ApplicationInput; clock: Ctx }) {
  const { applicant } = await prepare(input, clock);
  return issueOtp(applicant.phone, applicant.nik);
}

/** Buat kode 6 digit untuk pasangan HP + NIK (maksimal 5 kode per nomor per jam). */
async function issueOtp(phone: string, nik: string) {
  const now = new Date(); // jam nyata: masa berlaku OTP tidak ikut mode demo
  const sent = await Verification.countDocuments({
    phone,
    createdAt: { $gte: new Date(now.getTime() - 3_600_000) },
  });
  if (sent >= OTP_PER_HOUR) {
    throw new AppError(429, "Terlalu banyak permintaan kode untuk nomor ini. Coba lagi dalam 1 jam.");
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const doc = await Verification.create({
    phone,
    nik,
    codeHash: otpHash(code, phone, nik),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
  });
  return { otpId: String(doc._id), code, phone, expiresAt: doc.expiresAt };
}

/**
 * Lupa resi: NIK + nomor HP yang didaftarkan, dibuktikan dengan OTP ke nomor itu.
 * Tanpa `otp` = kirim kode SELALU (cocok atau tidak), supaya tidak bisa dipakai menebak
 * apakah NIK tertentu pernah mengajukan. Daftar resi baru keluar setelah kode benar.
 */
export async function recoverResi({ nik, phone, otp }: RecoverInput) {
  if (!otp) return { otp: await issueOtp(phone, nik) };
  await consumeOtp(otp, phone, nik);
  const apps = await Application.find({ "applicant.nik": nik, "applicant.phone": phone })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("resi serviceName status createdAt")
    .lean<Pick<ApplicationData, "resi" | "serviceName" | "status" | "createdAt">[]>();
  return {
    applications: apps.map(({ resi, serviceName, status, createdAt }) => ({
      resi,
      serviceName,
      status,
      statusLabel: STATUS_LABELS[status],
      createdAt,
    })),
  };
}

/** Cocokkan kode OTP untuk nomor HP & NIK ini; sekali pakai, maksimal 5 kali salah. */
async function consumeOtp(otp: ApplicationInput["otp"], phone: string, nik: string) {
  const expired = new AppError(422, "Kode verifikasi kedaluwarsa. Minta kode baru.", {
    otp: "Kode kedaluwarsa atau terlalu sering salah. Minta kode baru.",
  });
  if (!otp) throw new AppError(422, "Verifikasi nomor HP dulu.", { otp: "Masukkan kode verifikasi." });
  if (!mongoose.isValidObjectId(otp.id)) throw expired;
  const doc = await Verification.findOneAndUpdate(
    {
      _id: otp.id,
      phone,
      nik,
      usedAt: null,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: OTP_MAX_ATTEMPTS },
    },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  ).lean<VerificationData>();
  if (!doc) throw expired;
  if (doc.codeHash !== otpHash(otp.code, phone, nik)) {
    const left = OTP_MAX_ATTEMPTS - doc.attempts;
    throw new AppError(422, "Kode verifikasi salah.", {
      otp: left > 0 ? `Kode salah. Sisa ${left} kali percobaan.` : "Kode salah. Minta kode baru.",
    });
  }
  await Verification.updateOne({ _id: doc._id }, { $set: { usedAt: new Date() } });
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
  const { service, applicant } = await prepare(input, clock);
  // Loket: warga hadir & identitas dicek petugas langsung, jadi tanpa OTP.
  if (input.channel === "online") await consumeOtp(input.otp, applicant.phone, applicant.nik);

  // Dicek setelah OTP: info "ada permohonan aktif" hanya untuk pemegang nomor HP, tanpa detail apa pun.
  const active = await Application.exists({
    "applicant.nik": applicant.nik,
    serviceSlug: service.slug,
    status: { $in: OPEN_STATUSES },
  });
  if (active) {
    throw new AppError(
      409,
      `Sudah ada permohonan ${service.name} yang masih berjalan untuk NIK ini. Pantau dengan nomor resi yang Anda terima sebelumnya.`,
    );
  }

  const allowed = new Set(service.requirements);
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
