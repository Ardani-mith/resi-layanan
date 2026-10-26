// Logika murni (tanpa database): resi & privasi, cn, animasi angka, sesi petugas, perlindungan NIK,
// dan mesin kantor pixel-art.
import { decodeJwt } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { countUpFrame } from "@/components/landing/CountUp";
import { blockedTiles, createActors, findPath, spriteFrame, updateActor } from "@/components/office/engine";
import { WAITING_SEATS, WALKERS } from "@/components/office/layout";
import { distanceKm, OFFICE_TYPES, OFFICES } from "@/config/offices";
import { cn } from "@/lib/cn";
import { signSession, verifySession } from "@/lib/jwt";
import { applicantEmail, notificationFor, sendEmail } from "@/lib/notify";
import { decryptNik, encryptNik, hashNik, protectNik } from "@/lib/pii";
import { emptyOffice, maskName, maskPhone, nikInfo, normalizePhone } from "@/lib/present";
import { generateResi, isValidResi, normalizeResi, RESI_ALPHABET } from "@/lib/resi";
import { SESSION_IDLE_SECONDS, SESSION_MAX_AGE_SECONDS } from "@/lib/roles";
import { applicationSchema, resiSchema } from "@/lib/validators";

describe("resi", () => {
  it("format RL-XXXX-XXXX tanpa O/0/I/1", () => {
    for (let i = 0; i < 500; i += 1) {
      const resi = generateResi();
      expect(resi).toMatch(/^RL-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(resi.slice(3)).not.toMatch(/[O0I1]/);
      expect(isValidResi(resi)).toBe(true);
    }
    expect(RESI_ALPHABET).not.toMatch(/[O0I1]/);
  });

  it("acak, bukan berurutan (tidak ada duplikat dalam 2000 sampel)", () => {
    const set = new Set(Array.from({ length: 2000 }, generateResi));
    expect(set.size).toBe(2000);
  });

  it("menolak format salah dan karakter ambigu", () => {
    for (const bad of [
      "",
      "RL-ABCD",
      "RL-ABCD-EFG",
      "XX-ABCD-EFGH",
      "RL-AB0D-EFGH",
      "RL-ABCD-EFIH",
      "rl-abcd-efgh",
    ]) {
      expect(isValidResi(bad)).toBe(false);
    }
  });

  it("normalisasi input warga yang lupa tanda hubung / huruf kecil / spasi", () => {
    expect(normalizeResi("rl-hj26-akta")).toBe("RL-HJ26-AKTA");
    expect(normalizeResi("RLHJ26AKTA")).toBe("RL-HJ26-AKTA");
    expect(normalizeResi(" hj26 akta ")).toBe("RL-HJ26-AKTA");
    expect(resiSchema.parse("rl hj26-akta")).toBe("RL-HJ26-AKTA");
    expect(resiSchema.safeParse("RL-12").success).toBe(false);
  });
});

describe("privasi", () => {
  it("nama disamarkan", () => {
    expect(maskName("Ardani Setiawan")).toBe("Ar*** S***");
    expect(maskName("Siti Nur Rahmawati")).toBe("Si*** N*** R***");
    expect(maskName("  Budi  ")).toBe("Bu***");
    expect(maskName("")).toBe("***");
  });

  it("nomor HP disamarkan dan dinormalisasi", () => {
    expect(maskPhone("081234567890")).toBe("0812****7890");
    expect(normalizePhone("+62 812-3456-7890")).toBe("081234567890");
    expect(normalizePhone("6281234567890")).toBe("081234567890");
  });

  it("validasi pengajuan: HP & NIK", () => {
    const base = {
      serviceSlug: "akta-kelahiran",
      applicant: { name: "Siti Rahmawati", phone: "+62 812 3456 1234", nik: "3299123456789012" },
    };
    const ok = applicationSchema.parse(base);
    expect(ok.applicant.phone).toBe("081234561234");
    expect(ok.channel).toBe("online");

    const bad = applicationSchema.safeParse({
      ...base,
      applicant: { ...base.applicant, nik: "123", phone: "12345" },
    });
    expect(bad.success).toBe(false);
    const paths = (bad.error?.issues ?? []).map((i) => i.path.join("."));
    expect(paths).toContain("applicant.nik");
    expect(paths).toContain("applicant.phone");
  });
});

describe("cn", () => {
  it("menggabungkan class kondisional", () => {
    expect(cn("a", false && "b", null, undefined, { c: true, d: false })).toBe("a c");
  });

  it("class belakangan menang saat konflik", () => {
    expect(cn("px-4 py-2", "px-6")).toBe("py-2 px-6");
    expect(cn("bg-brand", "bg-late")).toBe("bg-late");
  });

  it("token warna kustom tidak dianggap ukuran font", () => {
    expect(cn("text-sm", "text-muted")).toBe("text-sm text-muted");
    expect(cn("text-muted", "text-late")).toBe("text-late");
    expect(cn("text-lg text-text", "text-sm")).toBe("text-text text-sm");
  });

  it("radius & shadow kustom dikenali", () => {
    expect(cn("rounded-xl", "rounded-card")).toBe("rounded-card");
    expect(cn("shadow-sm", "shadow-card")).toBe("shadow-card");
  });

  it("border warna kustom tidak menabrak lebar border", () => {
    expect(cn("border-2", "border-brand")).toBe("border-2 border-brand");
  });
});

describe("countUpFrame", () => {
  it("nilai akhir persis sama dengan teks asli", () => {
    for (const value of ["66%", "6,8 hari", "4,5/5", "38,0%", "41"]) {
      expect(countUpFrame(value, 1)).toBe(value);
    }
  });

  it("mulai dari nol dengan format & jumlah desimal dipertahankan", () => {
    expect(countUpFrame("6,8 hari", 0)).toBe("0,0 hari");
    expect(countUpFrame("66%", 0)).toBe("0%");
    expect(countUpFrame("4,5/5", 0)).toBe("0,0/0");
  });

  it("desimal berkoma dianimasikan sebagai satu bilangan, bukan dua", () => {
    const mid = countUpFrame("6,8 hari", 0.5);
    expect(mid).toMatch(/^\d,\d hari$/);
    expect(Number(mid.split(" ")[0].replace(",", "."))).toBeLessThan(6.8);
  });
});

describe("notifikasi email", () => {
  const app = {
    resi: "RL-HJ26-AKTA",
    serviceName: "Akta Kelahiran",
    applicant: { name: "Siti Rahmawati", phone: "081234561234", email: "siti@contoh.id" },
    steps: [{ publicNote: "Lampirkan buku nikah orang tua." }],
    currentStep: 0,
    rejectionReason: null,
  } as unknown as Parameters<typeof applicantEmail>[1];

  it("hanya status yang penting bagi warga yang dikirimi email", () => {
    expect(notificationFor("created", { status: "diajukan" })).toBe("created");
    expect(notificationFor("request_fix", { status: "perlu_perbaikan" })).toBe("request_fix");
    expect(notificationFor("complete", { status: "diproses" })).toBeNull();
    expect(notificationFor("complete", { status: "siap_diambil" })).toBe("ready");
    expect(notificationFor("complete", { status: "selesai" })).toBe("completed");
    expect(notificationFor("reject", { status: "ditolak" })).toBe("rejected");
    expect(notificationFor("resume", { status: "diajukan" })).toBeNull();
  });

  it("isi email memuat resi, catatan petugas, dan tautan lacak; tanpa NIK/HP", () => {
    const mail = applicantEmail("request_fix", app, "https://resi.contoh.id")!;
    expect(mail.to).toBe("siti@contoh.id");
    expect(mail.subject).toContain("RL-HJ26-AKTA");
    expect(mail.text).toContain("Lampirkan buku nikah orang tua.");
    expect(mail.text).toContain("https://resi.contoh.id/lacak/RL-HJ26-AKTA");
    expect(mail.text).not.toContain("081234561234");
  });

  it("tanpa email pemohon tidak ada pesan; tanpa kunci Resend hanya dicatat", async () => {
    expect(
      applicantEmail("created", { ...app, applicant: { ...app.applicant, email: null } }, "x"),
    ).toBeNull();
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await sendEmail({ to: "a@b.id", subject: "s", text: "t" })).toBe(false);
    expect(info).toHaveBeenCalledOnce();
    info.mockRestore();
  });
});

