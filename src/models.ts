// Skema Mongoose. Satu berkas: modelnya kecil dan saling berkaitan; bentuk datanya
// (ApplicationData, Step, ...) didefinisikan di lib/workflow.ts agar logika murni
// bisa memakainya tanpa database.

import mongoose, { type Model, Schema, type Types } from "mongoose";
import { type ActorRole, type Role, ROLES } from "./lib/roles.ts";
import {
  type ApplicationData,
  type Escalation,
  type KtpDetails,
  type ServiceData,
  STATUS,
  type Step,
  type StepTemplate,
} from "./lib/workflow.ts";

const { ObjectId } = Schema.Types;

/** Pakai model yang sudah terdaftar (hot reload dev / serverless) atau daftarkan baru. */
function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema);
}

// --- Permohonan ---------------------------------------------------------------------

// Tahapan disematkan (bukan referensi ke template layanan): satu kali baca sudah
// mendapat seluruh timeline, dan riwayat tetap utuh walau template layanan diubah.
const stepSchema = new Schema<Step>(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    slaHours: { type: Number, default: null },
    checklist: [{ type: String }],
    evidenceLabel: { type: String, default: null },
    checked: [{ type: String }],
    evidence: { type: String, default: null },
    startedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    pausedMs: { type: Number, default: 0 },
    pausedWorkMs: { type: Number, default: 0 },
    handledBy: { type: ObjectId, ref: "User", default: null },
    handledByName: { type: String, default: null },
    publicNote: { type: String, default: null },
    internalNote: { type: String, default: null },
  },
  { _id: false },
);

const escalationSchema = new Schema<Escalation>(
  {
    stepKey: { type: String, required: true },
    level: { type: Number, required: true },
    target: { type: String, required: true },
    note: { type: String, default: null },
    createdAt: { type: Date, required: true },
    resolvedAt: { type: Date, default: null },
  },
  { _id: false },
);

const applicationSchema = new Schema<ApplicationData>(
  {
    resi: { type: String, required: true, unique: true },
    serviceId: { type: ObjectId, ref: "Service", required: true },
    serviceName: { type: String, required: true },
    serviceSlug: { type: String, required: true },
    applicant: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true },
      email: { type: String, lowercase: true, trim: true, default: null },
      nik: { type: String, select: false, default: null },
      // Isi KTP-el (layanan perekaman KTP-el). Data pribadi: hanya untuk petugas.
      ktp: {
        type: new Schema<KtpDetails>(
          {
            birthPlace: String,
            birthDate: String,
            gender: String,
            bloodType: String,
            address: String,
            rtRw: String,
            village: String,
            district: String,
            religion: String,
            marital: String,
            job: String,
          },
          { _id: false },
        ),
        default: null,
      },
    },
    channel: { type: String, enum: ["online", "loket"], required: true },
    status: { type: String, enum: Object.values(STATUS), required: true },
    currentStep: { type: Number, required: true, default: 0 },
    currentDueAt: { type: Date, default: null },
    steps: [stepSchema],
    escalations: [escalationSchema],
    requirementsChecked: [{ type: String }],
    rejectionReason: { type: String, default: null },
    completedAt: { type: Date, default: null },
    rating: {
      type: new Schema(
        { score: { type: Number, min: 1, max: 5 }, comment: String, createdAt: Date },
        { _id: false },
      ),
      default: null,
    },
    // Pembatas tebakan 4 digit HP di halaman lacak.
    verifyLock: {
      fails: { type: Number, default: 0 },
      until: { type: Date, default: null },
    },
  },
  // optimisticConcurrency: save() ditolak (VersionError) jika dokumen sudah diubah
  // sejak dibaca, mencegah dua petugas menyelesaikan tahap yang sama bersamaan.
  { timestamps: true, optimisticConcurrency: true },
);

applicationSchema.index({ status: 1, currentStep: 1 });
applicationSchema.index({ "steps.dueAt": 1 });
applicationSchema.index({ status: 1, currentDueAt: 1 });
applicationSchema.index({ serviceId: 1, createdAt: -1 });
// Cek permohonan ganda (NIK + layanan yang masih berjalan) & batas pengajuan harian.
applicationSchema.index({ "applicant.nik": 1, serviceSlug: 1, status: 1 });
applicationSchema.index({ "applicant.phone": 1, createdAt: -1 });

export const Application = defineModel("Application", applicationSchema);

// --- Kode verifikasi nomor HP (OTP) -------------------------------------------------

