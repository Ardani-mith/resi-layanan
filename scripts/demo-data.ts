// Data demo Disdukcapil Kota Harapan Jaya (instansi fiktif).
// Permohonan dibuat dengan MENJALANKAN alur kerja sungguhan (workflow.ts) pada waktu
// mundur, jadi timeline, keterlambatan, eskalasi, dan audit log-nya konsisten.

import type { Types } from "mongoose";
import { ESCALATION_LEVELS, escalationThreshold, pendingEscalations } from "../src/lib/escalation.ts";
import type { Role } from "../src/lib/roles.ts";
import { addWorkHours, DAY_MS, type Holidays, isWorkday } from "../src/lib/sla.ts";
import {
  type Action,
  type Applicant,
  type ApplicationData,
  applyAction,
  applyRating,
  buildApplication,
  type Channel,
  type ServiceData,
  type Step,
} from "../src/lib/workflow.ts";
import type { EventData, UserData } from "../src/models.ts";

type ServiceSeed = Omit<ServiceData, "_id" | "isActive">;
type DemoUser = Pick<UserData, "_id" | "name" | "role">;
type DemoApp = Omit<ApplicationData, "resi"> & { resi: string | null };
type DemoEvent = Omit<EventData, "applicationId">;
type Rng = () => number;
type Notes = { publicNote?: string; internalNote?: string };

export const HOLIDAYS = ["2026-12-25", "2027-01-01"];

export const SERVICES: ServiceSeed[] = [
  {
    name: "Perekaman KTP-el",
    slug: "perekaman-ktp-el",
    order: 1,
    description:
      "Perekaman data biometrik (foto, sidik jari, iris) dan penerbitan KTP elektronik untuk warga yang baru berusia 17 tahun atau belum pernah merekam.",
    output: "KTP elektronik",
    requirements: [
      "Kartu Keluarga (asli)",
      "Berusia minimal 17 tahun, atau sudah/pernah kawin",
      "Hadir langsung untuk perekaman biometrik",
    ],
    steps: [
      { key: "verifikasi", name: "Verifikasi berkas", role: "petugas_loket", slaHours: 8 },
      { key: "perekaman", name: "Perekaman biometrik", role: "petugas_teknis", slaHours: 4 },
      { key: "pencetakan", name: "Pencetakan KTP-el", role: "petugas_teknis", slaHours: 2 },
      { key: "penyerahan", name: "Siap diambil di loket", role: "petugas_loket", slaHours: null },
    ],
  },
  {
    name: "Perubahan Kartu Keluarga",
    slug: "perubahan-kk",
    order: 2,
    description:
      "Pembaruan data Kartu Keluarga karena peristiwa kependudukan: kelahiran, kematian, perkawinan, perceraian, atau pindah datang.",
    output: "Kartu Keluarga baru",
    requirements: [
      "Kartu Keluarga lama (asli)",
      "Dokumen bukti perubahan (akta kelahiran, buku nikah, akta kematian, atau surat pindah)",
      "KTP-el kepala keluarga",
    ],
    steps: [
      { key: "verifikasi", name: "Verifikasi berkas", role: "petugas_loket", slaHours: 8 },
      { key: "entri", name: "Entri & validasi data", role: "petugas_teknis", slaHours: 2 },
      { key: "persetujuan", name: "Persetujuan & tanda tangan elektronik", role: "pimpinan", slaHours: 1 },
      { key: "pencetakan", name: "Pencetakan Kartu Keluarga", role: "petugas_teknis", slaHours: 1 },
      { key: "penyerahan", name: "Siap diambil di loket", role: "petugas_loket", slaHours: null },
    ],
  },
  {
    name: "Akta Kelahiran",
    slug: "akta-kelahiran",
    order: 3,
    description: "Penerbitan kutipan akta kelahiran untuk anak yang lahir di wilayah Kota Harapan Jaya.",
    output: "Kutipan akta kelahiran",
    requirements: [
      "Surat keterangan lahir dari rumah sakit, puskesmas, atau bidan",
      "Kartu Keluarga orang tua",
      "KTP-el kedua orang tua",
      "Buku nikah atau akta perkawinan orang tua",
      "KTP-el dua orang saksi",
    ],
    steps: [
      { key: "verifikasi", name: "Verifikasi berkas", role: "petugas_loket", slaHours: 8 },
      { key: "entri", name: "Entri & validasi data", role: "petugas_teknis", slaHours: 2 },
      { key: "persetujuan", name: "Persetujuan & tanda tangan elektronik", role: "pimpinan", slaHours: 1 },
      { key: "pencetakan", name: "Pencetakan akta", role: "petugas_teknis", slaHours: 1 },
      { key: "penyerahan", name: "Siap diambil di loket", role: "petugas_loket", slaHours: null },
    ],
  },
];