describe("nikInfo (pratinjau KTP)", () => {
  const now = new Date("2026-10-20T00:00:00Z");
  it("membaca tanggal lahir & jenis kelamin; tanggal +40 = perempuan", () => {
    expect(nikInfo("3299011203850001", now)).toEqual({ birthDate: "12-03-1985", gender: "LAKI-LAKI" });
    expect(nikInfo("3299015508080002", now)).toEqual({ birthDate: "15-08-2008", gender: "PEREMPUAN" });
  });
  it("null jika belum lengkap atau tanggal tidak masuk akal", () => {
    expect(nikInfo("32990155", now)).toBeNull();
    expect(nikInfo("3299013213850001", now)).toBeNull(); // bulan 13
    expect(nikInfo("3299017202850001", now)).toBeNull(); // 32 Februari (72 − 40)
  });
});

describe("lokasi layanan & jarak", () => {
  it("haversine: Monas ke Bundaran HI sekitar 2,2 km", () => {
    const km = distanceKm({ lat: -6.1754, lng: 106.8272 }, { lat: -6.195, lng: 106.8229 });
    expect(km).toBeGreaterThan(2);
    expect(km).toBeLessThan(2.4);
  });
  it("data lokasi lengkap: semua jenis ada, ratusan kantor se-DKI Jakarta, id unik", () => {
    expect(new Set(OFFICES.map((o) => o.type))).toEqual(new Set(Object.keys(OFFICE_TYPES)));
    expect(new Set(OFFICES.map((o) => o.id)).size).toBe(OFFICES.length);
    // DKI Jakarta termasuk Kepulauan Seribu (±70 km ke utara).
    for (const o of OFFICES) expect(distanceKm(o, { lat: -6.18, lng: 106.83 })).toBeLessThan(80);
    expect(OFFICES.length).toBeGreaterThan(250);
  });
});

