"use client";

// "Kantor transparan" pixel-art: aula pelayanan top-down di Canvas 2D (teknik & aset dari
// Pixel Agents, MIT — lihat public/office/pixel/LICENSE.txt). Petugas mengetik/membaca di meja
// bila zonanya ada berkas, warga menunggu sesuai jumlah berkas di ruang tunggu, kurir & warga
// berjalan dengan BFS per petak. Teks (papan nama, jumlah, gelembung) di lapisan HTML supaya tajam.

import { Pause, Play } from "lucide-react";
import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from "react";
import { setPixelMotion } from "@/components/landing/pixel";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/hooks";
import { OFFICE_ROOMS, type OfficeRoomKey, type OfficeSnapshot } from "@/lib/present";
import { type Actor, blockedTiles, createActors, spriteFrame, updateActor } from "./engine";
import {
  COLS,
  FURNITURE,
  type Furniture,
  HALL_FLOOR,
  isWall,
  ROWS,
  RUGS,
  SHEETS,
  SIGN,
  STAFF,
  TILE,
  type Tint,
  WALKERS,
  WALL_TINT,
  WORLD_H,
  WORLD_W,
  zoneAt,
  ZONES,
} from "./layout";

const ROUTE: OfficeRoomKey[] = ["lobi", "verifikasi", "entri", "kepala", "cetak", "ambil"];
const BASE = "/office/pixel";
const FURNITURE_FRAME = 0.2;

/** Posisi titik dunia (px) → persen panggung. */
const at = (x: number, y: number): CSSProperties => ({
  left: `${(x / WORLD_W) * 100}%`,
  top: `${(y / WORLD_H) * 100}%`,
});

// --- Aset --------------------------------------------------------------------------------