export const USERS: { name: string; email: string; role: Role; unit: string }[] = [
  { name: "Admin Sistem", email: "admin@resi.demo", role: "admin", unit: "Bidang PIAK" },
  { name: "Rina Kusumawati", email: "loket@resi.demo", role: "petugas_loket", unit: "Loket Pelayanan" },
  { name: "Yusuf Hidayat", email: "loket2@resi.demo", role: "petugas_loket", unit: "Loket Pelayanan" },
  {
    name: "Dimas Prasetyo",
    email: "teknis@resi.demo",
    role: "petugas_teknis",
    unit: "Seksi Pengolahan Data",
  },
  {
    name: "Lestari Wulandari",
    email: "teknis2@resi.demo",
    role: "petugas_teknis",
    unit: "Seksi Pengolahan Data",
  },
  { name: "Drs. Hendra Gunawan", email: "pimpinan@resi.demo", role: "pimpinan", unit: "Kepala Dinas" },
];

// prettier-ignore
const FIRST = [
  "Siti", "Budi", "Ahmad", "Dewi", "Rizky", "Nur", "Agus", "Fitri", "Andi", "Putri", "Hendra", "Ayu",
  "Fajar", "Indah", "Bayu", "Maya", "Rudi", "Sri", "Taufik", "Wulan", "Eko", "Ratna", "Joko", "Lina",
  "Arif", "Yuni", "Galih", "Nadia",
];
// prettier-ignore
const LAST = [
  "Rahmawati", "Santoso", "Hidayat", "Lestari", "Pratama", "Aini", "Setiawan", "Handayani",
  "Saputra", "Maharani", "Kurniawan", "Anggraini", "Nugroho", "Permata", "Wibowo", "Susanti",
  "Firmansyah", "Puspita", "Hakim", "Utami",
];

const FIX_NOTES = [
  "Fotokopi buku nikah orang tua belum dilampirkan. Silakan unggah ulang atau bawa ke loket.",
  "Foto surat keterangan lahir buram, nama bayi tidak terbaca. Mohon kirim ulang yang jelas.",
  "Nama di KK lama berbeda dengan KTP-el. Lampirkan surat keterangan beda nama dari kelurahan.",
];
const REJECT_NOTES = [
  "Alamat pada KK berada di luar wilayah Kota Harapan Jaya. Silakan ajukan ke Disdukcapil domisili Anda.",
  "Pemohon sudah memiliki KTP-el aktif. Untuk KTP rusak/hilang gunakan layanan penggantian.",
];
const COMMENTS = [
  "Prosesnya jelas, saya tahu harus menunggu sampai kapan.",
  "Lebih cepat dari perkiraan. Terima kasih petugas loket.",
  "Sempat terlambat sehari, tapi statusnya selalu ter-update.",
  "Tidak perlu bolak-balik tanya ke kantor lagi.",
  null,
];

/** PRNG deterministik (mulberry32) supaya data demo sama setiap kali di-seed. */
function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR_MS = 3600_000;
const WIB_OFFSET_MS = 7 * HOUR_MS;

/** Jam kerja WIB 08.00–15.00 pada hari kerja, sekitar n hari kalender sebelum `now`. */
function officeTime(now: Date, daysAgo: number, rng: Rng, holidays: Holidays): Date {
  let t = new Date(now.getTime() - daysAgo * DAY_MS);
  while (!isWorkday(t, holidays)) t = new Date(t.getTime() - DAY_MS);
  const wib = new Date(t.getTime() + WIB_OFFSET_MS);
  const midnight = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - WIB_OFFSET_MS;
  const result = new Date(midnight + (8 * 60 + Math.floor(rng() * 7 * 60)) * 60_000);
  return result < now ? result : new Date(now.getTime() - 30 * 60_000);
}

