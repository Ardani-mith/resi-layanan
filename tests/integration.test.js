// Tes dengan MongoDB sungguhan (in-memory): seed, eskalasi idempoten, konflik
// petugas, audit log append-only, dan pembatas verifikasi HP.
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApplication, performAction, performCitizenAction, verifyApplicant } from "@/lib/applications";
import { dbConnect } from "@/lib/db";
import { syncEscalations, syncOverdue } from "@/lib/escalation";
import { DAY_MS } from "@/lib/sla";
import { computeStats, openEscalations } from "@/lib/stats";
import Application from "@/models/Application";
import Event from "@/models/Event";
import Service from "@/models/Service";
import { seed } from "../scripts/seed.mjs";

const NOW = new Date("2026-10-19T03:00:00Z"); // Senin 10.00 WIB
const clockAt = (offsetDays = 0) => ({ now: new Date(NOW.getTime() + offsetDays * DAY_MS), holidays: new Set() });

let mongod;
let users;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri("resi-test");
  await dbConnect();
  ({ users } = await seed({ now: NOW, password: "rahasia-demo", log: () => {} }));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

const actor = (role) => {
  const u = users.find((x) => x.role === role);
  return { id: String(u._id), name: u.name, role: u.role };
};

async function newApplication(clock = clockAt()) {
  return createApplication({
    input: {
      serviceSlug: "akta-kelahiran",
      channel: "online",
      applicant: { name: "Uji Coba", phone: "081200009999", email: "", nik: "3299000000000001" },
      requirementsChecked: ["Kartu Keluarga orang tua", "bukan syarat resmi"],
    },
    actor: null,
    clock,
  });
}

describe("seed", () => {
  it("membuat data dengan status beragam dan tanggal mundur yang dipertahankan", async () => {
    const apps = await Application.find().lean();
    expect(apps).toHaveLength(60);

    const statuses = new Set(apps.map((a) => a.status));
    for (const s of ["diajukan", "diproses", "selesai", "perlu_perbaikan", "ditolak"]) expect(statuses).toContain(s);

    const oldest = Math.min(...apps.map((a) => new Date(a.createdAt).getTime()));
    expect(NOW - oldest).toBeGreaterThan(20 * DAY_MS);
    expect(apps.every((a) => new Date(a.createdAt) <= NOW)).toBe(true);

    expect(apps.some((a) => a.rating?.score)).toBe(true);
    expect(apps.some((a) => a.escalations.length > 0)).toBe(true);
  });

  it("resi demo ada dengan kondisi yang dijanjikan", async () => {
    const byResi = Object.fromEntries(
      (await Application.find({ resi: /^RL-HJ26-/ }).lean()).map((a) => [a.resi, a])
    );
    expect(byResi["RL-HJ26-AKTA"].status).toBe("diproses");
    expect(NOW - byResi["RL-HJ26-AKTA"].currentDueAt).toBeGreaterThan(0);
    expect(byResi["RL-HJ26-AKTA"].escalations.map((e) => e.level)).toEqual([1]);
    expect(byResi["RL-HJ26-AKTA"].applicant.phone.endsWith("1234")).toBe(true);

    expect(byResi["RL-HJ26-PRBK"].status).toBe("perlu_perbaikan");
    expect(byResi["RL-HJ26-SLSE"].status).toBe("selesai");
    expect(byResi["RL-HJ26-SLSE"].rating).toBeNull();
    expect(byResi["RL-HJ26-TLAK"].status).toBe("ditolak");
    expect(byResi["RL-HJ26-TLAK"].rejectionReason).toBeTruthy();
  });

  it("NIK tersimpan tapi tidak ikut terbaca secara default", async () => {
    const app = await Application.findOne({ resi: "RL-HJ26-AKTA" }).lean();
    expect(app.applicant.nik).toBeUndefined();
    const withNik = await Application.findOne({ resi: "RL-HJ26-AKTA" }).select("+applicant.nik").lean();
    expect(withNik.applicant.nik).toMatch(/^\d{16}$/);
  });

  it("setiap permohonan punya event 'created' di audit log", async () => {
    const created = await Event.countDocuments({ action: "created" });
    expect(created).toBe(60);
  });
});

