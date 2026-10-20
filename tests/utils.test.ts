// Utilitas murni: resi & privasi, penggabung class (cn), dan animasi angka.
import { describe, expect, it } from "vitest";
import { countUpFrame } from "@/components/landing/CountUp";
import { cn } from "@/lib/cn";
import { maskName, maskPhone, normalizePhone } from "@/lib/present";
import { generateResi, isValidResi, normalizeResi, RESI_ALPHABET } from "@/lib/resi";
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
