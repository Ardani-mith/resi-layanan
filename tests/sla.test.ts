import { describe, expect, it } from "vitest";
import {
  addWorkdays,
  computeDueAt,
  DAY_MS,
  estimateCompletion,
  finishedLate,
  isOverdue,
  isWorkday,
  nowWithOffset,
  pauseStep,
  remainingMs,
  resumeStep,
  stepState,
  wibDateKey,
  workedMs,
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

  it("tenggat = mulai + SLA hari kerja", () => {
    expect(computeDueAt(wib("2026-10-15T09:00:00"), 3)).toEqual(wib("2026-10-20T09:00:00"));
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

  it("setelah dilanjutkan, tenggat bergeser sebesar lama jeda dan sisa waktu utuh", () => {
    const step: TestStep = {
      startedAt: wib("2026-10-12T10:00:00"),
      dueAt: wib("2026-10-14T10:00:00"),
      pausedMs: 0,
    };
    pauseStep(step, wib("2026-10-13T10:00:00"));
    resumeStep(step, wib("2026-10-16T10:00:00")); // jeda 3 hari

    expect(step.pausedAt).toBeNull();
    expect(step.pausedMs).toBe(3 * DAY_MS);
    expect(step.dueAt).toEqual(wib("2026-10-17T10:00:00"));
    expect(remainingMs(step, wib("2026-10-16T10:00:00"))).toBe(DAY_MS);
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
    expect(step.dueAt).toEqual(wib("2026-10-15T16:00:00"));
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
  const steps = (): (TestStep & { slaDays: number | null })[] => [
    {
      slaDays: 1,
      startedAt: wib("2026-10-12T10:00:00"),
      dueAt: wib("2026-10-13T10:00:00"),
      completedAt: wib("2026-10-12T15:00:00"),
    },
    {
      slaDays: 2,
      startedAt: wib("2026-10-12T15:00:00"),
      dueAt: wib("2026-10-14T15:00:00"),
      completedAt: null,
    },
    { slaDays: 3, startedAt: null, dueAt: null, completedAt: null },
    { slaDays: null, startedAt: null, dueAt: null, completedAt: null },
  ];

  it("tenggat tahap berjalan + SLA tahap berikutnya (hari kerja)", () => {
    // Rabu 14 Okt 15.00 + 3 hari kerja = Senin 19 Okt 15.00
    expect(estimateCompletion(steps(), 1, wib("2026-10-13T09:00:00"))).toEqual(wib("2026-10-19T15:00:00"));
  });

  it("jika sudah terlambat, dihitung dari sekarang", () => {
    // Kamis 15 Okt 09.00 + 3 hari kerja = Selasa 20 Okt 09.00
    expect(estimateCompletion(steps(), 1, wib("2026-10-15T09:00:00"))).toEqual(wib("2026-10-20T09:00:00"));
  });

  it("null saat dijeda atau sudah selesai", () => {
    const paused = steps();
    paused[1].pausedAt = wib("2026-10-13T09:00:00");
    expect(estimateCompletion(paused, 1, wib("2026-10-13T10:00:00"))).toBeNull();
    expect(estimateCompletion(steps(), 0, wib("2026-10-13T10:00:00"))).toBeNull();
  });
});
