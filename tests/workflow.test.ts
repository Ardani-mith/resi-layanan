import { describe, expect, it } from "vitest";
import { pendingEscalations } from "@/lib/escalation";
import { publicView, staffView } from "@/lib/present";
import { DAY_MS } from "@/lib/sla";
import {
  type Action,
  type Actor,
  type ApplicationData,
  applyAction,
  applyFollowUp,
  applyRating,
  arrivalDeadline,
  buildApplication,
  canActOn,
  expireArrival,
  EXPIRED_REASON,
  expireFix,
  FIX_EXPIRED_REASON,
  fixDeadline,
  type ServiceData,
  statusForStep,
  WorkflowError,
} from "@/lib/workflow";

const wib = (s: string) => new Date(`${s}+07:00`);
const HOUR = 3600_000;

const service = {
  _id: "svc1" as unknown as ServiceData["_id"],
  name: "Akta Kelahiran",
  slug: "akta-kelahiran",
  requirements: ["Surat keterangan lahir"],
  steps: [
    // Jam kerja: 8 = 1 hari kerja (jam yang sama di hari kerja berikutnya).
    { key: "verifikasi", name: "Verifikasi berkas", role: "petugas_loket", slaHours: 8 },
    { key: "entri", name: "Entri data", role: "petugas_teknis", slaHours: 16 },
    { key: "persetujuan", name: "Persetujuan", role: "pimpinan", slaHours: 8 },
    { key: "penyerahan", name: "Siap diambil", role: "petugas_loket", slaHours: null },
  ],
} satisfies Pick<ServiceData, "_id" | "name" | "slug" | "requirements" | "steps">;
const loket: Actor = { id: "u1", name: "Rina", role: "petugas_loket" };
const teknis: Actor = { id: "u2", name: "Dimas", role: "petugas_teknis" };
const pimpinan: Actor = { id: "u3", name: "Hendra", role: "pimpinan" };

const T0 = wib("2026-10-12T09:00:00"); // Senin

function newApp() {
  return buildApplication({
    service,
    applicant: {
      name: "Siti Rahmawati",
      phone: "081234561234",
      email: null,
      nikHash: "hash-rahasia",
      nikEnc: "v1.sandi.rahasia",
      nikMasked: "3299 12•• •••• 9012",
    },
    channel: "online",
    resi: "RL-HJ26-AKTA",
    now: T0,
  });
}

const act = (
  app: ApplicationData,
  action: Action,
  actor: Actor,
  now: Date,
  notes: { publicNote?: string; internalNote?: string } = {},
) => applyAction(app, { action, actor, now, ...notes });

describe("statusForStep", () => {
  it("tahap pertama diajukan, terakhir siap_diambil, tengah diproses, lewat = selesai", () => {
    expect([0, 1, 2, 3, 4].map((i) => statusForStep(i, 4))).toEqual([
      "diajukan",
      "diproses",
      "diproses",
      "siap_diambil",
      "selesai",
    ]);
  });
});

