// Tes dengan MongoDB sungguhan (in-memory): seed, eskalasi idempoten, konflik
// petugas, audit log append-only, dan pembatas verifikasi HP.
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createApplication,
  DAILY_ONLINE_LIMIT,
  followUpEscalation,
  performAction,
  performCitizenAction,
  recoverResi,
  startVerification,
  verifyApplicant,
} from "@/lib/applications";
import { advanceClock, getSystem, resetClock } from "@/lib/clock";
import { dbConnect } from "@/lib/db";
import { syncEscalations, syncOverdue } from "@/lib/escalation";
import { decryptNik, hashNik } from "@/lib/pii";
import { checkNik, publicView } from "@/lib/present";
import type { Role } from "@/lib/roles";
import { DAY_MS } from "@/lib/sla";
import { computeStats, openEscalations } from "@/lib/stats";
import type { ActionInput, ApplicationInput } from "@/lib/validators";
import type { Actor, ApplicationData } from "@/lib/workflow";
import { Application, Event, Service } from "@/models";
import { seed } from "../scripts/seed.ts";

const NOW = new Date("2026-10-19T03:00:00Z"); // Senin 10.00 WIB
const clockAt = (offsetDays = 0) => ({
  now: new Date(NOW.getTime() + offsetDays * DAY_MS),
  holidays: new Set<string>(),
});

let mongod: MongoMemoryServer;
let users: Awaited<ReturnType<typeof seed>>["users"];

/** Permohonan lean berdasarkan resi (wajib ada). */
async function stored(resi: string): Promise<ApplicationData> {
  const app = await Application.findOne({ resi }).lean<ApplicationData>();
  if (!app) throw new Error(`Permohonan ${resi} tidak ada`);
  return app;
}