const isOfficeTime = (t: Date, holidays: Holidays) => {
  const hour = new Date(t.getTime() + WIB_OFFSET_MS).getUTCHours();
  return isWorkday(t, holidays) && hour >= 8 && hour < 16;
};
const wibMidnight = (t: Date) => {
  const wib = new Date(t.getTime() + WIB_OFFSET_MS);
  return Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - WIB_OFFSET_MS;
};

/**
 * Geser waktu aksi petugas ke jam kerja (hari kerja 08.00–16.00 WIB). Utamakan mundur
 * ke sore hari kerja sebelumnya ("selesai sore tadi") agar yang tepat waktu tetap tepat
 * waktu; maju ke pagi berikutnya hanya jika mundur melewati `notBefore`. Tidak pernah
 * melewati `notAfter` (waktu "sekarang" seed).
 */
function toOfficeHours(t: Date, rng: Rng, holidays: Holidays, notBefore: Date, notAfter: Date): Date {
  if (isOfficeTime(t, holidays)) return t;

  let back = wibMidnight(t);
  if (new Date(t.getTime() + WIB_OFFSET_MS).getUTCHours() < 16 || !isWorkday(t, holidays)) back -= DAY_MS;
  while (!isWorkday(back + 12 * HOUR_MS, holidays)) back -= DAY_MS;
  const backward = new Date(back + (14 * 60 + Math.floor(rng() * 120)) * 60_000);
  if (!notBefore || backward > notBefore) return backward;

  let fwd = wibMidnight(t);
  if (new Date(t.getTime() + WIB_OFFSET_MS).getUTCHours() >= 8 || !isWorkday(t, holidays)) fwd += DAY_MS;
  while (!isWorkday(fwd + 12 * HOUR_MS, holidays)) fwd += DAY_MS;
  const forward = new Date(fwd + (8 * 60 + Math.floor(rng() * 120)) * 60_000);
  return notAfter && forward > notAfter ? t : forward;
}

function randomPhone(rng: Rng, last4?: string): string {
  let digits = "08" + String(1 + Math.floor(rng() * 9));
  while (digits.length < 8) digits += Math.floor(rng() * 10);
  return digits + (last4 ?? String(Math.floor(rng() * 10_000)).padStart(4, "0"));
}

/**
 * NIK yang lolos `checkNik`: 3299 (Kota Harapan Jaya) + kecamatan + tanggal lahir (perempuan +40)
 * + nomor urut. Pemohon lahir 1965–2005 (selalu ≥17 tahun).
 */
function randomNik(rng: Rng): string {
  const pick = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  const day = pick(1, 28) + (rng() < 0.5 ? 40 : 0);
  return `3299${pad(pick(1, 12))}${pad(day)}${pad(pick(1, 12))}${pad(pick(65, 105) % 100)}${pad(pick(1, 9999), 4)}`;
}

/**
 * Pembangun satu permohonan yang "dijalankan" maju dalam waktu.
 * events[] dikumpulkan dan nanti ditulis dengan applicationId.
 */
class Sim {
  holidays: Holidays;
  limit: Date;
  actors: (role: Role) => DemoUser;
  events: DemoEvent[];
  app: DemoApp;
  time: Date;

  constructor({
    service,
    applicant,
    channel,
    resi,
    createdAt,
    holidays,
    actors,
    creator,
    limit,
  }: {
    service: ServiceSeed & { _id: Types.ObjectId };
    applicant: Applicant;
    channel: Channel;
    resi: string | null;
    createdAt: Date;
    holidays: Holidays;
    actors: (role: Role) => DemoUser;
    creator: DemoUser | null;
    limit: Date;
  }) {
    this.holidays = holidays;
    this.limit = limit;
    this.actors = actors;
    this.events = [];
    this.app = buildApplication({
      service,
      applicant,
      channel,
      resi,
      now: createdAt,
      holidays,
      requirementsChecked: service.requirements,
    });
    this.app.updatedAt = createdAt;
    this.time = createdAt;
    this.events.push({
      actorId: creator?._id ?? null,
      actorName: creator?.name ?? "Warga",
      actorRole: creator?.role ?? "warga",
      action: "created",
      payload: { channel, serviceSlug: service.slug },
      at: createdAt,
    });
  }

