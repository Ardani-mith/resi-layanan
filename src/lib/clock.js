import { cache } from "react";
import Application from "../models/Application.js";
import Setting from "../models/Setting.js";
import { nowWithOffset } from "./sla.js";

const KEY = "system";

/** Konfigurasi sistem (libur + offset jam demo). Panggil setelah dbConnect(). */
export async function getSystem() {
  const doc = await Setting.findOne({ key: KEY }).lean();
  return {
    holidays: new Set(doc?.holidays ?? []),
    clockOffsetMs: doc?.clockOffsetMs ?? 0,
  };
}

/**
 * Waktu sistem + daftar libur sekaligus, karena hampir selalu dibutuhkan berdua.
 * React cache: dalam satu render server, semua komponen berbagi satu pembacaan
 * (dan satu nilai "sekarang"). Di route handler, cache tidak aktif → dibaca biasa.
 */
export const getClock = cache(async () => {
  const system = await getSystem();
  return { now: nowWithOffset(system.clockOffsetMs), ...system };
});

export async function advanceClock(ms) {
  const doc = await Setting.findOneAndUpdate(
    { key: KEY },
    { $inc: { clockOffsetMs: ms } },
    { upsert: true, returnDocument: "after" }
  ).lean();
  return doc.clockOffsetMs;
}

/**
 * Kembali ke waktu nyata. Eskalasi yang tercatat "di masa depan" (hasil simulasi)
 * dibatalkan agar tahap yang belum terlambat tidak tampil tereskalasi. Audit log
 * (events) tidak disentuh: append-only, jadi jejak simulasi tetap tercatat.
 */
export async function resetClock() {
  await Setting.updateOne({ key: KEY }, { $set: { clockOffsetMs: 0 } }, { upsert: true });
  const { modifiedCount } = await Application.updateMany(
    { "escalations.createdAt": { $gt: new Date() } },
    { $pull: { escalations: { createdAt: { $gt: new Date() } } } }
  );
  return modifiedCount;
}
