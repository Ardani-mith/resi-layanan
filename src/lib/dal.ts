// Data Access Layer: satu pintu baca data untuk Server Component DAN route API.
// - Otorisasi diperiksa di sini, dekat dengan data (proxy.ts hanya cek cepat).
// - Setiap fungsi menyambungkan DB & mengambil jam sistem sendiri, jadi pemanggil
//   cukup memanggil satu fungsi.
// - Hanya data yang dibutuhkan UI yang keluar (bentuknya dari present.ts).

import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { Application, Service } from "../models.ts";
import { eventsFor, loadByResi } from "./applications.ts";
import { getClock } from "./clock.ts";
import { dbConnect } from "./db.ts";
import { syncOverdue } from "./escalation.ts";
import { publicView, type QueueItem, queueItem, staffView } from "./present.ts";
import { homeFor, PASSWORD_PATH, type Role } from "./roles.ts";
import { getSession } from "./session.ts";
import { computeStats, type OpenEscalation, openEscalations } from "./stats.ts";
import { listStaff, type SessionUser } from "./users.ts";
import { type ApplicationData, canActOn, OPEN_STATUSES, type ServiceData, STATUS } from "./workflow.ts";

/** Sesi pengguna, dibaca sekali per render. */
export const getCurrentUser = cache(getSession);

/**
 * Untuk halaman petugas: pastikan login & perannya sesuai, kalau tidak redirect.
 * `from` = path halaman, dipakai untuk kembali setelah login. Akun dengan kata sandi
 * sementara diarahkan ke halaman ganti kata sandi dulu.
 */
export async function requireStaffPage(roles: readonly Role[] | null, from: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/masuk?next=${encodeURIComponent(from)}`);
  if (user.mustChangePassword && from !== PASSWORD_PATH) redirect(PASSWORD_PATH);
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

/** Layanan aktif dalam bentuk polos (aman dikirim ke Client Component). */
export async function getActiveServices() {
  await ready();
  const services = await Service.find({ isActive: true })
    .sort({ order: 1, name: 1 })
    .select("name slug description output requirements steps")
    .lean<ServiceData[]>();
  return services.map(({ _id, ...s }) => ({
    id: String(_id),
    name: s.name,
    slug: s.slug,
    description: s.description,
    output: s.output,
    requirements: s.requirements,
    steps: s.steps.map(({ key, name, role, slaDays }) => ({ key, name, role, slaDays })),
    totalSlaDays: s.steps.reduce((sum, step) => sum + (step.slaDays || 0), 0),
  }));
}

export type ActiveService = Awaited<ReturnType<typeof getActiveServices>>[number];

export async function getTracking(resi: string) {
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
export async function getQueue(user: SessionUser) {
  const clock = await ready();
  await syncOverdue(clock.now, clock.holidays);

  const apps = await Application.find({ status: { $in: OPEN_STATUSES } })
    .select("resi serviceName applicant.name channel status currentStep steps escalations createdAt")
    .lean<ApplicationData[]>();

  const seesAll = user.role === "pimpinan" || user.role === "admin";
  const items: (QueueItem & { mine: boolean })[] = [];
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

export type Queue = Awaited<ReturnType<typeof getQueue>>;

/** Detail lengkap untuk petugas + apakah perannya boleh menindak tahap saat ini. */
export async function getStaffApplication(resi: string, user: SessionUser) {
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
      .lean<ApplicationData[]>(),
    Service.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .select("name slug steps.slaDays")
      .lean<ServiceData[]>(),
  ]);

  const stats = computeStats(apps, services, clock.now);
  return {
    ...stats,
    escalations: internal ? openEscalations(apps, clock.now) : ([] as OpenEscalation[]),
  };
}

// --- Admin ---------------------------------------------------------------------

export async function getStaffAccounts() {
  await ready();
  return listStaff();
}