type Assets = {
  images: Map<string, HTMLImageElement>;
  /** lantai + dinding + hiasan dinding, digambar sekali */
  base: HTMLCanvasElement;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** "Colorize" ala Pixel Agents: piksel abu-abu → HSL dengan kecerahan & kontras. */
function tint(img: HTMLImageElement, { h, s, b, c }: Tint) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    let l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
    l = 0.5 + (l - 0.5) * ((100 + c) / 100) + b / 200;
    l = Math.max(0, Math.min(1, l));
    const k = (1 - Math.abs(2 * l - 1)) * (s / 100);
    const hp = h / 60;
    const x = k * (1 - Math.abs((hp % 2) - 1));
    const [r1, g1, b1] =
      hp < 1
        ? [k, x, 0]
        : hp < 2
          ? [x, k, 0]
          : hp < 3
            ? [0, k, x]
            : hp < 4
              ? [0, x, k]
              : hp < 5
                ? [x, 0, k]
                : [k, 0, x];
    const m = l - k / 2;
    px[i] = Math.round((r1 + m) * 255);
    px[i + 1] = Math.round((g1 + m) * 255);
    px[i + 2] = Math.round((b1 + m) * 255);
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

async function loadAssets(): Promise<Assets> {
  const names = new Set(FURNITURE.flatMap((f) => f.frames ?? [f.sprite]).filter((n) => !(n in PAINTERS)));
  const entries = await Promise.all([
    ...[...names].map(async (n) => [n, await loadImage(`${BASE}/furniture/${n}.png`)] as const),
    ...Object.values(SHEETS).map(async (n) => [n, await loadImage(`${BASE}/chars/${n}.png`)] as const),
    ...[...new Set([HALL_FLOOR.floor, ...ZONES.map((z) => z.floor)])].map(
      async (n) => [`floor_${n}`, await loadImage(`${BASE}/floor_${n}.png`)] as const,
    ),
    (async () => ["wall", await loadImage(`${BASE}/wall_0.png`)] as const)(),
  ]);
  const images = new Map(entries);

  const base = document.createElement("canvas");
  base.width = WORLD_W;
  base.height = WORLD_H;
  const ctx = base.getContext("2d")!;
  const floors = new Map<string, HTMLCanvasElement>();
  const floorFor = (floor: number, t: Tint) => {
    const k = `${floor}:${JSON.stringify(t)}`;
    if (!floors.has(k)) floors.set(k, tint(images.get(`floor_${floor}`)!, t));
    return floors.get(k)!;
  };
  for (let r = 2; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (isWall(c, r)) continue;
      const zone = zoneAt(c, r);
      ctx.drawImage(
        floorFor(zone?.floor ?? HALL_FLOOR.floor, zone?.tint ?? HALL_FLOOR.tint),
        c * TILE,
        r * TILE,
      );
    }
  // Karpet: isi, tepi berhias, dan garis motif.
  for (const { rect, fill, edge } of RUGS) {
    const [c0, r0, c1, r1] = rect;
    const x = c0 * TILE + 2;
    const y = r0 * TILE + 2;
    const w = (c1 - c0 + 1) * TILE - 4;
    const h = (r1 - r0 + 1) * TILE - 4;
    ctx.fillStyle = edge;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = edge;
    for (let i = x + 6; i < x + w - 6; i += 6) {
      ctx.fillRect(i, y + 4, 2, 1);
      ctx.fillRect(i, y + h - 5, 2, 1);
    }
    if (w > 40 && h > 40) ctx.strokeStyle = edge;
    if (w > 40 && h > 40) ctx.strokeRect(x + 6.5, y + 6.5, w - 13, h - 13);
  }
  // Dinding auto-tile: 16 potongan 16×32 diindeks bitmask tetangga (U=1, T=2, S=4, B=8).
  const wall = tint(images.get("wall")!, WALL_TINT);
  for (let r = 1; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (!isWall(c, r)) continue;
      const mask =
        (isWall(c, r - 1) ? 1 : 0) |
        (isWall(c + 1, r) ? 2 : 0) |
        (isWall(c, r + 1) ? 4 : 0) |
        (isWall(c - 1, r) ? 8 : 0);
      ctx.drawImage(
        wall,
        (mask % 4) * 16,
        Math.floor(mask / 4) * 32,
        16,
        32,
        c * TILE,
        r * TILE - TILE,
        16,
        32,
      );
    }
  return { images, base };
}

// --- Dekorasi yang tidak ada di paket aset: digambar per piksel ---------------------------

type Paint = (
  rect: (dx: number, dy: number, w: number, h: number, color: string) => void,
  frame: Frame,
  busy: boolean,
) => void;

/** Angka 3×5 piksel untuk layar antrean. */
const DIGITS = [
  "111101101101111",
  "010110010010111",
  "111001111100111",
  "111001111001111",
  "101101111001001",
  "111100111001111",
  "111100111101111",
  "111001010010010",
  "111101111101111",
  "111101111001111",
];

const PAINTERS: Record<string, Paint> = {
  // Printer: kertas keluar & lampu berkedip saat ruang cetak ada berkas.
  PRINTER: (rect, frame, busy) => {
    const f = frame.furnitureFrame;
    rect(2, 8, 28, 22, "#4b5563");
    rect(3, 9, 26, 20, "#e5e7eb");
    rect(3, 9, 26, 6, "#f3f4f6");
    rect(5, 11, 22, 2, "#9ca3af");
    rect(20, 18, 7, 4, "#374151");
    rect(25, 19, 1, 1, busy && f % 2 ? "#22c55e" : "#86efac");
    rect(6, 24, 14, 1, "#6b7280");
    const out = busy ? [0, 2, 4, 2][f % 4] : 0;
    rect(7, 22 + out, 12, 6, "#ffffff");
    rect(8, 24 + out, 8, 1, "#cbd5e1");
    rect(8, 26 + out, 6, 1, "#cbd5e1");
    rect(2, 30, 28, 2, "rgb(0 0 0 / 0.18)");
  },
  // Layar nomor antrean (LED merah), nomor maju tiap beberapa detik.
  QUEUE: (rect, frame) => {
    rect(1, 3, 30, 18, "#111827");
    rect(2, 4, 28, 16, "#1f2937");
    rect(3, 5, 26, 3, "#2f7fd8");
    rect(5, 6, 10, 1, "#bfdbfe");
    const n = 7 + (Math.floor(frame.time / 4) % 90);
    const glyphs = ["010101111101101", DIGITS[Math.floor(n / 10)], DIGITS[n % 10]]; // "A", puluhan, satuan
    glyphs.forEach((g, i) => {
      for (let k = 0; k < 15; k++)
        if (g[k] === "1") rect(8 + i * 6 + (k % 3), 10 + Math.floor(k / 3), 1, 1, i ? "#f87171" : "#fbbf24");
    });
    rect(1, 21, 30, 1, "rgb(0 0 0 / 0.2)");
  },
  // Papan nama instansi: bingkai emas, lambang perisai merah-putih (teks di lapisan HTML).
  SIGN: (rect) => {
    rect(0, 2, 80, 20, "#c9a227");
    rect(1, 3, 78, 18, "#0f2a4d");
    rect(2, 4, 76, 16, "#16325c");
    rect(5, 5, 11, 10, "#c9a227");
    rect(6, 15, 9, 2, "#c9a227");
    rect(8, 17, 5, 1, "#c9a227");
    rect(10, 18, 1, 1, "#c9a227");
    rect(6, 6, 9, 4, "#dc2626");
    rect(6, 10, 9, 4, "#ffffff");
    rect(7, 14, 7, 1, "#ffffff");
    rect(10, 7, 1, 1, "#fde68a");
    rect(1, 22, 78, 1, "rgb(0 0 0 / 0.2)");
  },
  WINDOW: (rect) => {
    rect(3, 4, 26, 17, "#6b5b4b");
    rect(4, 5, 24, 15, "#9fd0ec");
    rect(4, 5, 24, 5, "#c6e6f7");
    rect(6, 7, 4, 1, "#ffffff");
    rect(19, 7, 3, 1, "#ffffff");
    rect(15, 5, 2, 15, "#6b5b4b");
    rect(4, 12, 24, 1, "#6b5b4b");
    rect(2, 21, 28, 2, "#e7dccb");
    rect(2, 23, 28, 1, "rgb(0 0 0 / 0.15)");
  },
  // Dispenser air dengan galon biru.
  DISPENSER: (rect) => {
    rect(4, 2, 8, 10, "#2563eb");
    rect(5, 3, 6, 8, "#7cc4f2");
    rect(6, 4, 1, 5, "#dbeafe");
    rect(3, 12, 10, 18, "#9ca3af");
    rect(4, 13, 8, 16, "#f3f4f6");
    rect(5, 17, 2, 2, "#ef4444");
    rect(9, 17, 2, 2, "#3b82f6");
    rect(5, 22, 6, 1, "#6b7280");
    rect(3, 30, 10, 2, "rgb(0 0 0 / 0.18)");
  },
  // Mesin tiket antrean: layar sentuh + karcis keluar.
  KIOSK: (rect, frame) => {
    rect(3, 2, 10, 4, "#2f7fd8");
    rect(3, 6, 10, 23, "#111827");
    rect(4, 7, 8, 21, "#374151");
    rect(5, 8, 6, 6, "#93c5fd");
    rect(6, 10, 4, 1, "#1d4ed8");
    rect(6, 12, 3, 1, "#1d4ed8");
    rect(6, 18, 4, 1, "#111827");
    rect(7, 19, 2, 2 + (frame.furnitureFrame % 4 === 0 ? 1 : 0), "#ffffff");
    rect(2, 29, 12, 2, "#1f2937");
    rect(2, 31, 12, 1, "rgb(0 0 0 / 0.18)");
  },
  // Lemari arsip 3 laci.
  CABINET: (rect) => {
    rect(2, 4, 12, 26, "#4b5563");
    rect(3, 5, 10, 24, "#9ca3af");
    for (const y of [5, 13, 21]) {
      rect(3, y + 7, 10, 1, "#6b7280");
      rect(6, y + 3, 4, 1, "#374151");
      rect(7, y + 2, 2, 1, "#e5e7eb");
    }
    rect(2, 30, 12, 2, "rgb(0 0 0 / 0.18)");
  },
  // Kardus berkas.
  BOX: (rect) => {
    rect(2, 4, 12, 11, "#7c5530");
    rect(3, 5, 10, 9, "#c08a52");
    rect(3, 5, 10, 2, "#d6a46c");
    rect(7, 5, 2, 9, "#e5c79a");
    rect(4, 10, 3, 2, "#ffffff");
    rect(2, 15, 12, 1, "rgb(0 0 0 / 0.18)");
  },
  // Tumpukan KTP-el hasil cetak.
  CARDS: (rect) => {
    rect(3, 5, 9, 6, "#1e40af");
    rect(4, 4, 9, 6, "#3b82f6");
    rect(4, 4, 9, 1, "#93c5fd");
    rect(5, 6, 3, 3, "#dbeafe");
    rect(9, 6, 3, 1, "#dbeafe");
    rect(9, 8, 2, 1, "#dbeafe");
  },
};

type Frame = {
  office: OfficeSnapshot;
  active: OfficeRoomKey | null;
  highlight: OfficeRoomKey | null;
  time: number;
  furnitureFrame: number;
};

function drawFurniture(ctx: CanvasRenderingContext2D, assets: Assets, f: Furniture, frame: Frame) {
  const x = f.at[0] * TILE;
  const y = f.at[1] * TILE;
  const zone = zoneAt(...f.at);
  const busy = zone ? frame.office[zone.key].count > 0 : false;
  const paint = PAINTERS[f.sprite];
  if (paint) {
    const oy = y + (f.dy ?? 0);
    return paint(
      (dx, dy, w, h, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + dx, oy + dy, w, h);
      },
      frame,
      busy,
    );
  }
  const sprite = f.frames && busy ? f.frames[frame.furnitureFrame % f.frames.length] : f.sprite;
  ctx.drawImage(assets.images.get(sprite)!, x, y + (f.dy ?? 0));
}