describe("layanan wajib hadir (pendaftaran online)", () => {
  const awaiting = () =>
    buildApplication({
      service,
      applicant: { name: "Nadia", phone: "081200002468", email: null, nikMasked: "3299 12•• •••• 9012" },
      channel: "online",
      resi: "RL-HJ26-DTNG",
      now: T0,
      awaitVisit: true,
    });

  it("belum ada tenggat & eskalasi sebelum warga datang, berapa lama pun", () => {
    const app = awaiting();
    expect(app.status).toBe("menunggu_kedatangan");
    expect(app.steps[0].startedAt).toBeNull();
    expect(app.currentDueAt).toBeNull();
    expect(pendingEscalations(app, new Date(T0.getTime() + 30 * DAY_MS))).toEqual([]);
    expect(publicView(app, { now: new Date(T0.getTime() + 30 * DAY_MS) }).isLate).toBe(false);
  });

  it("hanya petugas loket yang mencatat kedatangan; tahap lain belum bisa diproses", () => {
    const app = awaiting();
    expect(canActOn(app, "petugas_loket")).toBe(true);
    expect(canActOn(app, "petugas_teknis")).toBe(false);
    expect(() => act(app, "complete", loket, T0)).toThrow(WorkflowError);
  });

  it("warga hadir → tahap verifikasi mulai dengan tenggat sejak kedatangan", () => {
    const app = awaiting();
    const arrived = wib("2026-10-14T10:00:00"); // Rabu, dua hari setelah daftar
    const { payload } = act(app, "arrive", loket, arrived);
    expect(payload).toMatchObject({ from: "menunggu_kedatangan", to: "diajukan" });
    expect(app.steps[0].startedAt).toEqual(arrived);
    expect(app.steps[0].dueAt).toEqual(wib("2026-10-15T10:00:00"));
    expect(app.currentDueAt).toEqual(app.steps[0].dueAt);
    expect(() => act(app, "arrive", loket, arrived)).toThrow(WorkflowError);
  });

  it("batas kedatangan 10 hari kerja; lewat itu dibatalkan otomatis dengan alasan untuk warga", () => {
    const app = awaiting();
    const deadline = arrivalDeadline(T0);
    expect(deadline).toEqual(wib("2026-10-26T09:00:00")); // Senin 2 minggu kemudian, jam yang sama
    expect(expireArrival(app, new Date(deadline.getTime() - 1))).toBeNull();
    const entry = expireArrival(app, deadline);
    expect(entry?.action).toBe("expired");
    expect(app.status).toBe("ditolak");
    expect(app.rejectionReason).toBe(EXPIRED_REASON);
    expect(app.completedAt).toEqual(deadline);
    expect(expireArrival(app, deadline)).toBeNull(); // sudah final
  });

  it("yang sudah datang tidak ikut dibatalkan", () => {
    const app = awaiting();
    act(app, "arrive", loket, T0);
    expect(expireArrival(app, new Date(T0.getTime() + 30 * DAY_MS))).toBeNull();
  });

  it("pendaftaran bisa ditolak sebelum warga datang", () => {
    const app = awaiting();
    act(app, "reject", loket, T0, { publicNote: "Data tidak sesuai KK." });
    expect(app.status).toBe("ditolak");
  });
});

describe("alur normal", () => {
  it("permohonan baru: tahap 1 berjalan dengan tenggat, sisanya menunggu", () => {
    const app = newApp();
    expect(app.status).toBe("diajukan");
    expect(app.steps[0].startedAt).toEqual(T0);
    expect(app.steps[0].dueAt).toEqual(wib("2026-10-13T09:00:00"));
    expect(app.currentDueAt).toEqual(app.steps[0].dueAt);
    expect(app.steps.slice(1).every((s) => s.startedAt === null)).toBe(true);
  });

  it("complete berpindah tahap dan menghitung tenggat tahap berikutnya", () => {
    const app = newApp();
    const event = act(app, "complete", loket, wib("2026-10-12T11:00:00"), {
      publicNote: "Berkas lengkap",
      internalNote: "cek manual",
    });

    expect(event).toEqual({
      action: "complete",
      payload: { stepKey: "verifikasi", from: "diajukan", to: "diproses", publicNote: "Berkas lengkap" },
    });
    expect(app.steps[0]).toMatchObject({
      handledByName: "Rina",
      publicNote: "Berkas lengkap",
      internalNote: "cek manual",
    });
    expect(app.currentStep).toBe(1);
    expect(app.steps[1].dueAt).toEqual(wib("2026-10-14T11:00:00"));
    expect(app.currentDueAt).toEqual(app.steps[1].dueAt);
  });

  it("sampai selesai: siap_diambil tanpa tenggat, lalu selesai", () => {
    const app = newApp();
    act(app, "complete", loket, wib("2026-10-12T11:00:00"));
    act(app, "complete", teknis, wib("2026-10-13T11:00:00"));
    act(app, "complete", pimpinan, wib("2026-10-14T11:00:00"));
    expect(app.status).toBe("siap_diambil");
    expect(app.currentDueAt).toBeNull();

    act(app, "complete", loket, wib("2026-10-16T11:00:00"));
    expect(app.status).toBe("selesai");
    expect(app.completedAt).toEqual(wib("2026-10-16T11:00:00"));
    expect(() => act(app, "complete", loket, wib("2026-10-16T12:00:00"))).toThrow(WorkflowError);
  });
});

