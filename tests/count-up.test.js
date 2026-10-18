import { describe, expect, it } from "vitest";
import { countUpFrame } from "@/lib/count-up";

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
