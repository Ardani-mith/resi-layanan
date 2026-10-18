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

/** Waktu sistem + daftar libur sekaligus, karena hampir selalu dibutuhkan berdua. */
export async function getClock() {
  const system = await getSystem();
  return { now: nowWithOffset(system.clockOffsetMs), ...system };
}

export async function advanceClock(ms) {
  const doc = await Setting.findOneAndUpdate(
    { key: KEY },
    { $inc: { clockOffsetMs: ms } },
    { upsert: true, returnDocument: "after" }
  ).lean();
  return doc.clockOffsetMs;
}

export async function resetClock() {
  await Setting.updateOne({ key: KEY }, { $set: { clockOffsetMs: 0 } }, { upsert: true });
  return 0;
}