describe("perlu perbaikan", () => {
  it("wajib catatan publik; SLA dijeda dan kembali utuh setelah warga memperbaiki", () => {
    const app = newApp();
    expect(() => act(app, "request_fix", loket, wib("2026-10-12T10:00:00"))).toThrow(/diperbaiki/);

    act(app, "request_fix", loket, wib("2026-10-12T10:00:00"), { publicNote: "Lampirkan buku nikah" });
    expect(app.status).toBe("perlu_perbaikan");
    expect(app.currentDueAt).toBeNull();
    expect(() => act(app, "complete", loket, wib("2026-10-12T11:00:00"))).toThrow(/tidak sedang berjalan/);

    act(app, "resume", { id: null, name: "Warga", role: "warga" }, wib("2026-10-15T10:00:00")); // jeda 3 hari
    expect(app.status).toBe("diajukan");
    expect(app.steps[0].pausedMs).toBe(3 * DAY_MS);
    expect(app.steps[0].dueAt).toEqual(wib("2026-10-16T09:00:00"));
    expect(app.currentDueAt).toEqual(app.steps[0].dueAt);
  });

  it("resume hanya dari perlu_perbaikan", () => {
    expect(() => act(newApp(), "resume", loket, T0)).toThrow(/menunggu perbaikan/);
  });
});

describe("ditolak", () => {
  it("wajib alasan, alasan tampil ke warga, permohonan final", () => {
    const app = newApp();
    expect(() => act(app, "reject", loket, T0, { publicNote: "   " })).toThrow(/Alasan/);

    act(app, "reject", loket, wib("2026-10-12T10:00:00"), { publicNote: "Di luar wilayah" });
    expect(app.status).toBe("ditolak");
    expect(app.rejectionReason).toBe("Di luar wilayah");
    expect(app.currentDueAt).toBeNull();
    expect(() => act(app, "complete", loket, T0)).toThrow(WorkflowError);

    const view = publicView(app, { now: wib("2026-10-20T10:00:00") });
    expect(view.rejectionReason).toBe("Di luar wilayah");
    expect(view.steps[0].state).toBe("ditolak");
    expect(view.steps[1].state).toBe("dibatalkan");
    expect(view.isLate).toBe(false);
  });

  it("bisa menolak permohonan yang sedang dijeda", () => {
    const app = newApp();
    act(app, "request_fix", loket, wib("2026-10-12T10:00:00"), { publicNote: "x" });
    act(app, "reject", loket, wib("2026-10-13T10:00:00"), { publicNote: "Tidak dilengkapi" });
    expect(app.status).toBe("ditolak");
    expect(app.steps[0].pausedAt).toBeNull();
  });
});

describe("hak akses tahap", () => {
  it("hanya peran pemilik tahap; pimpinan & admin tidak bisa menindak tahap peran lain", () => {
    const app = newApp();
    expect(canActOn(app, "petugas_loket")).toBe(true);
    expect(canActOn(app, "petugas_teknis")).toBe(false);
    expect(canActOn(app, "pimpinan")).toBe(false);
    expect(canActOn(app, "admin")).toBe(false);
    act(app, "complete", loket, wib("2026-10-12T10:00:00"));
    expect(canActOn(app, "petugas_loket")).toBe(false);
    expect(canActOn(app, "petugas_teknis")).toBe(true);
    act(app, "complete", teknis, wib("2026-10-13T10:00:00"));
    expect(canActOn(app, "pimpinan")).toBe(true);
    act(app, "complete", pimpinan, wib("2026-10-14T10:00:00"));
    // Setelah menyetujui, pimpinan tidak bisa ikut menyelesaikan tahap berikutnya.
    expect(canActOn(app, "pimpinan")).toBe(false);
  });
});

describe("rating", () => {
  it("hanya setelah selesai dan hanya sekali", () => {
    const app = newApp();
    expect(() => applyRating(app, { score: 5, now: T0 })).toThrow(/setelah/);
    act(app, "complete", loket, wib("2026-10-12T11:00:00"));
    act(app, "complete", teknis, wib("2026-10-13T11:00:00"));
    act(app, "complete", pimpinan, wib("2026-10-14T11:00:00"));
    act(app, "complete", loket, wib("2026-10-15T11:00:00"));
    applyRating(app, { score: 4, comment: " ok ", now: wib("2026-10-15T12:00:00") });
    expect(app.rating).toMatchObject({ score: 4, comment: "ok" });
    expect(() => applyRating(app, { score: 5, now: T0 })).toThrow(/sudah/);
  });
});