describe("pengajuan", () => {
  it("membuat resi unik, snapshot layanan, dan menyaring checklist yang bukan syarat", async () => {
    const app = await newApplication();
    expect(app.resi).toMatch(/^RL-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(app.serviceName).toBe("Akta Kelahiran");
    expect(app.steps).toHaveLength(5);
    expect(app.requirementsChecked).toEqual(["Kartu Keluarga orang tua"]);
    expect(app.createdAt).toEqual(NOW);
  });

  it("menolak layanan yang tidak ada", async () => {
    await expect(
      createApplication({
        input: { serviceSlug: "tidak-ada", channel: "online", applicant: {}, requirementsChecked: [] },
        clock: clockAt(),
      })
    ).rejects.toThrow(/Layanan tidak ditemukan/);
  });

  it("riwayat permohonan tidak berubah saat template layanan diubah", async () => {
    const app = await newApplication();
    await Service.updateOne({ slug: "akta-kelahiran" }, { $set: { "steps.1.slaDays": 10, "steps.1.name": "Diganti" } });
    const stored = await Application.findOne({ resi: app.resi }).lean();
    expect(stored.steps[1]).toMatchObject({ name: "Entri & validasi data", slaDays: 2 });
    await Service.updateOne({ slug: "akta-kelahiran" }, { $set: { "steps.1.slaDays": 2, "steps.1.name": "Entri & validasi data" } });
  });
});

describe("eskalasi saat dibaca", () => {
  it("idempoten walau 5 request membaca bersamaan", async () => {
    const app = await newApplication();
    const later = clockAt(2).now; // tahap verifikasi (1 hari kerja) sudah lewat

    const copies = await Promise.all(Array.from({ length: 5 }, () => Application.findOne({ resi: app.resi }).lean()));
    await Promise.all(copies.map((copy) => syncEscalations(copy, later, new Set())));
    await syncOverdue(later, new Set());

    const stored = await Application.findOne({ resi: app.resi }).lean();
    expect(stored.escalations.map((e) => e.level)).toEqual([1]);
    expect(await Event.countDocuments({ applicationId: stored._id, action: "escalated" })).toBe(1);
    expect(copies.every((c) => c.escalations.length === 1)).toBe(true);
  });

  it("menyelesaikan tahap yang terlambat mencatat eskalasi dulu lalu menandainya selesai", async () => {
    const app = await newApplication();
    const updated = await performAction({
      resi: app.resi,
      input: { action: "complete" },
      actor: actor("petugas_loket"),
      clock: clockAt(2),
    });
    expect(updated.escalations).toHaveLength(1);
    expect(updated.escalations[0].resolvedAt).toEqual(clockAt(2).now);
    expect(updated.status).toBe("diproses");
  });
});

describe("aksi petugas", () => {
  it("menolak peran yang bukan pemilik tahap", async () => {
    const app = await newApplication();
    await expect(
      performAction({ resi: app.resi, input: { action: "complete" }, actor: actor("petugas_teknis"), clock: clockAt() })
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("dua petugas menyelesaikan tahap yang sama bersamaan: hanya satu yang berhasil", async () => {
    const app = await newApplication();
    const results = await Promise.allSettled(
      [actor("petugas_loket"), actor("admin")].map((a) =>
        performAction({ resi: app.resi, input: { action: "complete" }, actor: a, clock: clockAt() })
      )
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const stored = await Application.findOne({ resi: app.resi }).lean();
    expect(stored.currentStep).toBe(1);
    expect(await Event.countDocuments({ applicationId: stored._id, action: "complete" })).toBe(1);
  });

  it("warga mengirim perbaikan → status kembali berjalan, lalu rating setelah selesai", async () => {
    const app = await newApplication();
    const loket = actor("petugas_loket");
    await performAction({ resi: app.resi, input: { action: "request_fix", publicNote: "Lampirkan KK" }, actor: loket, clock: clockAt() });
    const resumed = await performCitizenAction({ resi: app.resi, input: { action: "resubmit" }, clock: clockAt(1) });
    expect(resumed.status).toBe("diajukan");
    expect(resumed.steps[0].pausedMs).toBe(DAY_MS);

    for (const role of ["petugas_loket", "petugas_teknis", "pimpinan", "petugas_teknis", "petugas_loket"]) {
      await performAction({ resi: app.resi, input: { action: "complete" }, actor: actor(role), clock: clockAt(1) });
    }
    const rated = await performCitizenAction({ resi: app.resi, input: { action: "rate", score: 5 }, clock: clockAt(1) });
    expect(rated.status).toBe("selesai");
    expect(rated.rating.score).toBe(5);
  });
});

describe("audit log append-only", () => {
  it("events tidak bisa diubah atau dihapus lewat model", async () => {
    const event = await Event.findOne();
    await expect(Event.updateOne({ _id: event._id }, { action: "x" })).rejects.toThrow(/append-only/);
    await expect(Event.deleteMany({})).rejects.toThrow(/append-only/);
    await expect(Event.findOneAndDelete({ _id: event._id })).rejects.toThrow(/append-only/);
    event.action = "diubah";
    await expect(event.save()).rejects.toThrow(/append-only/);
    expect(await Event.countDocuments({ action: "diubah" })).toBe(0);
  });
});

describe("verifikasi 4 digit HP", () => {
  it("benar → ok; 5 kali salah → terkunci, bahkan untuk jawaban benar", async () => {
    const app = await newApplication();
    const load = () => Application.findOne({ resi: app.resi }).lean();
    expect(await verifyApplicant(await load(), "9999", NOW)).toBe("ok");

    for (let i = 0; i < 4; i += 1) expect(await verifyApplicant(await load(), "0000", NOW)).toBe("wrong");
    expect(await verifyApplicant(await load(), "0000", NOW)).toBe("locked");
    expect(await verifyApplicant(await load(), "9999", NOW)).toBe("locked");
    expect(await verifyApplicant(await load(), "9999", new Date(NOW.getTime() + 16 * 60_000))).toBe("ok");
  });
});

describe("statistik", () => {
  it("KPI & eskalasi terbuka dihitung dari data seed", async () => {
    const apps = await Application.find().lean();
    const services = await Service.find().lean();
    const stats = computeStats(apps, services, NOW);

    expect(stats.overall.total).toBe(apps.length);
    expect(stats.overall.onTimeRate).toBeGreaterThan(0);
    expect(stats.overall.onTimeRate).toBeLessThanOrEqual(1);
    expect(stats.services).toHaveLength(3);
    expect(stats.services.reduce((n, s) => n + s.total, 0)).toBe(apps.length);
    expect(stats.trend).toHaveLength(8);
    expect(stats.services[0].steps.length).toBeGreaterThan(0);

    const open = openEscalations(apps, NOW);
    expect(open.some((e) => e.resi === "RL-HJ26-AKTA")).toBe(true);
  });
});
