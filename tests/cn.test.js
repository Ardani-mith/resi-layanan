import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

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
