// Kantor pixel-art: denah harus bisa dilalui (tiap tujuan pejalan terjangkau) & mesin karakter jalan.
import { describe, expect, it } from "vitest";
import { blockedTiles, createActors, findPath, spriteFrame, updateActor } from "@/components/office/engine";
import { WAITING_SEATS, WALKERS } from "@/components/office/layout";
import { emptyOffice } from "@/lib/present";

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
