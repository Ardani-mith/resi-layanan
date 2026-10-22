import { describe, expect, it } from "vitest";
import {
  addWorkdays,
  addWorkHours,
  computeDueAt,
  DAY_MS,
  estimateCompletion,
  finishedLate,
  isOverdue,
  issuePromise,
  isWorkday,
  nowWithOffset,
  pauseStep,
  remainingMs,
  resumeStep,
  stepState,
  wibDateKey,
  workedMs,
  workMsBetween,
} from "@/lib/sla";
import type { Step } from "@/lib/workflow";

// Semua waktu ditulis dalam WIB agar tes tidak bergantung pada zona waktu mesin.
const wib = (s: string) => new Date(`${s}+07:00`);

/** Tahap uji: hanya field waktu yang dipakai fungsi SLA. */
type TestStep = Partial<Step>;
const HOUR = 3600_000;

describe("hari kerja (WIB)", () => {
  it("Senin–Jumat hari kerja, Sabtu–Minggu bukan", () => {
    expect(isWorkday(wib("2026-10-16T10:00:00"))).toBe(true); // Jumat
    expect(isWorkday(wib("2026-10-17T10:00:00"))).toBe(false); // Sabtu
    expect(isWorkday(wib("2026-10-18T10:00:00"))).toBe(false); // Minggu
  });

  it("memakai tanggal WIB, bukan UTC: Sabtu 05.00 WIB = Jumat 22.00 UTC tetap Sabtu", () => {
    const saturdayEarly = wib("2026-10-17T05:00:00");
    expect(saturdayEarly.getUTCDay()).toBe(5); // di UTC masih Jumat
    expect(wibDateKey(saturdayEarly)).toBe("2026-10-17");
    expect(isWorkday(saturdayEarly)).toBe(false);
  });

  it("tanggal libur bukan hari kerja (array maupun Set)", () => {
    const christmas = wib("2026-12-25T09:00:00");
    expect(isWorkday(christmas)).toBe(true);
    expect(isWorkday(christmas, ["2026-12-25"])).toBe(false);
    expect(isWorkday(christmas, new Set(["2026-12-25"]))).toBe(false);
  });
});

describe("addWorkdays", () => {
  it("menambah hari kerja dengan jam yang sama", () => {
    expect(addWorkdays(wib("2026-10-12T10:00:00"), 2)).toEqual(wib("2026-10-14T10:00:00"));
  });

  it("melompati akhir pekan: Jumat + 1 = Senin", () => {
    expect(addWorkdays(wib("2026-10-16T10:00:00"), 1)).toEqual(wib("2026-10-19T10:00:00"));
  });

  it("pengajuan di akhir pekan: Sabtu + 1 = Senin", () => {
    expect(addWorkdays(wib("2026-10-17T10:00:00"), 1)).toEqual(wib("2026-10-19T10:00:00"));
  });

  it("melompati libur: Kamis 24 Des + 1 dengan 25 Des libur = Senin 28 Des", () => {
    expect(addWorkdays(wib("2026-12-24T10:00:00"), 1, ["2026-12-25"])).toEqual(wib("2026-12-28T10:00:00"));
  });

  it("0 hari = waktu awal", () => {
    expect(addWorkdays(wib("2026-10-16T10:00:00"), 0)).toEqual(wib("2026-10-16T10:00:00"));
  });

  it("menerima string tanggal", () => {
    expect(addWorkdays("2026-10-16T03:00:00Z", 1)).toEqual(new Date("2026-10-19T03:00:00Z"));
  });
});

describe("computeDueAt", () => {
  it("null untuk tahap tanpa SLA atau belum dimulai", () => {
    expect(computeDueAt(wib("2026-10-12T10:00:00"), null)).toBeNull();
    expect(computeDueAt(wib("2026-10-12T10:00:00"), 0)).toBeNull();
    expect(computeDueAt(null, 2)).toBeNull();
  });

  it("tenggat = mulai + SLA jam kerja", () => {
    expect(computeDueAt(wib("2026-10-15T09:00:00"), 3)).toEqual(wib("2026-10-15T12:00:00"));
    // Kamis 09.00 + 10 jam kerja: 7 jam di Kamis, 3 jam di Jumat → Jumat 11.00
    expect(computeDueAt(wib("2026-10-15T09:00:00"), 10)).toEqual(wib("2026-10-16T11:00:00"));
  });
});

