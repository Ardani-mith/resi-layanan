import mongoose from "mongoose";

// Satu dokumen konfigurasi sistem (key: "system").
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    // Daftar tanggal libur "YYYY-MM-DD" (WIB) yang tidak dihitung sebagai hari kerja.
    holidays: [{ type: String }],
    // Mode demo: geser jam sistem ke depan supaya keterlambatan bisa didemokan.
    clockOffsetMs: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.Setting || mongoose.model("Setting", settingSchema);