function drawActor(ctx: CanvasRenderingContext2D, assets: Assets, a: Actor) {
  const { col, row, flip } = spriteFrame(a);
  const sheet = assets.images.get(SHEETS[a.sheet])!;
  const dx = Math.round(a.x - 8);
  const dy = Math.round(a.y + (a.seated ? 6 : 0) - 32);
  // Bayangan kaki
  ctx.fillStyle = "rgb(0 0 0 / 0.18)";
  ctx.fillRect(dx + 3, Math.round(a.y + (a.seated ? 6 : 0)) - 2, 10, 2);
  if (!flip) return ctx.drawImage(sheet, col * 16, row * 32, 16, 32, dx, dy, 16, 32);
  ctx.save();
  ctx.translate(dx + 16, dy);
  ctx.scale(-1, 1);
  ctx.drawImage(sheet, col * 16, row * 32, 16, 32, 0, 0, 16, 32);
  ctx.restore();
}

/** Satu frame dunia (resolusi asli 16 px/petak); urutan gambar = posisi Y (yang di depan menutupi). */
function renderWorld(ctx: CanvasRenderingContext2D, assets: Assets, actors: Actor[], frame: Frame) {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  ctx.drawImage(assets.base, 0, 0);

  // Zona: merah berdenyut = ada berkas terlambat, biru = disorot (hover / berkas Anda).
  for (const zone of ZONES) {
    const [c0, r0, c1, r1] = zone.rect;
    const late = frame.office[zone.key].late > 0;
    const x = c0 * TILE;
    const y = r0 * TILE;
    const w = (c1 - c0 + 1) * TILE;
    const h = (r1 - r0 + 1) * TILE;
    if (frame.active === zone.key) {
      ctx.fillStyle = "rgb(47 127 216 / 0.28)";
      ctx.fillRect(x, y, w, h);
    } else if (late) {
      // Bingkai merah berdenyut + arsiran tipis: warna zona tetap terbaca.
      const pulse = 0.5 + 0.5 * Math.sin(frame.time * 4);
      ctx.fillStyle = `rgb(239 68 68 / ${0.05 + 0.05 * pulse})`;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = `rgb(220 38 38 / ${0.45 + 0.4 * pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    }
    if (frame.highlight === zone.key) {
      ctx.strokeStyle = "#2f7fd8";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
      ctx.setLineDash([]);
    }
  }

  const drawables: { z: number; draw: () => void }[] = [];
  for (const f of FURNITURE) {
    const bottom = (f.at[1] + f.size[1]) * TILE;
    // Hiasan dinding paling belakang; barang di atas meja sesudah meja; sandaran kursi/sofa
    // menutupi orang yang duduk.
    const z = f.wall ? -1 : f.surface ? bottom + TILE + 0.2 : f.front ? bottom + 1 : bottom;
    drawables.push({ z, draw: () => drawFurniture(ctx, assets, f, frame) });
  }
  for (const a of actors) {
    if (a.hidden) continue;
    drawables.push({ z: a.y + TILE / 2 + 0.5, draw: () => drawActor(ctx, assets, a) });
  }
  drawables.sort((p, q) => p.z - q.z);
  for (const d of drawables) d.draw();
}

// --- Komponen ----------------------------------------------------------------------------

const bubbleClass =
  "absolute -translate-x-1/2 -translate-y-full rounded-[3px] border-2 border-[#1d1b26] px-1.5 py-px font-mono text-[10px] leading-tight font-bold whitespace-nowrap shadow-[2px_2px_0_rgb(0_0_0/0.25)]";

export default function PixelOffice({
  office,
  highlight,
  className,
}: {
  office: OfficeSnapshot;
  /** "Berkas Anda di sini": area + label (mis. nomor resi). */
  highlight?: { room: OfficeRoomKey; label: string; late?: boolean };
  className?: string;
}) {
  const [active, setActive] = useState<OfficeRoomKey | null>(null);
  // Animasi mengikuti "kurangi gerakan" sistem, tapi bisa dijeda/diputar manual (WCAG 2.2.2).
  const reduced = useReducedMotion();
  const [override, setOverride] = useState<boolean | null>(null);
  const playing = override ?? !reduced;
  const total = OFFICE_ROOMS.reduce((sum, r) => sum + office[r.key].count, 0);
  const late = OFFICE_ROOMS.reduce((sum, r) => sum + office[r.key].late, 0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // Nilai terbaru untuk loop animasi (diperbarui lewat effect, bukan saat render).
  const live = useRef({ playing, active, dirty: true });
  // Jeda/Putar di sini berlaku untuk semua animasi piksel di halaman (langit, hiasan, strip jalan).
  useEffect(() => setPixelMotion(playing), [playing]);
  useEffect(() => {
    live.current.playing = playing;
    live.current.active = active;
    live.current.dirty = true;
  }, [playing, active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return undefined;
    let raf = 0;
    let stopped = false;
    const actors = createActors(office);
    const blocked = blockedTiles();
    const world = document.createElement("canvas");
    world.width = WORLD_W;
    world.height = WORLD_H;
    const wctx = world.getContext("2d")!;
    const ctx = canvas.getContext("2d")!;
    const bubbles = new Map(
      [...overlay.querySelectorAll<HTMLElement>("[data-walker]")].map((el) => [el.dataset.walker!, el]),
    );

    // Skala bulat (piksel tetap tajam), mengikuti lebar panggung × devicePixelRatio.
    const resize = () => {
      const zoom = Math.max(1, Math.ceil((canvas.clientWidth * devicePixelRatio) / WORLD_W));
      if (canvas.width !== WORLD_W * zoom) {
        canvas.width = WORLD_W * zoom;
        canvas.height = WORLD_H * zoom;
        live.current.dirty = true;
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let time = 0;
    let furnitureTimer = 0;
    let furnitureFrame = 0;
    let last = performance.now();
    void loadAssets().then((assets) => {
      if (stopped) return;
      const tick = (now: number) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const { playing, active, dirty } = live.current;
        if (playing) {
          time += dt;
          furnitureTimer += dt;
          if (furnitureTimer >= FURNITURE_FRAME) {
            furnitureTimer -= FURNITURE_FRAME;
            furnitureFrame++;
          }
          for (const a of actors) updateActor(a, dt, blocked);
        }
        if (playing || dirty) {
          live.current.dirty = false;
          renderWorld(wctx, assets, actors, {
            office,
            active,
            highlight: highlight?.room ?? null,
            time,
            furnitureFrame,
          });
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(world, 0, 0, canvas.width, canvas.height);
          for (const a of actors) {
            const el = bubbles.get(a.id);
            if (!el) continue;
            const show = !a.hidden && a.say !== null;
            el.hidden = !show;
            if (!show) continue;
            if (el.textContent !== a.say) el.textContent = a.say;
            Object.assign(el.style, at(a.x, a.y + (a.seated ? 6 : 0) - 27));
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [office, highlight?.room]);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const c = Math.floor(((e.clientX - box.left) / box.width) * COLS);
    const r = Math.floor(((e.clientY - box.top) / box.height) * ROWS);
    setActive(zoneAt(c, r)?.key ?? null);
  };

  return (
    <figure className={cn("w-full", className)}>
      <figcaption className="sr-only">
        Aula pelayanan: {total} berkas sedang berjalan, {late} terlambat.{" "}
        {OFFICE_ROOMS.map((r) => `${r.name}: ${office[r.key].count} berkas`).join(", ")}.
      </figcaption>

      {/* HP: panggung bisa digeser ke samping supaya label tetap terbaca. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="relative min-w-[42rem] sm:min-w-0">
          {/* <button
            type="button"
            onClick={() => setOverride(!playing)}
            aria-pressed={!playing}
            className="absolute -top-1 right-0 z-10 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-surface-2"
          >
            {playing ? <Pause aria-hidden className="size-3.5" /> : <Play aria-hidden className="size-3.5" />}
            {playing ? "Jeda animasi" : "Putar animasi"}
          </button> */}
          <div
            aria-hidden
            data-playing={playing}
            className="@container relative"
            style={{ aspectRatio: `${WORLD_W} / ${WORLD_H}` }}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActive(null)}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 size-full drop-shadow-[0_18px_22px_rgb(15_27_45/0.22)] [image-rendering:pixelated]"
            />
            <div ref={overlayRef} className="pointer-events-none absolute inset-0">
              {/* Teks papan nama: ukuran dalam cqw (1 px dunia = 100/WORLD_W cqw) supaya ikut skala denah. */}
              <p
                className="absolute -translate-y-1/2 leading-none font-bold whitespace-nowrap"
                style={at(SIGN[0] * TILE + 19, SIGN[1] * TILE + 12.5)}
              >
                <span className="block font-mono text-[1.55cqw] tracking-[0.06em] text-[#f5d77a] uppercase">
                  {site.agency.split(" ")[0]}
                </span>
                <span className="mt-[0.25cqw] block font-mono text-[0.95cqw] tracking-[0.04em] text-white/90 uppercase">
                  {site.agency.split(" ").slice(1).join(" ")}
                </span>
              </p>
              {ZONES.map((zone) => {
                const room = OFFICE_ROOMS.find((r) => r.key === zone.key)!;
                const data = office[zone.key];
                const isLate = data.late > 0;
                return (
                  <div key={zone.key}>
                    <span
                      className={cn(
                        "absolute -translate-x-1/2 -translate-y-1/2 rounded-[3px] border-2 px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-wide whitespace-nowrap uppercase shadow-[2px_2px_0_rgb(0_0_0/0.25)]",
                        active === zone.key
                          ? "border-[#1d1b26] bg-[#2f7fd8] text-white"
                          : isLate
                            ? "border-[#1d1b26] bg-[#ef4444] text-white"
                            : "border-[#1d1b26] bg-[#fdf8ee] text-[#1d1b26]",
                      )}
                      style={at(zone.label[0] * TILE + TILE / 2, zone.label[1] * TILE + TILE / 2)}
                    >
                      {room.name}
                    </span>
                    {data.count > 0 && (
                      <span
                        className="absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[#1d1b26] bg-[#f2c14e] font-mono text-[11px] font-bold text-[#1d1b26]"
                        style={at(zone.count[0] * TILE + TILE / 2, zone.count[1] * TILE + TILE / 2)}
                      >
                        {data.count}
                      </span>
                    )}
                  </div>
                );
              })}
              {/* Status petugas: "!" = ada berkas terlambat di mejanya, "•••" = sedang memproses. */}
              {STAFF.map((s, i) => {
                const data = office[s.zone];
                if (data.count === 0) return null;
                const isLate = data.late > 0;
                return (
                  <span
                    key={i}
                    className={cn(
                      bubbleClass,
                      isLate ? "iso-pulse bg-[#ef4444] text-white" : "bg-white text-[#1d1b26]",
                    )}
                    style={at(s.at[0] * TILE + TILE / 2, s.at[1] * TILE + (s.sit ? 14 : 8) - 30)}
                  >
                    {isLate ? "!" : "•••"}
                  </span>
                );
              })}
              {WALKERS.map((w) => (
                <span
                  key={w.id}
                  data-walker={w.id}
                  hidden
                  className={cn(bubbleClass, "bg-white text-[#1d1b26]")}
                />
              ))}
              {highlight && (
                <span
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-[160%] rounded-full border-2 border-[#1d1b26] px-3 py-0.5 font-mono text-xs font-bold whitespace-nowrap shadow-[2px_2px_0_rgb(0_0_0/0.25)]",
                    highlight.late ? "bg-late text-white" : "bg-brand text-on-brand",
                  )}
                  style={(() => {
                    const zone = ZONES.find((z) => z.key === highlight.room)!;
                    return at(zone.label[0] * TILE + TILE / 2, zone.label[1] * TILE + TILE / 2);
                  })()}
                >
                  {highlight.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted sm:hidden">Geser denah ke samping untuk melihat semua area.</p>

      {/* Legenda: juga versi terbaca untuk layar kecil & pembaca layar. */}
      <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ROUTE.map((key, i) => {
          const room = OFFICE_ROOMS.find((r) => r.key === key)!;
          const data = office[key];
          return (
            <li
              key={key}
              onPointerEnter={() => setActive(key)}
              onPointerLeave={() => setActive(null)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs transition-colors",
                active === key ? "border-brand bg-brand-soft" : "border-line bg-surface",
              )}
            >
              <p className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
                0{i + 1} · {room.who}
              </p>
              <p className="mt-0.5 font-semibold">{room.name}</p>
              <p className="mt-0.5 font-mono tabular-nums">
                {data.count} berkas
                {data.late > 0 && (
                  <span className="ml-1.5 font-semibold text-late">· {data.late} terlambat</span>
                )}
              </p>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