describe("jam kerja (Senin–Jumat 08.00–16.00 WIB)", () => {
  it("melewati jam pulang: Senin 15.00 + 2 jam kerja = Selasa 09.00", () => {
    expect(addWorkHours(wib("2026-10-12T15:00:00"), 2)).toEqual(wib("2026-10-13T09:00:00"));
  });

  it("di luar jam kerja mulai dari jam buka berikutnya", () => {
    expect(addWorkHours(wib("2026-10-12T06:30:00"), 1)).toEqual(wib("2026-10-12T09:00:00")); // pagi
    expect(addWorkHours(wib("2026-10-12T20:00:00"), 1)).toEqual(wib("2026-10-13T09:00:00")); // malam
    expect(addWorkHours(wib("2026-10-16T17:00:00"), 1)).toEqual(wib("2026-10-19T09:00:00")); // Jumat sore
    expect(addWorkHours(wib("2026-10-17T10:00:00"), 1)).toEqual(wib("2026-10-19T09:00:00")); // Sabtu
  });

  it("8 jam kerja = 1 hari kerja dengan jam yang sama", () => {
    expect(addWorkHours(wib("2026-10-16T10:00:00"), 8)).toEqual(wib("2026-10-19T10:00:00"));
  });

  it("melompati libur", () => {
    expect(addWorkHours(wib("2026-12-24T15:00:00"), 2, ["2026-12-25"])).toEqual(wib("2026-12-28T09:00:00"));
  });

  it("workMsBetween hanya menghitung jam kerja", () => {
    expect(workMsBetween(wib("2026-10-12T15:00:00"), wib("2026-10-13T09:00:00"))).toBe(2 * HOUR);
    expect(workMsBetween(wib("2026-10-16T10:00:00"), wib("2026-10-19T10:00:00"))).toBe(8 * HOUR);
    expect(workMsBetween(wib("2026-10-13T09:00:00"), wib("2026-10-12T09:00:00"))).toBe(0);
  });
});

describe("janji terbit ≤ 24 jam setelah berkas lengkap (Permendagri 19/2018)", () => {
  const steps = (issuedAt: string | null): (TestStep & { slaHours: number | null })[] => [
    { slaHours: 8, completedAt: wib("2026-10-12T14:00:00") }, // berkas lengkap Senin 14.00
    { slaHours: 2, completedAt: wib("2026-10-12T15:30:00") },
    { slaHours: 1, completedAt: issuedAt ? wib(issuedAt) : null },
    { slaHours: null, completedAt: null },
  ];

  it("batas = berkas lengkap + 1 hari kerja; ditepati bila terbit sebelum batas", () => {
    const kept = issuePromise(steps("2026-10-13T09:00:00"), wib("2026-10-13T10:00:00"))!;
    expect(kept.dueAt).toEqual(wib("2026-10-13T14:00:00"));
    expect(kept.workMs).toBe(3 * HOUR); // 14.00–16.00 + 08.00–09.00
    expect(kept.kept).toBe(true);
  });

  it("terlewati bila belum terbit setelah batas", () => {
    const late = issuePromise(steps(null), wib("2026-10-13T15:00:00"))!;
    expect(late.issuedAt).toBeNull();
    expect(late.kept).toBe(false);
  });

  it("null sebelum berkas dinyatakan lengkap", () => {
    expect(issuePromise([{ slaHours: 8, completedAt: null }, { slaHours: 2 }], new Date())).toBeNull();
  });
});

