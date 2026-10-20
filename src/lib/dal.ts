// Data Access Layer: satu pintu baca data untuk Server Component DAN route API.
// - Otorisasi diperiksa di sini, dekat dengan data (proxy.js hanya cek cepat).
// - Setiap fungsi menyambungkan DB & mengambil jam sistem sendiri, jadi pemanggil
//   cukup memanggil satu fungsi.
// - Hanya data yang dibutuhkan UI yang keluar (bentuknya dari present.js).

import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import Application from "@/models/Application";
import Service from "@/models/Service";
import { eventsFor, loadByResi } from "./applications.js";
import { getClock } from "./clock.js";
import { dbConnect } from "./db.js";
import { syncOverdue } from "./escalation.js";
import { publicView, queueItem, staffView } from "./present.js";
import { homeFor } from "./roles.js";
import { listActiveServices } from "./services.js";
import { getSession } from "./session.js";
import { computeStats, openEscalations } from "./stats.js";
import { canActOn, OPEN_STATUSES, STATUS } from "./workflow.js";

/** Sesi pengguna, dibaca sekali per render. */
export const getCurrentUser = cache(getSession);

/**
 * Untuk halaman petugas: pastikan login & perannya sesuai, kalau tidak redirect.
 * `from` = path halaman, dipakai untuk kembali setelah login.
 */
export async function requireStaffPage(roles, from) {
  const user = await getCurrentUser();
  if (!user) redirect(`/masuk?next=${encodeURIComponent(from)}`);
  if (roles && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/** Jam sistem dengan DB tersambung; titik awal semua query. */
async function ready() {
  await connection();
  await dbConnect();
  return getClock();
}

/** Info jam untuk UI (hitung mundur & banner mode demo). */
export async function getClockInfo() {
  const clock = await ready();
  return { now: clock.now.toISOString(), offsetMs: clock.clockOffsetMs };
}

// --- Warga ---------------------------------------------------------------------

export async function getActiveServices() {
  await ready();
  return listActiveServices();
}

export async function getTracking(resi) {
  const clock = await ready();
  const app = await loadByResi(resi, clock);
  return app ? publicView(app, clock) : null;
}

// --- Petugas -------------------------------------------------------------------

/**
 * Antrean yang boleh dilihat `user`. Petugas loket/teknis: tahap sesuai perannya
 * (loket juga melihat yang menunggu perbaikan). Pimpinan & admin: semua, dengan
 * flag `mine` untuk tahap yang memang tugas perannya.
 */
export async function getQueue(user) {
  const clock = await ready();
  await syncOverdue(clock.now, clock.holidays);

  const apps = await Application.find({ status: { $in: OPEN_STATUSES } })
    .select("resi serviceName applicant.name channel status currentStep steps escalations createdAt")
    .lean();

  const seesAll = user.role === "pimpinan" || user.role === "admin";
  const items = [];
  for (const app of apps) {
    const mine =
      app.status === STATUS.PERLU_PERBAIKAN
        ? user.role === "petugas_loket"
        : app.steps[app.currentStep]?.role === user.role;
    if (mine || seesAll) items.push({ ...queueItem(app, clock.now), mine });
  }

  // Paling mendesak di atas: sisa SLA terkecil (terlambat = negatif); tanpa tenggat di bawah.
  items.sort((a, b) => (a.remainingMs ?? Infinity) - (b.remainingMs ?? Infinity));
  const counts = {
    mine: items.filter((i) => i.mine && i.status !== STATUS.PERLU_PERBAIKAN).length,
    overdue: items.filter((i) => i.stepState === "terlambat").length,
    waitingFix: items.filter((i) => i.status === STATUS.PERLU_PERBAIKAN).length,
    total: items.length,
  };
  return { role: user.role, items, counts, now: clock.now.toISOString(), offsetMs: clock.clockOffsetMs };
}

/** Detail lengkap untuk petugas + apakah perannya boleh menindak tahap saat ini. */
export async function getStaffApplication(resi, user) {
  const clock = await ready();
  const app = await loadByResi(resi, clock);
  if (!app) return null;
  return {
    ...staffView(app, clock, await eventsFor(app._id)),
    canAct: OPEN_STATUSES.includes(app.status) && canActOn(app, user.role),
    now: clock.now.toISOString(),
    offsetMs: clock.clockOffsetMs,
  };
}

// --- Statistik -----------------------------------------------------------------

/**
 * KPI rapor (publik, agregat saja) atau pantau (internal: + daftar eskalasi
 * dengan nama pemohon). Pemanggil internal wajib sudah memeriksa peran.
 */
export async function getStats({ internal = false } = {}) {
  const clock = await ready();
  await syncOverdue(clock.now, clock.holidays);

  const [apps, services] = await Promise.all([
    Application.find()
      .select(
        "resi serviceId serviceName applicant.name status currentStep steps escalations rating createdAt completedAt",
      )
      .lean(),
    Service.find({ isActive: true }).sort({ order: 1, name: 1 }).select("name slug steps.slaDays").lean(),
  ]);

  const stats = computeStats(apps, services, clock.now);
  if (internal) stats.escalations = openEscalations(apps, clock.now);
  return stats;
}
