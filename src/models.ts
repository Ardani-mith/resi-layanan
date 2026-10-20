import mongoose from "mongoose";
import { ROLES } from "../lib/roles.js";
import { STATUS } from "../lib/workflow.js";

const { ObjectId } = mongoose.Schema.Types;

// Tahapan disematkan (bukan referensi ke template layanan): satu kali baca sudah
// mendapat seluruh timeline, dan riwayat tetap utuh walau template layanan diubah.
const stepSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    slaDays: { type: Number, default: null },
    startedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    pausedMs: { type: Number, default: 0 },
    handledBy: { type: ObjectId, ref: "User", default: null },
    handledByName: { type: String, default: null },
    publicNote: { type: String, default: null },
    internalNote: { type: String, default: null },
  },
  { _id: false },
);

const escalationSchema = new mongoose.Schema(
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

const applicationSchema = new mongoose.Schema(
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
    },
    channel: { type: String, enum: ["online", "loket"], required: true },
    status: { type: String, enum: Object.values(STATUS), required: true },
    currentStep: { type: Number, required: true, default: 0 },
    // Salinan dueAt tahap berjalan (null saat dijeda/final) agar antrean & deteksi
    // keterlambatan cukup satu query berindeks.
    currentDueAt: { type: Date, default: null },
    steps: [stepSchema],
    escalations: [escalationSchema],
    requirementsChecked: [{ type: String }],
    rejectionReason: { type: String, default: null },
    completedAt: { type: Date, default: null },
    rating: {
      type: new mongoose.Schema(
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

export default mongoose.models.Application || mongoose.model("Application", applicationSchema);