describe("status & sisa waktu tahap", () => {
  const running = () => ({
    startedAt: wib("2026-10-12T10:00:00"),
    dueAt: wib("2026-10-14T10:00:00"),
    completedAt: null,
    pausedAt: null,
    pausedMs: 0,
  });

  it("berjalan sebelum tenggat, sisa waktu positif", () => {
    const step = running();
    const now = wib("2026-10-13T10:00:00");
    expect(stepState(step, now)).toBe("berjalan");
    expect(remainingMs(step, now)).toBe(DAY_MS);
    expect(isOverdue(step, now)).toBe(false);
  });

  it("terlambat setelah tenggat, sisa waktu negatif", () => {
    const step = running();
    const now = wib("2026-10-14T12:00:00");
    expect(stepState(step, now)).toBe("terlambat");
    expect(remainingMs(step, now)).toBe(-2 * HOUR);
    expect(isOverdue(step, now)).toBe(true);
  });

  it("tepat di tenggat belum terlambat", () => {
    const step = running();
    expect(isOverdue(step, step.dueAt)).toBe(false);
  });

  it("menunggu jika belum dimulai, selesai jika sudah selesai", () => {
    expect(stepState({ startedAt: null }, new Date())).toBe("menunggu");
    const done = { ...running(), completedAt: wib("2026-10-13T08:00:00") };
    expect(stepState(done, wib("2026-10-20T00:00:00"))).toBe("selesai");
    expect(remainingMs(done, new Date())).toBeNull();
  });

  it("tanpa SLA tidak pernah terlambat", () => {
    const step = { ...running(), dueAt: null };
    expect(remainingMs(step, wib("2027-01-01T00:00:00"))).toBeNull();
    expect(stepState(step, wib("2027-01-01T00:00:00"))).toBe("berjalan");
  });

  it("finishedLate membandingkan completedAt dengan dueAt", () => {
    expect(finishedLate({ ...running(), completedAt: wib("2026-10-14T09:59:00") })).toBe(false);
    expect(finishedLate({ ...running(), completedAt: wib("2026-10-14T10:01:00") })).toBe(true);
    expect(finishedLate(running())).toBe(false);
  });
});

describe("jeda (perlu_perbaikan) tidak dihitung", () => {
  it("hitung mundur beku selama jeda dan tidak bisa jadi terlambat", () => {
    const step: TestStep = {
      startedAt: wib("2026-10-12T10:00:00"),
      dueAt: wib("2026-10-14T10:00:00"),
      pausedMs: 0,
    };
    pauseStep(step, wib("2026-10-13T10:00:00"));

    const muchLater = wib("2026-10-20T10:00:00");
    expect(stepState(step, muchLater)).toBe("dijeda");
    expect(remainingMs(step, muchLater)).toBe(DAY_MS);
    expect(isOverdue(step, muchLater)).toBe(false);
  });

  it("setelah dilanjutkan, sisa JAM KERJA saat dijeda utuh", () => {
    const step: TestStep = {
      startedAt: wib("2026-10-12T10:00:00"),
      dueAt: wib("2026-10-14T10:00:00"),
      pausedMs: 0,
    };
    // Dijeda Selasa 10.00: sisa 6 jam (Selasa) + 2 jam (Rabu) = 8 jam kerja.
    pauseStep(step, wib("2026-10-13T10:00:00"));
    resumeStep(step, wib("2026-10-16T10:00:00")); // dilanjutkan Jumat 10.00

    expect(step.pausedAt).toBeNull();
    expect(step.pausedMs).toBe(3 * DAY_MS);
    expect(step.pausedWorkMs).toBe(24 * HOUR); // 6 + 8 + 8 + 2 jam kerja
    // Jumat 10.00 + 8 jam kerja = Senin 10.00
    expect(step.dueAt).toEqual(wib("2026-10-19T10:00:00"));
  });

  it("jeda berulang diakumulasi; pause ganda tidak menggeser titik jeda", () => {
    const step: TestStep = {
      startedAt: wib("2026-10-12T10:00:00"),
      dueAt: wib("2026-10-14T10:00:00"),
      pausedMs: 0,
    };
    pauseStep(step, wib("2026-10-12T12:00:00"));
    pauseStep(step, wib("2026-10-12T18:00:00"));
    resumeStep(step, wib("2026-10-13T12:00:00")); // 24 jam
    pauseStep(step, wib("2026-10-14T12:00:00"));
    resumeStep(step, wib("2026-10-14T18:00:00")); // 6 jam

    expect(step.pausedMs).toBe(30 * HOUR);
    expect(step.pausedWorkMs).toBe(12 * HOUR); // (4 + 4) + 4 jam kerja
    // Sisa 14 jam kerja → Kamis 10.00; jeda kedua sisa 6 jam → Kamis 08.00 + 6 = 14.00
    expect(step.dueAt).toEqual(wib("2026-10-15T14:00:00"));
  });

  it("resume tanpa jeda tidak mengubah apa pun", () => {
    const step: TestStep = {
      startedAt: wib("2026-10-12T10:00:00"),
      dueAt: wib("2026-10-14T10:00:00"),
      pausedMs: 0,
      pausedAt: null,
    };
    resumeStep(step, wib("2026-10-20T10:00:00"));
    expect(step.dueAt).toEqual(wib("2026-10-14T10:00:00"));
    expect(step.pausedMs).toBe(0);
  });

  it("workedMs tidak menghitung waktu jeda", () => {
    const step: TestStep = {
      startedAt: wib("2026-10-12T10:00:00"),
      completedAt: wib("2026-10-15T10:00:00"),
      pausedMs: DAY_MS,
    };
    expect(workedMs(step)).toBe(2 * DAY_MS);
  });
});