describe("eskalasi (logika murni)", () => {
  it("tidak ada eskalasi sebelum tenggat", () => {
    expect(pendingEscalations(newApp(), wib("2026-10-13T08:59:00"))).toEqual([]);
  });

  it("lewat tenggat → level 1 (Kasi); lewat 1 hari kerja lagi → level 2 (Kabid)", () => {
    const app = newApp(); // tenggat verifikasi: Selasa 13 Okt 09.00
    const late1 = pendingEscalations(app, wib("2026-10-13T10:00:00"));
    expect(late1.map((e) => [e.stepKey, e.level, e.target])).toEqual([["verifikasi", 1, "Kepala Seksi"]]);

    // Selasa 09.00 + 8 jam kerja = Rabu 14 Okt 09.00
    expect(pendingEscalations(app, wib("2026-10-14T08:59:00")).map((e) => e.level)).toEqual([1]);
    expect(pendingEscalations(app, wib("2026-10-14T09:01:00")).map((e) => e.level)).toEqual([1, 2]);
  });

  it("akhir pekan tidak mempercepat eskalasi level 2", () => {
    const friday = buildApplication({
      service,
      applicant: { name: "A B", phone: "0812", email: null },
      channel: "online",
      resi: "x",
      now: wib("2026-10-15T09:00:00"),
    });
    // Tenggat Jumat 16 Okt 09.00; Senin 08.59 = 3 hari kalender tapi belum 8 jam kerja.
    expect(pendingEscalations(friday, wib("2026-10-19T08:59:00")).map((e) => e.level)).toEqual([1]);
    expect(pendingEscalations(friday, wib("2026-10-19T09:01:00")).map((e) => e.level)).toEqual([1, 2]);
  });

  it("libur ikut dihitung pada ambang level 2", () => {
    const app = newApp();
    // Rabu 14 Okt libur: ambang level 2 bergeser ke Kamis 09.00.
    expect(pendingEscalations(app, wib("2026-10-14T09:01:00"), ["2026-10-14"]).map((e) => e.level)).toEqual([
      1,
    ]);
    expect(pendingEscalations(app, wib("2026-10-15T09:01:00"), ["2026-10-14"]).map((e) => e.level)).toEqual([
      1, 2,
    ]);
  });

  it("idempoten: yang sudah tercatat tidak dihitung lagi", () => {
    const app = newApp();
    const now = wib("2026-10-13T10:00:00");
    app.escalations.push(...pendingEscalations(app, now));
    expect(pendingEscalations(app, now)).toEqual([]);
  });

  it("tidak ada eskalasi saat dijeda atau final", () => {
    const paused = newApp();
    act(paused, "request_fix", loket, wib("2026-10-12T10:00:00"), { publicNote: "x" });
    expect(pendingEscalations(paused, wib("2026-10-30T10:00:00"))).toEqual([]);

    const rejected = newApp();
    act(rejected, "reject", loket, wib("2026-10-12T10:00:00"), { publicNote: "x" });
    expect(pendingEscalations(rejected, wib("2026-10-30T10:00:00"))).toEqual([]);
  });

  it("menyelesaikan tahap menandai eskalasinya selesai", () => {
    const app = newApp();
    const now = wib("2026-10-13T10:00:00");
    app.escalations.push(...pendingEscalations(app, now));
    act(app, "complete", loket, now);
    expect(app.escalations[0].resolvedAt).toEqual(now);
  });
});

describe("tampilan publik vs petugas", () => {
  it("publik: nama disamarkan, tanpa HP/NIK/catatan internal", () => {
    const app = newApp();
    act(app, "complete", loket, wib("2026-10-12T11:00:00"), {
      publicNote: "Lengkap",
      internalNote: "RAHASIA",
    });
    const view = publicView(app, { now: wib("2026-10-12T12:00:00") });
    const json = JSON.stringify(view);

    expect(view.applicantMasked).toBe("Si*** R***");
    expect(json).not.toContain("Siti Rahmawati");
    expect(json).not.toContain("081234561234");
    expect(json).not.toContain("hash-rahasia");
    expect(json).not.toContain("v1.sandi.rahasia");
    expect(json).not.toContain("RAHASIA");
    expect(json).not.toContain("Rina");
    expect(view.steps[0].publicNote).toBe("Lengkap");
  });

  it("petugas melihat catatan internal, tapi NIK tetap tidak", () => {
    const app = newApp();
    act(app, "complete", loket, wib("2026-10-12T11:00:00"), { internalNote: "RAHASIA" });
    const json = JSON.stringify(staffView(app, { now: wib("2026-10-12T12:00:00") }));
    expect(json).toContain("RAHASIA");
    expect(json).toContain("081234561234");
    expect(json).not.toContain("3299123456789012");
    // Yang tampil hanya NIK tersamar (kode wilayah + 4 digit terakhir).
    expect(json).toContain("3299 12•• •••• 9012");
  });

  it("isLate & estimasi mengikuti waktu sekarang", () => {
    const app = newApp();
    expect(publicView(app, { now: wib("2026-10-12T12:00:00") }).isLate).toBe(false);
    const late = publicView(app, { now: wib("2026-10-13T12:00:00") });
    expect(late.isLate).toBe(true);
    expect(late.steps[0].state).toBe("terlambat");
  });
});