beforeAll(async () => {
  // Kunci NIK (lib/pii.ts) diturunkan dari rahasia ini.
  process.env.SESSION_SECRET ??= "rahasia-tes-integrasi-minimal-32-karakter";
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri("resi-test");
  await dbConnect();
  ({ users } = await seed({ now: NOW, password: "rahasia-demo", log: () => {} }));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

const actor = (role: Role): Actor => {
  const u = users.find((x) => x.role === role)!;
  return { id: String(u._id), name: u.name, role: u.role };
};

let nikSeq = 0;
/** NIK valid & unik (lahir 15-05-1990) agar tidak terkena aturan permohonan ganda. */
const uniqueNik = () => `3299011505900${String((nikSeq += 1)).padStart(3, "0")}`;

/** Input "Selesaikan tahap" yang sah: semua syarat selesai tahap berjalan dicentang + bukti. */
async function completeInput(resi: string): Promise<ActionInput> {
  const step = (await stored(resi)).steps.find((s) => !s.completedAt)!;
  return {
    action: "complete",
    checked: step.checklist,
    evidence: step.evidenceLabel ? "BUKTI-0001" : undefined,
  };
}

/** Permohonan lewat loket (tanpa OTP); jalur online diuji terpisah di "pengaman pengajuan online". */
async function newApplication(clock = clockAt()) {
  return createApplication({
    input: {
      serviceSlug: "akta-kelahiran",
      channel: "loket",
      applicant: { name: "Uji Coba", phone: "081200009999", email: "", nik: uniqueNik() },
      requirementsChecked: ["Kartu Keluarga orang tua", "bukan syarat resmi"],
      consent: false,
    },
    actor: actor("petugas_loket"),
    clock,
  });
}

describe("seed", () => {
  it("NIK data demo lolos aturan pengajuan (tanggal lahir valid, pemohon ≥17 tahun)", async () => {
    const apps = await Application.find().select("+applicant.nikEnc serviceSlug").lean<ApplicationData[]>();
    const bad = apps.filter((a) => !checkNik(decryptNik(a.applicant.nikEnc ?? ""), a.serviceSlug, NOW).ok);
    expect(bad.map((a) => a.resi)).toEqual([]);
  });

  it("membuat data dengan status beragam dan tanggal mundur yang dipertahankan", async () => {
    const apps = await Application.find().lean();
    expect(apps).toHaveLength(60);

    const statuses = new Set(apps.map((a) => a.status));
    for (const s of ["diajukan", "diproses", "selesai", "perlu_perbaikan", "ditolak"])
      expect(statuses).toContain(s);

    const oldest = Math.min(...apps.map((a) => new Date(a.createdAt).getTime()));
    expect(NOW.getTime() - oldest).toBeGreaterThan(20 * DAY_MS);
    expect(apps.every((a) => new Date(a.createdAt) <= NOW)).toBe(true);

    expect(apps.some((a) => a.rating?.score)).toBe(true);
    expect(apps.some((a) => a.escalations.length > 0)).toBe(true);
  });

  it("resi demo ada dengan kondisi yang dijanjikan", async () => {
    const byResi = Object.fromEntries(
      (await Application.find({ resi: /^RL-HJ26-/ }).lean<ApplicationData[]>()).map((a) => [a.resi, a]),
    );
    expect(byResi["RL-HJ26-AKTA"].status).toBe("diproses");
    expect(NOW.getTime() - Number(byResi["RL-HJ26-AKTA"].currentDueAt)).toBeGreaterThan(0);
    expect(byResi["RL-HJ26-AKTA"].escalations.map((e) => e.level)).toEqual([1]);
    expect(byResi["RL-HJ26-AKTA"].applicant.phone.endsWith("1234")).toBe(true);

    expect(byResi["RL-HJ26-PRBK"].status).toBe("perlu_perbaikan");
    expect(byResi["RL-HJ26-SLSE"].status).toBe("selesai");
    expect(byResi["RL-HJ26-SLSE"].rating).toBeNull();
    expect(byResi["RL-HJ26-TLAK"].status).toBe("ditolak");
    expect(byResi["RL-HJ26-TLAK"].rejectionReason).toBeTruthy();
    expect(byResi["RL-HJ26-DTNG"].status).toBe("menunggu_kedatangan");
    expect(byResi["RL-HJ26-DTNG"].currentDueAt).toBeNull();
    expect(byResi["RL-HJ26-DTNG"].escalations).toEqual([]);
  });

  it("NIK tidak disimpan apa adanya: hash & sandi tersembunyi, tampilan hanya tersamar", async () => {
    const app = await stored("RL-HJ26-AKTA");
    expect(app.applicant.nikHash).toBeUndefined();
    expect(app.applicant.nikEnc).toBeUndefined();
    expect(app.applicant.nikMasked).toMatch(/^\d{4} \d{2}•• •••• \d{4}$/);

    const full = await Application.findOne({ resi: "RL-HJ26-AKTA" })
      .select("+applicant.nikHash +applicant.nikEnc")
      .lean<ApplicationData>();
    const nik = decryptNik(full!.applicant.nikEnc!);
    expect(nik).toMatch(/^\d{16}$/);
    expect(full!.applicant.nikHash).toBe(hashNik(nik));
    // Tidak ada NIK 16 digit di dokumen mana pun.
    expect(
      JSON.stringify(await Application.find().select("+applicant.nikHash +applicant.nikEnc").lean()),
    ).not.toMatch(/"\d{16}"/);
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
        input: {
          serviceSlug: "tidak-ada",
          channel: "online",
          applicant: { name: "X Y Z", phone: "081200000000", nik: uniqueNik() },
          requirementsChecked: [],
          consent: true,
        },
        actor: null,
        clock: clockAt(),
      }),
    ).rejects.toThrow(/Layanan tidak ditemukan/);
  });

  it("riwayat permohonan tidak berubah saat template layanan diubah", async () => {
    const app = await newApplication();
    await Service.updateOne(
      { slug: "akta-kelahiran" },
      { $set: { "steps.1.slaHours": 10, "steps.1.name": "Diganti" } },
    );
    const saved = await stored(app.resi);
    expect(saved.steps[1]).toMatchObject({ name: "Entri & validasi data", slaHours: 2 });
    await Service.updateOne(
      { slug: "akta-kelahiran" },
      { $set: { "steps.1.slaHours": 2, "steps.1.name": "Entri & validasi data" } },
    );
  });
});