describe("simulasi waktu demo", () => {
  it("nowWithOffset menggeser waktu nyata", () => {
    const real = wib("2026-10-12T10:00:00").getTime();
    expect(nowWithOffset(2 * DAY_MS, real)).toEqual(wib("2026-10-14T10:00:00"));
    expect(nowWithOffset(0, real)).toEqual(new Date(real));
    expect(nowWithOffset(undefined, real)).toEqual(new Date(real));
  });

  it("offset membuat tahap yang semula aman menjadi terlambat", () => {
    const real = wib("2026-10-13T10:00:00").getTime();
    const step: TestStep = {
      startedAt: wib("2026-10-12T10:00:00"),
      dueAt: wib("2026-10-14T10:00:00"),
      pausedMs: 0,
    };
    expect(stepState(step, nowWithOffset(0, real))).toBe("berjalan");
    expect(stepState(step, nowWithOffset(2 * DAY_MS, real))).toBe("terlambat");
  });
});

describe("estimateCompletion", () => {
  const steps = (): (TestStep & { slaHours: number | null })[] => [
    {
      slaHours: 1,
      startedAt: wib("2026-10-12T10:00:00"),
      dueAt: wib("2026-10-13T10:00:00"),
      completedAt: wib("2026-10-12T15:00:00"),
    },
    {
      slaHours: 2,
      startedAt: wib("2026-10-12T15:00:00"),
      dueAt: wib("2026-10-14T15:00:00"),
      completedAt: null,
    },
    { slaHours: 3, startedAt: null, dueAt: null, completedAt: null },
    { slaHours: null, startedAt: null, dueAt: null, completedAt: null },
  ];

  it("tenggat tahap berjalan + SLA tahap berikutnya (jam kerja)", () => {
    // Rabu 14 Okt 15.00 + 3 jam kerja = Kamis 15 Okt 10.00
    expect(estimateCompletion(steps(), 1, wib("2026-10-13T09:00:00"))).toEqual(wib("2026-10-15T10:00:00"));
  });

  it("jika sudah terlambat, dihitung dari sekarang", () => {
    // Kamis 15 Okt 09.00 + 3 jam kerja = 12.00
    expect(estimateCompletion(steps(), 1, wib("2026-10-15T09:00:00"))).toEqual(wib("2026-10-15T12:00:00"));
  });

  it("null saat dijeda atau sudah selesai", () => {
    const paused = steps();
    paused[1].pausedAt = wib("2026-10-13T09:00:00");
    expect(estimateCompletion(paused, 1, wib("2026-10-13T10:00:00"))).toBeNull();
    expect(estimateCompletion(steps(), 0, wib("2026-10-13T10:00:00"))).toBeNull();
  });
});
