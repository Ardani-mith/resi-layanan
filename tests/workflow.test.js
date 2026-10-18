import { describe, expect, it } from "vitest";
import { pendingEscalations } from "@/lib/escalation";
import { publicView, staffView } from "@/lib/present";
import { DAY_MS } from "@/lib/sla";
import { applyAction, applyRating, buildApplication, canActOn, statusForStep, WorkflowError } from "@/lib/workflow";

const wib = (s) => new Date(`${s}+07:00`);
const HOUR = 3600_000;

const service = {
  _id: "svc1",
  name: "Akta Kelahiran",
  slug: "akta-kelahiran",
  requirements: ["Surat keterangan lahir"],
  steps: [
    { key: "verifikasi", name: "Verifikasi berkas", role: "petugas_loket", slaDays: 1 },
    { key: "entri", name: "Entri data", role: "petugas_teknis", slaDays: 2 },
    { key: "persetujuan", name: "Persetujuan", role: "pimpinan", slaDays: 1 },
    { key: "penyerahan", name: "Siap diambil", role: "petugas_loket", slaDays: null },
  ],
};
const loket = { id: "u1", name: "Rina", role: "petugas_loket" };
const teknis = { id: "u2", name: "Dimas", role: "petugas_teknis" };
const pimpinan = { id: "u3", name: "Hendra", role: "pimpinan" };

const T0 = wib("2026-10-12T09:00:00"); // Senin

function newApp() {
  return buildApplication({
    service,
    applicant: { name: "Siti Rahmawati", phone: "081234561234", email: null, nik: "3299123456789012" },
    channel: "online",
    resi: "RL-HJ26-AKTA",
    now: T0,
  });
}

const act = (app, action, actor, now, notes = {}) => applyAction(app, { action, actor, now, ...notes });

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
    const event = act(app, "complete", loket, wib("2026-10-12T11:00:00"), { publicNote: "Berkas lengkap", internalNote: "cek manual" });

    expect(event).toEqual({
      action: "complete",
      payload: { stepKey: "verifikasi", from: "diajukan", to: "diproses", publicNote: "Berkas lengkap" },
    });
    expect(app.steps[0]).toMatchObject({ handledByName: "Rina", publicNote: "Berkas lengkap", internalNote: "cek manual" });
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
  it("peran harus cocok dengan tahap; pimpinan & admin selalu boleh", () => {
    const app = newApp();
    expect(canActOn(app, "petugas_loket")).toBe(true);
    expect(canActOn(app, "petugas_teknis")).toBe(false);
    expect(canActOn(app, "pimpinan")).toBe(true);
    expect(canActOn(app, "admin")).toBe(true);
    act(app, "complete", loket, wib("2026-10-12T10:00:00"));
    expect(canActOn(app, "petugas_loket")).toBe(false);
    expect(canActOn(app, "petugas_teknis")).toBe(true);
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

  it("lewat tenggat → level 1 (Kasi); lewat 3 hari kerja → level 2 (Kabid)", () => {
    const app = newApp(); // tenggat verifikasi: Selasa 13 Okt 09.00
    const late1 = pendingEscalations(app, wib("2026-10-13T10:00:00"));
    expect(late1.map((e) => [e.stepKey, e.level, e.target])).toEqual([["verifikasi", 1, "Kepala Seksi"]]);

    // Selasa + 3 hari kerja = Jumat 16 Okt 09.00
    expect(pendingEscalations(app, wib("2026-10-16T08:59:00")).map((e) => e.level)).toEqual([1]);
    expect(pendingEscalations(app, wib("2026-10-16T09:01:00")).map((e) => e.level)).toEqual([1, 2]);
  });

  it("akhir pekan tidak mempercepat eskalasi level 2", () => {
    const friday = buildApplication({ service, applicant: { name: "A B", phone: "0812" }, channel: "online", resi: "x", now: wib("2026-10-15T09:00:00") });
    // Tenggat Jumat 16 Okt 09.00; Senin 19 Okt = 3 hari kalender tapi baru 1 hari kerja.
    expect(pendingEscalations(friday, wib("2026-10-19T10:00:00")).map((e) => e.level)).toEqual([1]);
    expect(pendingEscalations(friday, wib("2026-10-21T09:01:00")).map((e) => e.level)).toEqual([1, 2]);
  });

  it("libur ikut dihitung pada ambang level 2", () => {
    const app = newApp();
    expect(pendingEscalations(app, wib("2026-10-16T09:01:00"), ["2026-10-14"]).map((e) => e.level)).toEqual([1]);
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
    act(app, "complete", loket, wib("2026-10-12T11:00:00"), { publicNote: "Lengkap", internalNote: "RAHASIA" });
    const view = publicView(app, { now: wib("2026-10-12T12:00:00") });
    const json = JSON.stringify(view);

    expect(view.applicantMasked).toBe("Si*** R***");
    expect(json).not.toContain("Siti Rahmawati");
    expect(json).not.toContain("081234561234");
    expect(json).not.toContain("3299123456789012");
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
  });

  it("isLate & estimasi mengikuti waktu sekarang", () => {
    const app = newApp();
    expect(publicView(app, { now: wib("2026-10-12T12:00:00") }).isLate).toBe(false);
    const late = publicView(app, { now: wib("2026-10-13T12:00:00") });
    expect(late.isLate).toBe(true);
    expect(late.steps[0].state).toBe("terlambat");
  });
});