describe("pengajuan KTP-el", () => {
  const ktp: NonNullable<ApplicationInput["applicant"]["ktp"]> = {
    birthPlace: "HARAPAN JAYA",
    bloodType: "O",
    address: "JL. MELATI NO. 12",
    rtRw: "003/005",
    village: "SUKAMAJU",
    district: "HARAPAN BARU",
    religion: "ISLAM",
    marital: "BELUM KAWIN",
    job: "PELAJAR/MAHASISWA",
  };
  const submit = (nik: string, extra: { ktp?: typeof ktp } = { ktp }) =>
    createApplication({
      input: {
        serviceSlug: "perekaman-ktp-el",
        channel: "loket",
        applicant: { name: "Dewi Lestari", phone: "081200001111", email: "", nik, ...extra },
        requirementsChecked: [],
        consent: false,
      },
      actor: actor("petugas_loket"),
      clock: clockAt(),
    });

  it("menyimpan isi KTP + tanggal lahir & jenis kelamin dari NIK, tanpa bocor ke tampilan publik", async () => {
    const app = await submit("3299014503070001"); // 05-03-2007, perempuan (45 = 5 + 40)
    expect(app.applicant.ktp).toMatchObject({ ...ktp, birthDate: "05-03-2007", gender: "PEREMPUAN" });
    expect(JSON.stringify(publicView(app, clockAt()))).not.toContain("SUKAMAJU");
  });

  it("menolak tanpa data KTP, NIK bertanggal tidak valid, atau belum 17 tahun & belum kawin", async () => {
    await expect(submit("3299014503070001", {})).rejects.toMatchObject({ status: 422 });
    await expect(submit("3299019913070001")).rejects.toMatchObject({
      fields: { "applicant.nik": expect.any(String) },
    });
    // 01-01-2012: 14 tahun pada 19 Okt 2026.
    await expect(submit("3299010101120001")).rejects.toMatchObject({
      fields: { "applicant.ktp.marital": expect.stringContaining("17 tahun") },
    });
    await expect(submit("3299010101120001", { ktp: { ...ktp, marital: "KAWIN" } })).resolves.toBeTruthy();
  });
});

describe("pengaman pengajuan online", () => {
  const input = (nik: string, phone: string, extra: Partial<ApplicationInput> = {}): ApplicationInput => ({
    serviceSlug: "akta-kelahiran",
    channel: "online",
    applicant: { name: "Rina Wati", phone, email: "", nik },
    requirementsChecked: [],
    consent: true,
    ...extra,
  });
  /** Alur warga: kirim kode → isi kode → permohonan dibuat. */
  async function submitOnline(data: ApplicationInput) {
    const otp = await startVerification({ input: data, clock: clockAt() });
    return createApplication({
      input: { ...data, otp: { id: otp.otpId, code: otp.code } },
      actor: null,
      clock: clockAt(),
    });
  }

  it("wajib OTP yang benar, sekali pakai", async () => {
    const data = input(uniqueNik(), "081277770001");
    await expect(createApplication({ input: data, actor: null, clock: clockAt() })).rejects.toMatchObject({
      fields: { otp: expect.any(String) },
    });
    const otp = await startVerification({ input: data, clock: clockAt() });
    const wrong = otp.code === "000000" ? "111111" : "000000";
    await expect(
      createApplication({
        input: { ...data, otp: { id: otp.otpId, code: wrong } },
        actor: null,
        clock: clockAt(),
      }),
    ).rejects.toMatchObject({ fields: { otp: expect.stringContaining("Sisa") } });
    const ok = { ...data, otp: { id: otp.otpId, code: otp.code } };
    await expect(createApplication({ input: ok, actor: null, clock: clockAt() })).resolves.toBeTruthy();
    // Kode yang sama tidak bisa dipakai ulang (mis. untuk NIK lain atau pengajuan kedua).
    await expect(createApplication({ input: ok, actor: null, clock: clockAt() })).rejects.toMatchObject({
      status: 422,
    });
  });

  it("menolak pemohon di bawah 17 tahun, pernyataan tidak dicentang, dan permohonan ganda", async () => {
    // 01-01-2012: 14 tahun.
    await expect(
      startVerification({ input: input("3299010101120002", "081277770002"), clock: clockAt() }),
    ).rejects.toMatchObject({ fields: { "applicant.nik": expect.stringContaining("minimal 17 tahun") } });
    await expect(
      startVerification({ input: input(uniqueNik(), "081277770002", { consent: false }), clock: clockAt() }),
    ).rejects.toMatchObject({ fields: { consent: expect.any(String) } });

    const nik = uniqueNik();
    await submitOnline(input(nik, "081277770003"));
    const second = submitOnline(input(nik, "081277770004"));
    await expect(second).rejects.toMatchObject({ status: 409 });
    // Pesan tidak membocorkan resi atau data permohonan yang sudah ada.
    await expect(second).rejects.toThrow(/^(?!.*RL-).*masih berjalan/);
  });

  it(`maksimal ${DAILY_ONLINE_LIMIT} pengajuan online per nomor HP per hari`, async () => {
    const phone = "081277770009";
    for (let i = 0; i < DAILY_ONLINE_LIMIT; i += 1) await submitOnline(input(uniqueNik(), phone));
    await expect(
      startVerification({ input: input(uniqueNik(), phone), clock: clockAt() }),
    ).rejects.toMatchObject({
      status: 429,
    });
  });
});

