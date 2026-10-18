import mongoose from "mongoose";
import { ROLES } from "../lib/roles.js";

const stepTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ROLES, required: true },
    // Hari kerja. null = tanpa tenggat (mis. menunggu warga mengambil dokumen).
    slaDays: { type: Number, min: 0, default: null },
  },
  { _id: false },
);

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, default: "" },
    output: { type: String, trim: true, default: "" },
    requirements: [{ type: String, trim: true }],
    steps: {
      type: [stepTemplateSchema],
      validate: [(v) => v.length >= 2, "Layanan minimal punya 2 tahap."],
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.Service || mongoose.model("Service", serviceSchema);