export interface VerificationData {
  _id: Types.ObjectId;
  phone: string;
  nik: string;
  /** Hanya hash kode yang disimpan. */
  codeHash: string;
  attempts: number;
  usedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

const verificationSchema = new Schema<VerificationData>(
  {
    phone: { type: String, required: true },
    nik: { type: String, required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    usedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
// Dokumen dihapus otomatis oleh MongoDB 1 jam setelah kedaluwarsa (cukup untuk batas per jam).
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
verificationSchema.index({ phone: 1, createdAt: -1 });

export const Verification = defineModel("Verification", verificationSchema);

// --- Layanan ------------------------------------------------------------------------

const stepTemplateSchema = new Schema<StepTemplate>(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ROLES, required: true },
    slaHours: { type: Number, min: 0, default: null },
    checklist: [{ type: String, trim: true }],
    checkRequirements: { type: Boolean, default: false },
    evidenceLabel: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const serviceSchema = new Schema<ServiceData>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, default: "" },
    output: { type: String, trim: true, default: "" },
    requirements: [{ type: String, trim: true }],
    steps: {
      type: [stepTemplateSchema],
      validate: [(v: StepTemplate[]) => v.length >= 2, "Layanan minimal punya 2 tahap."],
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Service = defineModel("Service", serviceSchema);

// --- Audit log ----------------------------------------------------------------------

export interface EventData {
  _id?: Types.ObjectId;
  applicationId: Types.ObjectId;
  actorId: Types.ObjectId | string | null;
  actorName: string | null;
  actorRole: ActorRole | null;
  action: string;
  payload: Record<string, unknown>;
  at: Date;
}

const eventSchema = new Schema<EventData>({
  applicationId: { type: ObjectId, ref: "Application", required: true, index: true },
  actorId: { type: ObjectId, ref: "User", default: null },
  actorName: { type: String, default: null },
  actorRole: { type: String, default: null },
  action: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  at: { type: Date, required: true },
});

// Audit log append-only: semua jalur ubah/hapus lewat Mongoose ditolak.
function appendOnly(): never {
  throw new Error("Audit log (events) bersifat append-only: tidak bisa diubah atau dihapus.");
}
function makeAppendOnly<T>(schema: Schema<T>) {
  schema.pre(
    [
      "updateOne",
      "updateMany",
      "findOneAndUpdate",
      "replaceOne",
      "findOneAndReplace",
      "deleteOne",
      "deleteMany",
      "findOneAndDelete",
    ],
    appendOnly,
  );
  schema.pre("save", function () {
    if (!this.isNew) appendOnly();
  });
}
makeAppendOnly(eventSchema);

export const Event = defineModel("Event", eventSchema);

/** Jejak tindakan admin: akun petugas, layanan, dan hari libur. Append-only. */
export interface AdminEventData {
  _id?: Types.ObjectId;
  actorId: Types.ObjectId | string | null;
  actorName: string;
  action: string;
  /** Yang diubah, mis. nama & email petugas atau nama layanan. */
  target: string;
  payload: Record<string, unknown>;
  at: Date;
}

const adminEventSchema = new Schema<AdminEventData>({
  actorId: { type: ObjectId, ref: "User", default: null },
  actorName: { type: String, required: true },
  action: { type: String, required: true, index: true },
  target: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  at: { type: Date, required: true, index: true },
});
makeAppendOnly(adminEventSchema);

export const AdminEvent = defineModel("AdminEvent", adminEventSchema);

// --- Pengaturan sistem --------------------------------------------------------------

export interface SettingData {
  key: string;
  /** Tanggal libur "YYYY-MM-DD" (WIB) yang tidak dihitung sebagai hari kerja. */
  holidays: string[];
  /** Mode demo: geser jam sistem ke depan supaya keterlambatan bisa didemokan. */
  clockOffsetMs: number;
}

// Satu dokumen konfigurasi sistem (key: "system").
const settingSchema = new Schema<SettingData>(
  {
    key: { type: String, required: true, unique: true },
    holidays: [{ type: String }],
    clockOffsetMs: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Setting = defineModel("Setting", settingSchema);

// --- Akun petugas -------------------------------------------------------------------

export interface UserData {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  unit: string | null;
  isActive: boolean;
  /** true setelah dibuat/di-reset admin: kata sandi sementara wajib diganti saat login pertama. */
  mustChangePassword: boolean;
  /**
   * Naik setiap peran, status aktif, atau kata sandi berubah. Sesi (JWT) menyimpan versi
   * saat login; versi berbeda = sesi lama otomatis tidak berlaku lagi.
   */
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserData>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    unit: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const User = defineModel("User", userSchema);