describe("lupa resi", () => {
  it("daftar resi hanya keluar setelah OTP ke nomor yang didaftarkan; data tak cocok tetap dapat kode", async () => {
    const app = await newApplication();
    const nik = decryptNik(
      (await Application.findById(app._id).select("+applicant.nikEnc").lean<ApplicationData>())!.applicant
        .nikEnc!,
    );
    const phone = app.applicant.phone;

    // NIK benar, HP salah: kode tetap dikirim (tidak membocorkan), tapi hasilnya kosong.
    const other = await recoverResi({ nik, phone: "081299990000" });
    const empty = await recoverResi({
      nik,
      phone: "081299990000",
      otp: { id: other.otp!.otpId, code: other.otp!.code },
    });
    expect(empty.applications).toEqual([]);

    const sent = await recoverResi({ nik, phone });
    expect(sent.applications).toBeUndefined();
    await expect(
      recoverResi({ nik, phone, otp: { id: sent.otp!.otpId, code: "12345x" } }),
    ).rejects.toBeTruthy();
    const found = await recoverResi({ nik, phone, otp: { id: sent.otp!.otpId, code: sent.otp!.code } });
    expect(found.applications?.map((a) => a.resi)).toEqual([app.resi]);
  });
});

describe("eskalasi saat dibaca", () => {
  it("idempoten walau 5 request membaca bersamaan", async () => {
    const app = await newApplication();
    const later = clockAt(2).now; // tahap verifikasi (1 hari kerja) sudah lewat

    const copies = await Promise.all(Array.from({ length: 5 }, () => stored(app.resi)));
    await Promise.all(copies.map((copy) => syncEscalations(copy, later, new Set<string>())));
    await syncOverdue(later, new Set<string>());

    const saved = await stored(app.resi);
    expect(saved.escalations.map((e) => e.level)).toEqual([1]);
    expect(await Event.countDocuments({ applicationId: saved._id, action: "escalated" })).toBe(1);
    expect(copies.every((c) => c.escalations.length === 1)).toBe(true);
  });

  it("menyelesaikan tahap yang terlambat mencatat eskalasi dulu lalu menandainya selesai", async () => {
    const app = await newApplication();
    const updated = await performAction({
      resi: app.resi,
      input: await completeInput(app.resi),
      actor: actor("petugas_loket"),
      clock: clockAt(2),
    });
    expect(updated.escalations).toHaveLength(1);
    expect(updated.escalations[0].resolvedAt).toEqual(clockAt(2).now);
    expect(updated.status).toBe("diproses");
  });
});

