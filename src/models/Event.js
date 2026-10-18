import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  actorName: { type: String, default: null },
  actorRole: { type: String, default: null },
  action: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  at: { type: Date, required: true },
});

// Audit log append-only: semua jalur ubah/hapus lewat Mongoose ditolak.
function appendOnly() {
  throw new Error("Audit log (events) bersifat append-only: tidak bisa diubah atau dihapus.");
}
eventSchema.pre(
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
eventSchema.pre("save", function () {
  if (!this.isNew) appendOnly();
});

export default mongoose.models.Event || mongoose.model("Event", eventSchema);