  get step(): Step {
    return this.app.steps[this.app.currentStep];
  }

  /** Catat eskalasi yang "terdeteksi" sampai waktu t, dengan createdAt = saat ambang terlewati. */
  escalateUntil(t: Date) {
    for (const esc of pendingEscalations(this.app, t, this.holidays)) {
      const { afterWorkHours } = ESCALATION_LEVELS.find((l) => l.level === esc.level)!;
      const threshold = escalationThreshold(this.step.dueAt!, afterWorkHours, this.holidays);
      const at = new Date(Math.min(threshold.getTime() + 5 * 60_000, t.getTime()));
      this.app.escalations.push({ ...esc, createdAt: at });
      this.events.push({
        actorId: null,
        actorName: "Sistem",
        actorRole: "sistem",
        action: "escalated",
        payload: { stepKey: esc.stepKey, level: esc.level, target: esc.target },
        at,
      });
    }
  }

  act(action: Action, at: Date, notes: Notes = {}) {
    this.escalateUntil(at);
    const actor = this.actors(this.step.role);
    const { payload } = applyAction(this.app, {
      action,
      actor: { id: String(actor._id), name: actor.name, role: actor.role },
      now: at,
      holidays: this.holidays,
      ...notes,
    });
    this.events.push({
      actorId: actor._id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      payload,
      at,
    });
    this.time = at;
    this.app.updatedAt = at;
  }

  citizenResume(at: Date) {
    const { payload } = applyAction(this.app, {
      action: "resume",
      actor: { id: null, name: "Warga", role: "warga" },
      now: at,
      holidays: this.holidays,
    });
    this.events.push({
      actorId: null,
      actorName: "Warga",
      actorRole: "warga",
      action: "resume",
      payload,
      at,
    });
    this.time = at;
    this.app.updatedAt = at;
  }

  rate(score: number, comment: string | null, at: Date) {
    const { payload } = applyRating(this.app, { score, comment: comment ?? undefined, now: at });
    this.events.push({ actorId: null, actorName: "Warga", actorRole: "warga", action: "rated", payload, at });
    this.app.updatedAt = at;
  }

  /** Waktu selesai tahap berjalan: factor × SLA dalam jam kerja (tanpa SLA → 1–4 hari), di jam kerja. */
  finishTime(factor: number, rng: Rng): Date {
    const step = this.step;
    let raw: Date;
    if (step.slaHours && step.startedAt) {
      // Dihitung dari aksi terakhir (mis. warga melengkapi berkas), bukan dari awal tahap.
      const from = step.pausedMs ? this.time : step.startedAt;
      raw = addWorkHours(from, Math.max(0.1, factor * step.slaHours), this.holidays);
    } else {
      raw = new Date(this.time.getTime() + (1 + rng() * 3) * DAY_MS);
    }
    return toOfficeHours(raw, rng, this.holidays, this.time, this.limit);
  }

  /** `hours` jam setelah aksi terakhir, digeser ke jam kerja. */
  later(hours: number, rng: Rng): Date {
    return toOfficeHours(
      new Date(this.time.getTime() + hours * HOUR_MS),
      rng,
      this.holidays,
      this.time,
      this.limit,
    );
  }
}

