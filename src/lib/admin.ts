// Operasi admin di luar alur permohonan: layanan, hari libur, dan jejak (audit log) semua
// tindakan admin termasuk perubahan akun petugas (dicatat dari users.ts).

import mongoose from "mongoose";
import { AdminEvent, type AdminEventData, Service, Setting } from "../models.ts";
import type { HolidaysInput, ServiceInput } from "./validators.ts";
import { AppError, type ServiceData, type StepTemplate } from "./workflow.ts";

/** Pelaku tindakan admin. id null = dari terminal (npm run user:create). */
export interface AdminActor {
  id: string | null;
  name: string;
}

export const ADMIN_EVENT_LABELS: Record<string, string> = {
  account_created: "Akun dibuat",
  account_updated: "Data akun diubah",
  account_role_changed: "Peran diganti",
  account_deactivated: "Akun dinonaktifkan",
  account_activated: "Akun diaktifkan kembali",
  account_password_reset: "Kata sandi di-reset",
  account_password_changed: "Kata sandi diganti pemiliknya",
  service_created: "Layanan dibuat",
  service_updated: "Layanan diubah",
  holidays_updated: "Hari libur diubah",
};

export async function logAdminEvent(
  actor: AdminActor,
  action: string,
  target: string,
  payload: Record<string, unknown> = {},
) {
  await AdminEvent.create({
    actorId: actor.id && mongoose.isValidObjectId(actor.id) ? actor.id : null,
    actorName: actor.name,
    action,
    target,
    payload,
    at: new Date(),
  });
}

/** Jejak terbaru; `prefix` menyaring jenis, mis. "account_" atau "service_". */
export async function listAdminEvents(prefix?: string, limit = 30): Promise<AdminEventData[]> {
  const filter = prefix ? { action: { $regex: `^${prefix}` } } : {};
  return AdminEvent.find(filter).sort({ at: -1, _id: -1 }).limit(limit).lean<AdminEventData[]>();
}

// --- Layanan ------------------------------------------------------------------------

/** "Entri & validasi data" → "entri-validasi-data"; kunci tahap unik dalam satu layanan. */
function stepKeys(steps: ServiceInput["steps"]): StepTemplate[] {
  const used = new Set<string>();
  return steps.map((step) => {
    const base =
      step.name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "tahap";
    let key = base;
    for (let i = 2; used.has(key); i += 1) key = `${base}-${i}`;
    used.add(key);
    return { key, name: step.name, role: step.role, slaDays: step.slaDays };
  });
}

export async function listAllServices(): Promise<ServiceData[]> {
  return Service.find().sort({ isActive: -1, order: 1, name: 1 }).lean<ServiceData[]>();
}

/**
 * Buat (tanpa `id`) atau ubah layanan. Tahapan baru hanya berlaku untuk permohonan
 * berikutnya: permohonan yang sudah ada menyimpan salinan tahapannya sendiri.
 * Slug tidak bisa diubah setelah dibuat (dipakai di tautan /layanan/[slug]).
 */
export async function saveService(input: ServiceInput, actor: AdminActor, id?: string): Promise<ServiceData> {
  const data = { ...input, steps: stepKeys(input.steps) };

  if (id) {
    if (!mongoose.isValidObjectId(id)) throw new AppError(404, "Layanan tidak ditemukan.");
    const { slug: _slug, ...changes } = data;
    const service = await Service.findByIdAndUpdate(
      id,
      { $set: changes },
      { returnDocument: "after", runValidators: true },
    ).lean<ServiceData>();
    if (!service) throw new AppError(404, "Layanan tidak ditemukan.");
    await logAdminEvent(actor, "service_updated", service.name, { slug: service.slug });
    return service;
  }

  if (await Service.exists({ slug: data.slug })) {
    throw new AppError(409, "Slug sudah dipakai.", { slug: "Slug ini sudah dipakai layanan lain." });
  }
  const service = (await Service.create(data)).toObject();
  await logAdminEvent(actor, "service_created", service.name, { slug: service.slug });
  return service;
}

// --- Hari libur ---------------------------------------------------------------------

export async function getHolidays(): Promise<string[]> {
  const doc = await Setting.findOne({ key: "system" }).lean();
  return [...(doc?.holidays ?? [])].sort();
}

/** Ganti seluruh daftar libur (unik & terurut). Berlaku untuk tenggat yang dihitung sesudahnya. */
export async function setHolidays({ holidays }: HolidaysInput, actor: AdminActor): Promise<string[]> {
  const before = new Set(await getHolidays());
  const next = [...new Set(holidays)].sort();
  await Setting.updateOne({ key: "system" }, { $set: { holidays: next } }, { upsert: true });
  await logAdminEvent(actor, "holidays_updated", `${next.length} tanggal`, {
    added: next.filter((d) => !before.has(d)),
    removed: [...before].filter((d) => !next.includes(d)),
  });
  return next;
}