describe("aksi petugas", () => {
  it("tahap hanya bisa diselesaikan dengan syarat selesai lengkap; dasarnya tercatat di audit log", async () => {
    const app = await newApplication();
    const loket = actor("petugas_loket");
    const step = (await stored(app.resi)).steps[0];
    // Verifikasi: persyaratan layanan ikut menjadi syarat selesai.
    expect(step.checklist).toContain("Berkas asli diperiksa: Kartu Keluarga orang tua");

    const done = (checked: string[]) =>
      performAction({
        resi: app.resi,
        input: { action: "complete", checked },
        actor: loket,
        clock: clockAt(),
      });
    await expect(done([])).rejects.toMatchObject({ status: 422, fields: { checked: expect.any(String) } });
    await expect(done(step.checklist.slice(1))).rejects.toMatchObject({ status: 422 });

    const saved = await done(step.checklist);
    expect(saved.steps[0].checked).toEqual(step.checklist);
    const event = await Event.findOne({ applicationId: saved._id, action: "complete" }).lean();
    expect(event?.payload?.checked).toEqual(step.checklist);
  });

  it("tahap dengan bukti wajib menolak bukti kosong", async () => {
    const app = await newApplication();
    for (const role of ["petugas_loket", "petugas_teknis", "pimpinan"] as const) {
      await performAction({
        resi: app.resi,
        input: await completeInput(app.resi),
        actor: actor(role),
        clock: clockAt(),
      });
    }
    const printing = (await stored(app.resi)).steps[3];
    expect(printing.evidenceLabel).toBe("Nomor akta");
    await expect(
      performAction({
        resi: app.resi,
        input: { action: "complete", checked: printing.checklist, evidence: "  " },
        actor: actor("petugas_teknis"),
        clock: clockAt(),
      }),
    ).rejects.toMatchObject({ fields: { evidence: "Nomor akta wajib diisi." } });
  });

  it("menolak peran yang bukan pemilik tahap", async () => {
    const app = await newApplication();
    await expect(
      performAction({
        resi: app.resi,
        input: await completeInput(app.resi),
        actor: actor("petugas_teknis"),
        clock: clockAt(),
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("dua petugas menyelesaikan tahap yang sama bersamaan: hanya satu yang berhasil", async () => {
    const app = await newApplication();
    const input = await completeInput(app.resi);
    const results = await Promise.allSettled(
      [actor("petugas_loket"), actor("petugas_loket")].map((a) =>
        performAction({ resi: app.resi, input, actor: a, clock: clockAt() }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const saved = await stored(app.resi);
    expect(saved.currentStep).toBe(1);
    expect(await Event.countDocuments({ applicationId: saved._id, action: "complete" })).toBe(1);
  });

  it("warga mengirim perbaikan → status kembali berjalan, lalu rating setelah selesai", async () => {
    const app = await newApplication();
    const loket = actor("petugas_loket");
    await performAction({
      resi: app.resi,
      input: { action: "request_fix", publicNote: "Lampirkan KK" },
      actor: loket,
      clock: clockAt(),
    });
    const resumed = await performCitizenAction({
      resi: app.resi,
      input: { action: "resubmit" },
      clock: clockAt(1),
    });
    expect(resumed.status).toBe("diajukan");
    expect(resumed.steps[0].pausedMs).toBe(DAY_MS);

    for (const role of [
      "petugas_loket",
      "petugas_teknis",
      "pimpinan",
      "petugas_teknis",
      "petugas_loket",
    ] as const) {
      await performAction({
        resi: app.resi,
        input: await completeInput(app.resi),
        actor: actor(role),
        clock: clockAt(1),
      });
    }
    const rated = await performCitizenAction({
      resi: app.resi,
      input: { action: "rate", score: 5 },
      clock: clockAt(1),
    });
    expect(rated.status).toBe("selesai");
    expect(rated.rating?.score).toBe(5);
  });
});

describe("mode demo", () => {
  it("reset jam membatalkan eskalasi simulasi, tapi audit log tetap", async () => {
    const app = await newApplication(clockAt());
    await advanceClock(3 * DAY_MS);
    expect((await getSystem()).clockOffsetMs).toBe(3 * DAY_MS);

    // Jam sistem +3 hari → eskalasi tercatat dengan tanggal "masa depan".
    const future = new Date(Date.now() + 3 * DAY_MS);
    const lean = await stored(app.resi);
    await syncEscalations(lean, future, new Set<string>());
    expect((await stored(app.resi)).escalations.length).toBeGreaterThan(0);

    expect(await resetClock()).toBeGreaterThanOrEqual(1);
    expect((await getSystem()).clockOffsetMs).toBe(0);
    expect((await stored(app.resi)).escalations).toEqual([]);
    expect(await Event.countDocuments({ applicationId: lean._id, action: "escalated" })).toBeGreaterThan(0);
  });
});

describe("audit log append-only", () => {
  it("events tidak bisa diubah atau dihapus lewat model", async () => {
    const event = (await Event.findOne())!;
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
    const load = () => stored(app.resi);
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
    // Janji Permendagri 19/2018: sebagian besar dokumen demo terbit ≤ 1 hari kerja setelah berkas lengkap.
    expect(stats.overall.issued).toBeGreaterThan(10);
    expect(stats.overall.promiseRate).toBeGreaterThan(0.5);
    expect(stats.overall.avgIssueHours).toBeGreaterThan(0);
    expect(stats.services.every((s) => s.issueTargetHours! <= 8)).toBe(true);

    const open = openEscalations(apps, NOW);
    expect(open.some((e) => e.resi === "RL-HJ26-AKTA")).toBe(true);
    // Satu baris per tahap: tahap yang sudah level 2 tidak muncul lagi sebagai level 1.
    const keys = open.map((e) => `${e.resi}|${e.stepName}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(open.some((e) => e.level === 2)).toBe(true);
  });
});

describe("batas kedatangan (layanan wajib hadir)", () => {
  it("pendaftaran yang tidak didatangi dibatalkan otomatis, sekali saja, dan NIK-nya bisa mendaftar lagi", async () => {
    const later = new Date(NOW.getTime() + 20 * DAY_MS);
    await syncOverdue(later);
    await syncOverdue(later); // idempoten
    const app = await stored("RL-HJ26-DTNG");
    expect(app.status).toBe("ditolak");
    expect(app.rejectionReason).toMatch(/kedaluwarsa/);
    expect(await Event.countDocuments({ applicationId: app._id, action: "expired" })).toBe(1);
  });
});

describe("tindak lanjut eskalasi", () => {
  it("pimpinan menanggapi eskalasi terbuka; tersimpan, tercatat sekali, dan tampil di dashboard", async () => {
    const app = await newApplication(clockAt(-5)); // tenggat verifikasi sudah lewat > 1 hari kerja
    const input = { publicNote: "Sudah dialihkan ke petugas lain hari ini.", promiseHours: 8 as const };
    await expect(
      followUpEscalation({ resi: app.resi, input, actor: actor("petugas_loket"), clock: clockAt() }),
    ).rejects.toMatchObject({ code: "forbidden" });

    const saved = await followUpEscalation({
      resi: app.resi,
      input,
      actor: actor("pimpinan"),
      clock: clockAt(),
    });
    expect(saved.escalations.map((e) => e.level)).toEqual([1, 2]);
    expect(saved.escalations.every((e) => e.response?.note === input.publicNote)).toBe(true);
    expect(publicView(saved, clockAt()).steps[0].followUp?.target).toBe("Kepala Bidang");
    expect(await Event.countDocuments({ applicationId: saved._id, action: "follow_up" })).toBe(1);
    const row = openEscalations([await stored(app.resi)], NOW)[0];
    expect(row.respondedAt).toEqual(NOW);

    await expect(
      followUpEscalation({ resi: app.resi, input, actor: actor("pimpinan"), clock: clockAt() }),
    ).rejects.toMatchObject({ code: "invalid_state" });
  });
});

describe("batas perbaikan berkas", () => {
  it("berkas yang tidak dilengkapi 10 hari kerja dibatalkan otomatis, sekali saja, tahapnya tetap utuh", async () => {
    const app = await newApplication();
    await performAction({
      resi: app.resi,
      input: { action: "request_fix", publicNote: "Lampirkan KK" },
      actor: actor("petugas_loket"),
      clock: clockAt(),
    });
    const later = new Date(NOW.getTime() + 20 * DAY_MS);
    await syncOverdue(later);
    await syncOverdue(later); // idempoten
    const saved = await stored(app.resi);
    expect(saved.status).toBe("ditolak");
    expect(saved.rejectionReason).toMatch(/tidak dilengkapi/);
    expect(saved.steps[0]).toMatchObject({
      key: "verifikasi",
      pausedAt: null,
      publicNote: saved.rejectionReason,
    });
    expect(saved.steps[0].checklist.length).toBeGreaterThan(0);
    expect(await Event.countDocuments({ applicationId: saved._id, action: "fix_expired" })).toBe(1);
    await expect(
      performCitizenAction({
        resi: app.resi,
        input: { action: "resubmit" },
        clock: { now: later, holidays: new Set() },
      }),
    ).rejects.toMatchObject({ code: "invalid_state" });
  });
});