describe("batas perbaikan berkas", () => {
  it("10 hari kerja sejak diminta perbaikan; lewat itu dibatalkan, jeda ditutup, eskalasi selesai", () => {
    const app = newApp();
    const late = wib("2026-10-13T10:00:00"); // tenggat verifikasi Selasa 09.00 sudah lewat
    app.escalations.push(...pendingEscalations(app, late));
    act(app, "request_fix", loket, late, { publicNote: "Lampirkan KK" });
    const deadline = fixDeadline(late);
    expect(deadline).toEqual(wib("2026-10-27T10:00:00"));
    expect(publicView(app, { now: late }).fixDeadline).toEqual(deadline);

    expect(expireFix(app, new Date(deadline.getTime() - 1))).toBeNull();
    const entry = expireFix(app, deadline);
    expect(entry).toMatchObject({
      action: "fix_expired",
      payload: { from: "perlu_perbaikan", to: "ditolak" },
    });
    expect(app.status).toBe("ditolak");
    expect(app.rejectionReason).toBe(FIX_EXPIRED_REASON);
    expect(app.completedAt).toEqual(deadline);
    expect(app.steps[0].pausedAt).toBeNull();
    expect(app.escalations.every((e) => e.resolvedAt)).toBe(true);
    expect(expireFix(app, deadline)).toBeNull(); // sudah final
  });

  it("yang sudah dilengkapi tidak ikut dibatalkan", () => {
    const app = newApp();
    act(app, "request_fix", loket, wib("2026-10-12T10:00:00"), { publicNote: "x" });
    act(app, "resume", loket, wib("2026-10-13T10:00:00"));
    expect(expireFix(app, new Date(T0.getTime() + 30 * DAY_MS))).toBeNull();
  });
});

describe("tindak lanjut eskalasi", () => {
  const overdue = () => {
    const app = newApp();
    app.escalations.push(...pendingEscalations(app, wib("2026-10-13T10:00:00")));
    return app;
  };
  const followUp = (app: ApplicationData, actor: Actor, extra = {}) =>
    applyFollowUp(app, {
      actor,
      publicNote: "Petugas kami sedang cuti, sudah dialihkan.",
      now: T1,
      ...extra,
    });
  const T1 = wib("2026-10-13T11:00:00");

  it("hanya pimpinan, dan hanya bila ada eskalasi terbuka", () => {
    expect(() => followUp(overdue(), loket)).toThrow(/pimpinan/);
    expect(() => followUp(newApp(), pimpinan)).toThrow(/Tidak ada eskalasi/);
    expect(() => applyFollowUp(overdue(), { actor: pimpinan, publicNote: " ", now: T1 })).toThrow(
      WorkflowError,
    );
  });

  it("tanggapan & janji tampil ke warga tanpa nama pimpinan atau arahan internal", () => {
    const app = overdue();
    const { action, payload } = followUp(app, pimpinan, { internalNote: "ARAHAN-INTERNAL", promiseHours: 8 });
    expect(action).toBe("follow_up");
    expect(payload).toMatchObject({ stepKey: "verifikasi", levels: [1] });
    expect(app.escalations[0].response?.promisedAt).toEqual(wib("2026-10-14T11:00:00"));
    // Tenggat SLA tidak berubah: keterlambatan tetap tercatat.
    expect(app.steps[0].dueAt).toEqual(wib("2026-10-13T09:00:00"));

    const view = publicView(app, { now: T1 });
    expect(view.steps[0].followUp).toMatchObject({ target: "Kepala Seksi", note: expect.any(String) });
    const json = JSON.stringify(view);
    expect(json).not.toContain("Hendra");
    expect(json).not.toContain("ARAHAN-INTERNAL");
    expect(() => followUp(app, pimpinan)).toThrow(/Tidak ada eskalasi/); // sudah ditanggapi
  });

  it("naik ke Kepala Bidang = perlu ditanggapi lagi", () => {
    const app = overdue();
    followUp(app, pimpinan);
    app.escalations.push(...pendingEscalations(app, wib("2026-10-14T10:00:00")));
    expect(app.escalations.map((e) => e.level)).toEqual([1, 2]);
    expect(followUp(app, pimpinan).payload).toMatchObject({ levels: [2] });
    expect(publicView(app, { now: T1 }).steps[0].followUp?.target).toBe("Kepala Bidang");
  });
});