/** Seluruh data permohonan demo relatif terhadap `now`. */
export function buildDemoApplications({
  services,
  users,
  now,
  holidays = new Set(HOLIDAYS),
  count = 60,
  seed = 2026,
}: {
  services: (ServiceSeed & { _id: Types.ObjectId })[];
  users: DemoUser[];
  now: Date;
  holidays?: Holidays;
  count?: number;
  seed?: number;
}): { app: DemoApp; events: DemoEvent[] }[] {
  const rng = createRng(seed);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rng() * list.length)];
  const byRole = (role: Role) => users.filter((u) => u.role === role);
  const actors = (role: Role) => pick(byRole(role));
  const loket = byRole("petugas_loket");
  const bySlug = Object.fromEntries(services.map((s) => [s.slug, s]));
  const sims: Sim[] = [];

  type Spec = {
    resi?: string | null;
    slug: string;
    name: string;
    last4?: string;
    createdAt?: Date | number;
    channel?: Channel;
  };

  // --- Resi demo tetap: mudah diketik saat presentasi --------------------------
  const makeSim = ({ resi = null, slug, name, last4, createdAt = 0, channel = "online" }: Spec) =>
    new Sim({
      service: bySlug[slug],
      applicant: { name, phone: randomPhone(rng, last4), email: null, nik: randomNik(rng) },
      channel,
      resi,
      createdAt: createdAt instanceof Date ? createdAt : officeTime(now, createdAt, rng, holidays),
      holidays,
      actors,
      creator: channel === "loket" ? loket[0] : null,
      limit: now,
    });
  const fixed = (spec: Spec & { createdAt: number }) => {
    const sim = makeSim(spec);
    sims.push(sim);
    return sim;
  };

  /**
   * Permohonan yang DIJAMIN sedang terlambat di tahap `stepIndex` dengan eskalasi
   * tepat sampai `level`, kapan pun seed dijalankan: tanggal pengajuan dicari mundur
   * hari demi hari sampai kondisinya terpenuhi.
   */
  const lateCase = (spec: Spec, stepIndex: number, level: number, notes: Notes = {}) => {
    // SLA dalam jam kerja: mundur per 30 menit (jam kerja saja) sampai level eskalasinya pas.
    for (let back = 1; back <= 40 * 48; back += 1) {
      const createdAt = new Date(now.getTime() - back * 30 * 60_000);
      if (!isOfficeTime(createdAt, holidays)) continue;
      const sim = makeSim({ ...spec, createdAt });
      for (let i = 0; i < stepIndex; i += 1) {
        sim.act("complete", sim.finishTime(0.3, rng), i === 0 ? notes : {});
      }
      if (sim.time > now) continue;
      if (pendingEscalations(sim.app, now, holidays).length === level) {
        sims.push(sim);
        return sim;
      }
    }
    throw new Error(`Tidak menemukan tanggal untuk kasus terlambat ${spec.resi ?? spec.name}.`);
  };

  // 1) Akta kelahiran terlambat di tahap entri data → eskalasi level 1 (belum level 2).
  lateCase({ resi: "RL-HJ26-AKTA", slug: "akta-kelahiran", name: "Siti Rahmawati", last4: "1234" }, 1, 1, {
    publicNote: "Berkas lengkap dan sesuai.",
  });
  // 2) Perubahan KK menunggu perbaikan dari warga.
  {
    const sim = fixed({
      resi: "RL-HJ26-PRBK",
      slug: "perubahan-kk",
      name: "Budi Santoso",
      last4: "5678",
      createdAt: 2,
    });
    sim.act("request_fix", sim.later(2, rng), { publicNote: FIX_NOTES[2] });
  }
  // 3) KTP-el selesai, belum diberi rating (untuk demo rating).
  {
    const sim = fixed({
      resi: "RL-HJ26-SLSE",
      slug: "perekaman-ktp-el",
      name: "Dewi Lestari",
      last4: "4321",
      createdAt: 12,
      channel: "loket",
    });
    for (const f of [0.4, 0.7, 0.8]) sim.act("complete", sim.finishTime(f, rng));
    sim.act("complete", sim.later(36, rng), { publicNote: "KTP-el sudah diserahkan kepada pemohon." });
  }
  // 4) Ditolak dengan alasan yang terlihat warga.
  {
    const sim = fixed({
      resi: "RL-HJ26-TLAK",
      slug: "perekaman-ktp-el",
      name: "Rizky Pratama",
      last4: "8765",
      createdAt: 5,
    });
    sim.act("reject", sim.later(4, rng), { publicNote: REJECT_NOTES[1] });
  }
  // 5) Kasus terlambat tambahan supaya dashboard pimpinan selalu berisi, termasuk
  //    bottleneck di tahap tanda tangan pimpinan sendiri (level 2 → Kabid).
  lateCase({ slug: "perubahan-kk", name: "Agus Kurniawan" }, 2, 2);
  lateCase({ slug: "akta-kelahiran", name: "Maya Puspita" }, 2, 1);
  lateCase({ slug: "perekaman-ktp-el", name: "Fajar Nugroho", channel: "loket" }, 2, 1);
  lateCase({ slug: "perubahan-kk", name: "Indah Permata" }, 1, 1);

  const FIXED = sims.length;

  // --- Permohonan acak ----------------------------------------------------------
  // 4 terakhir = pengajuan online yang baru masuk (beberapa jam lalu, bisa di luar
  // jam kerja), supaya antrean loket selalu berisi tahap verifikasi yang masih segar.
  const FRESH = 4;
  for (let i = sims.length; i < count; i += 1) {
    const service = pick(services);
    const fresh = i >= count - FRESH;
    const channel: Channel = !fresh && rng() < 0.4 ? "loket" : "online";
    // 8 minggu ke belakang (untuk tren rapor), sedikit condong ke yang baru.
    const daysAgo = fresh ? 0 : 0.2 + rng() ** 1.25 * 56;
    const createdAt = fresh
      ? new Date(now.getTime() - (0.5 + rng() * 6) * HOUR_MS)
      : officeTime(now, daysAgo, rng, holidays);
    const sim = new Sim({
      service,
      applicant: {
        name: `${pick(FIRST)} ${pick(LAST)}`,
        phone: randomPhone(rng),
        email: rng() < 0.5 ? `warga${i}@contoh.id` : null,
        nik: randomNik(rng),
      },
      channel,
      resi: null,
      createdAt,
      holidays,
      actors,
      creator: channel === "loket" ? pick(loket) : null,
      limit: now,
    });
    sims.push(sim);
    if (fresh) continue;

    // Profil kecepatan: sebagian besar tepat waktu, sebagian molor di satu tahap.
    // Permohonan lama lebih sering molor → tren tepat waktu di rapor membaik dari minggu ke minggu.
    // "Macet": sebagian permohonan baru tertahan di satu tahap → bahan dashboard eskalasi.
    const middleStep = () => 1 + Math.floor(rng() * (service.steps.length - 2));
    const slowStep = rng() < 0.12 + 0.45 * (daysAgo / 56) ? middleStep() : -1;
    const stuckStep = daysAgo < 14 && rng() < 0.35 ? middleStep() : -1;

    while (sim.app.status !== "selesai" && sim.app.status !== "ditolak") {
      const index = sim.app.currentStep;

      if (index === 0 && sim.app.status !== "perlu_perbaikan") {
        const roll = rng();
        if (roll < 0.05) {
          const at = sim.finishTime(0.3, rng);
          if (at > now) break;
          sim.act("reject", at, { publicNote: pick(REJECT_NOTES) });
          break;
        }
        if (roll < 0.18) {
          const at = sim.finishTime(0.25, rng);
          if (at > now) break;
          sim.act("request_fix", at, { publicNote: pick(FIX_NOTES) });
          const back = new Date(at.getTime() + (0.5 + rng() * 3) * DAY_MS);
          if (back > now) break;
          sim.citizenResume(back);
        }
      }

      if (index === stuckStep) break;
      const factor = index === slowStep ? 1.3 + rng() * 1.5 : 0.25 + rng() * 0.6;
      const at = sim.finishTime(factor, rng);
      if (at > now) break;
      const isLast = index === sim.app.steps.length - 1;
      sim.act("complete", at, isLast ? { publicNote: "Dokumen sudah diserahkan kepada pemohon." } : {});
    }

    // Tahap yang masih berjalan dan sudah lewat tenggat → eskalasi tercatat.
    sim.escalateUntil(now);

    if (sim.app.status === "selesai" && rng() < 0.7) {
      const score = rng() < 0.6 ? 5 : rng() < 0.7 ? 4 : 3;
      const ratedAt = Math.min(now.getTime(), sim.app.completedAt!.getTime() + rng() * DAY_MS);
      sim.rate(score, pick(COMMENTS), new Date(ratedAt));
    }
  }

  // Eskalasi untuk kasus tetap (resi demo & kasus terlambat).
  for (const sim of sims.slice(0, FIXED)) sim.escalateUntil(now);

  return sims.map((sim) => ({ app: sim.app, events: sim.events }));
}
