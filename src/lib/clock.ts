import { cache } from "react";
import { Application, Setting } from "../models.ts";
import { nowWithOffset } from "./sla.ts";

export interface Clock {
  now: Date;
  holidays: Set<string>;
  clockOffsetMs: number;
}

const KEY = "system";

/** Konfigurasi sistem (libur + offset jam demo). Panggil setelah dbConnect(). */
export async function getSystem(): Promise<Omit<Clock, "now">> {
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
export const getClock = cache(async (): Promise<Clock> => {
  const system = await getSystem();
  return { now: nowWithOffset(system.clockOffsetMs), ...system };
});

export async function advanceClock(ms: number): Promise<number> {
  const doc = await Setting.findOneAndUpdate(
    { key: KEY },
    { $inc: { clockOffsetMs: ms } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  return doc?.clockOffsetMs ?? 0;
}

/**
 * Kembali ke waktu nyata. Eskalasi yang tercatat "di masa depan" (hasil simulasi)
 * dibatalkan agar tahap yang belum terlambat tidak tampil tereskalasi. Audit log
 * (events) tidak disentuh: append-only, jadi jejak simulasi tetap tercatat.
 */
export async function resetClock(): Promise<number> {
  await Setting.updateOne({ key: KEY }, { $set: { clockOffsetMs: 0 } }, { upsert: true });
  const { modifiedCount } = await Application.updateMany(
    { "escalations.createdAt": { $gt: new Date() } },
    { $pull: { escalations: { createdAt: { $gt: new Date() } } } },
  );
  return modifiedCount;
}