beforeAll(() => {
  process.env.SESSION_SECRET ??= "rahasia-tes-keamanan-minimal-32-karakter";
});

const nowSec = () => Math.floor(Date.now() / 1000);

describe("sesi petugas", () => {
  it("token berlaku 30 menit sejak aktivitas terakhir dan membawa waktu login", async () => {
    const token = await signSession({ id: "u1", name: "Rina", role: "petugas_loket" });
    const { exp, auth } = decodeJwt(token);
    expect(exp! - nowSec()).toBeGreaterThan(SESSION_IDLE_SECONDS - 5);
    expect(exp! - nowSec()).toBeLessThanOrEqual(SESSION_IDLE_SECONDS);
    expect((await verifySession(token))?.authAt).toBe(auth);
  });

  it("perpanjangan tidak melewati 12 jam sejak login", async () => {
    const authAt = nowSec() - SESSION_MAX_AGE_SECONDS + 60; // login hampir 12 jam lalu
    const token = await signSession({ id: "u1", name: "Rina", role: "petugas_loket", authAt });
    expect(decodeJwt(token).exp).toBe(authAt + SESSION_MAX_AGE_SECONDS);
  });

  it("lewat 12 jam sejak login: sesi tidak berlaku lagi", async () => {
    const authAt = nowSec() - SESSION_MAX_AGE_SECONDS - 60;
    const token = await signSession({ id: "u1", name: "Rina", role: "petugas_loket", authAt });
    expect(await verifySession(token)).toBeNull();
  });
});

describe("perlindungan NIK", () => {
  const nik = "3374070206060002";

  it("hash stabil untuk pencarian, sandi acak tapi bisa dibuka", () => {
    expect(hashNik(nik)).toBe(hashNik(nik));
    expect(hashNik(nik)).not.toContain(nik);
    const a = encryptNik(nik);
    expect(a).not.toBe(encryptNik(nik)); // IV acak per enkripsi
    expect(a).not.toContain(nik);
    expect(decryptNik(a)).toBe(nik);
  });

  it("sandi yang diubah ditolak (AES-GCM)", () => {
    const [v, iv, tag, data] = encryptNik(nik).split(".");
    const tampered = [v, iv, tag, `${data.slice(0, -2)}AA`].join(".");
    expect(() => decryptNik(tampered)).toThrow();
  });

  it("bentuk tersimpan tidak memuat NIK asli", () => {
    const stored = protectNik(nik);
    expect(stored.nikMasked).toBe("3374 07•• •••• 0002");
    expect(JSON.stringify(stored)).not.toContain(nik);
  });
});

describe("kantor pixel-art", () => {
  const blocked = blockedTiles();

  it("setiap langkah pejalan terjangkau dari langkah sebelumnya", () => {
    for (const w of WALKERS) {
      let from = w.start;
      for (const step of [...w.steps, w.steps[0]]) {
        const sameTile = from[0] === step.to[0] && from[1] === step.to[1];
        expect(sameTile || findPath(from, step.to, blocked).length > 0, `${w.id} → ${step.to}`).toBe(true);
        from = step.to;
      }
    }
  });

  it("jumlah warga menunggu mengikuti berkas di ruang tunggu (maks. kursi)", () => {
    const office = emptyOffice();
    const count = (o: typeof office) => createActors(o).filter((a) => a.id.startsWith("tunggu-")).length;
    expect(count(office)).toBe(0);
    office.lobi.count = 99;
    expect(count(office)).toBe(WAITING_SEATS.length);
  });

  it("pejalan bergerak dengan frame langkah lalu berhenti di tujuan", () => {
    const kurir = createActors(emptyOffice()).find((a) => a.id === "kurir")!;
    for (let i = 0; i < 40; i++) updateActor(kurir, 0.1, blocked); // tunggu di loket pertama selesai
    expect(kurir.pose).toBe("walk");
    expect(spriteFrame(kurir).col).toBeLessThanOrEqual(2);
    for (let i = 0; i < 400 && kurir.pose === "walk"; i++) updateActor(kurir, 0.05, blocked);
    expect(kurir.tile).toEqual(WALKERS[0].steps[1].to);
    expect(kurir.say).toBe(WALKERS[0].steps[1].say);
  });
});
