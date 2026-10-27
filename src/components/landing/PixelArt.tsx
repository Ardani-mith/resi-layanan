"use client";

// Komponen pixel-art landing page (semua dekoratif, aria-hidden): langit awan, hiasan animasi
// di judul bagian, ilustrasi kartu, dan strip jalan berisi warga menuju kantor.

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { SHEETS } from "@/components/office/layout";
import { cn } from "@/lib/cn";
import {
  ASSET_EVENT,
  clamp,
  EMPTY,
  L,
  type Level,
  type Painter,
  type PixelSpec,
  runPixel,
  smoothstep,
  type Tone,
  turbulence,
} from "./pixel";

/** Kanvas yang menjalankan `spec` selama terpasang. `spec` harus stabil (konstanta modul / useMemo). */
function PixelCanvas({
  spec,
  className,
  style,
}: {
  spec: PixelSpec;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => (ref.current ? runPixel(ref.current, spec) : undefined), [spec]);
  return <canvas ref={ref} aria-hidden className={cn("block", className)} style={style} />;
}

// --- Awan ----------------------------------------------------------------------------

type Edges = { top?: number; bottom?: number; left?: number; right?: number };

/**
 * Awan menebal di tepi yang diberi kedalaman (dalam sel) dan menipis ke tengah, lalu dibentuk
 * turbulensi: tingkat tua di tepi, dither & muda ke dalam, pinggiran putih. Tengah tetap
 * kosong supaya teks di atasnya terbaca.
 */
function drawClouds(p: Painter, time: number, edges: Edges, seed: number) {
  // Sisi kiri/kanan maks. 12% lebar; layar sempit (HP): sisi tipis & atas dangkal agar teks bebas.
  const narrow = p.cols < 40;
  const side = (depth = 0) => Math.min(depth, narrow ? 1 : p.cols * 0.12);
  const depths = [
    (edges.top ?? 0) * (narrow ? 0.6 : 1),
    edges.bottom ?? 0,
    side(edges.left),
    side(edges.right),
  ];
  for (let r = 0; r < p.rows; r++) {
    for (let c = 0; c < p.cols; c++) {
      // Noise frekuensi rendah menggeser BATAS awan (gumpalan besar), bukan hanya warnanya.
      const n = turbulence(c * 0.55, r * 0.55 + seed, time);
      const dists = [r, p.rows - 1 - r, c, p.cols - 1 - c];
      let density = 0;
      depths.forEach((depth, i) => {
        if (depth > 0)
          density = Math.max(density, smoothstep(clamp(1 - (dists[i] - n * depth * 0.6) / depth)));
      });
      const raw = density * 4.6 + n * 0.9 - 0.5;
      const level: Level | typeof EMPTY =
        raw < 0.35 ? EMPTY : raw < 0.95 ? L.White : (clamp(Math.round(raw), 1, 4) as Level);
      if (level !== EMPTY) p.set(c, r, level);
    }
  }
}

const skySpecs = new Map<string, PixelSpec>();

/** Langit awan pengisi induknya (induk harus `relative`). */
export function PixelSky({
  edges,
  seed = 0,
  tone = "sky",
  cell = 22,
  className,
}: {
  edges: Edges;
  seed?: number;
  tone?: Tone;
  cell?: number;
  className?: string;
}) {
  // Spec di-cache per konfigurasi agar kanvas tidak dimulai ulang tiap render.
  const key = JSON.stringify([edges, seed, tone, cell]);
  let spec = skySpecs.get(key);
  if (!spec) {
    spec = { cell, tone, fps: 8, draw: (p, t) => drawClouds(p, t * 0.35, edges, seed) };
    skySpecs.set(key, spec);
  }
  return (
    <PixelCanvas spec={spec} className={cn("pointer-events-none absolute inset-0 size-full", className)} />
  );
}

/** Panel ilustrasi kartu: langit bernada pagi/siang/senja + isi (kartu kaca) di tengah. */
export function PixelCard({ tone, seed, children }: { tone: Tone; seed: number; children?: ReactNode }) {
  const fill =
    tone === "dusk"
      ? "bg-[var(--px-dusk-light)]"
      : tone === "dawn"
        ? "bg-[var(--px-dawn-light)]"
        : "bg-[var(--px-light)]";
  return (
    <div
      className={cn(
        "relative aspect-[4/3] overflow-hidden sm:aspect-[16/10] lg:aspect-[4/3] xl:aspect-[16/10]",
        fill,
      )}
    >
      <PixelSky edges={{ top: 4, bottom: 7 }} seed={seed} tone={tone} cell={10} />
      {children && <div className="absolute inset-0 grid place-items-center p-5 sm:p-6">{children}</div>}
    </div>
  );
}

// --- Hiasan judul bagian -------------------------------------------------------------

const { White, LightChecker, Light, DarkChecker, Dark, Ink } = L;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Rapor: batang naik bergantian lalu diulang. */
const bars: PixelSpec = {
  cols: 22,
  rows: 12,
  cell: 6,
  fps: 24,
  still: 3,
  draw(p, t) {
    const local = t % 5;
    p.rect(0, 11, 22, 1, Ink);
    [4, 6, 9, 7, 10].forEach((height, i) => {
      const h = Math.round(height * easeOut(clamp((local - i * 0.25) / 0.8)));
      if (h <= 0) return;
      p.rect(1 + i * 4, 11 - h, 3, h, i === 4 ? Dark : DarkChecker);
      p.rect(1 + i * 4, 11 - h, 3, 1, i === 4 ? Ink : Dark);
    });
  },
};

/** Masalah (lambat & gelap): jam pasir, pasir turun lalu diulang. */
const HOURGLASS = [
  "XXXXXXXXXXX",
  "X.........X",
  ".X.......X.",
  "..X.....X..",
  "...X...X...",
  "....X.X....",
  "...........",
  "....X.X....",
  "...X...X...",
  "..X.....X..",
  ".X.......X.",
  "X.........X",
  "XXXXXXXXXXX",
];
/** Sel bagian dalam satu bola (baris dari leher ke ujung): lebar 1,3,5,7,9. */
const bulbRow = (k: number) => Array.from({ length: k * 2 + 1 }, (_, i) => 5 - k + i);
const hourglass: PixelSpec = {
  cols: 11,
  rows: 13,
  cell: 6,
  fps: 12,
  still: 2.5,
  draw(p, t) {
    const f = (t % 6) / 6;
    p.sprite(HOURGLASS, 0, 0, { X: Ink });
    // Bola atas: pasir mengendap dekat leher (baris 5 ke atas), berkurang.
    let top = Math.round(25 * (1 - f));
    for (let k = 0; k < 5 && top > 0; k++) {
      for (const c of bulbRow(k)) if (top-- > 0) p.set(c, 5 - k, Dark);
    }
    // Bola bawah: pasir menumpuk dari dasar (baris 11 ke atas), bertambah.
    let bottom = Math.round(25 * f);
    for (let k = 4; k >= 0 && bottom > 0; k--) {
      for (const c of bulbRow(k)) if (bottom-- > 0) p.set(c, 7 + k, Dark);
    }
    if (f < 0.97) {
      p.set(5, 6, Math.floor(t * 8) % 2 ? Light : LightChecker);
      for (let r = 7; r <= 11 && r < 12 - Math.round(5 * f); r++) p.set(5, r, LightChecker);
    }
  },
};

/** Cara kerja (seperti melacak paket): berkas berjalan melewati 4 titik pemeriksaan. */
const DOC = ["XXXX.", "XWWXX", "XWWWX", "XLLWX", "XWWWX", "XXXXX"];
const CHECKPOINTS = [2, 10, 18, 26];
const route: PixelSpec = {
  cols: 30,
  rows: 10,
  cell: 6,
  fps: 16,
  still: 4.4,
  draw(p, t) {
    const local = t % 7;
    const x = Math.round(Math.min(local / 6, 1) * 25);
    for (let c = 1; c < 29; c += 2) p.set(c, 8, Light);
    for (const cp of CHECKPOINTS) {
      p.rect(cp - 1, 7, 3, 3, Ink);
      p.set(cp, 8, x + 2 >= cp ? Dark : White);
    }
    const hop = local < 6 && Math.floor(local * 6) % 2 ? 1 : 0;
    p.sprite(DOC, x, 0 + hop, { X: Ink, W: White, L: Light });
  },
};

/** Untuk siapa (satu resi): struk keluar dari printer, lalu diulang. */
const receipt: PixelSpec = {
  cols: 14,
  rows: 18,
  cell: 6,
  fps: 12,
  still: 3.2,
  draw(p, t) {
    const local = t % 5;
    const length = Math.round(13 * easeOut(clamp(local / 3)));
    p.rect(1, 0, 12, 1, Ink);
    p.rect(0, 1, 14, 3, Ink);
    p.rect(1, 1, 12, 2, White);
    p.set(10, 1, Math.floor(t * 3) % 2 ? Dark : Light);
    p.rect(2, 3, 10, 1, Ink);
    for (let j = 0; j < length; j++) {
      const row = 4 + j;
      // Ujung struk (baris pertama dicetak) ada di bawah: barcode & tepi bergerigi.
      const fromEnd = length - 1 - j;
      p.set(2, row, Ink);
      p.set(11, row, Ink);
      for (let c = 3; c <= 10; c++) {
        const level =
          fromEnd === 0
            ? c % 2
              ? White
              : EMPTY
            : fromEnd <= 2
              ? c % 2
                ? Ink
                : White
              : fromEnd % 3 === 0 && c < 9
                ? Light
                : White;
        if (level !== EMPTY) p.set(c, row, level as Level);
      }
    }
  },
};

/** Penutup (janji yang bisa dipegang): stempel turun, meninggalkan cap centang. */
const STAMP = ["..XXXX..", "..XDDX..", "..XDDX..", ".XXXXXX.", "XDDDDDDX", "XXXXXXXX"];
const MARK = ["DDDDDD", "D....D", "D.D..D", "D..DDD", "DDDDDD"];
const stamp: PixelSpec = {
  cols: 18,
  rows: 17,
  cell: 6,
  fps: 16,
  still: 2.2,
  draw(p, t) {
    const local = t % 3.5;
    p.rect(2, 7, 14, 10, Ink);
    p.rect(3, 8, 12, 8, White);
    for (const r of [9, 11, 13]) p.rect(4, r, 6, 1, Light);
    const down = local > 0.9 && local < 1.4;
    if (local > 1.1) p.sprite(MARK, 8, 10, { D: Dark });
    // Turun menyentuh kertas (bawah stempel di baris 10), tahan sebentar, lalu naik.
    const y = down ? 5 : Math.round(5 * (1 - smoothstep(clamp(Math.abs(local - 1.15) / 0.8))));
    p.sprite(STAMP, 7, y, { X: Ink, D: DarkChecker });
  },
};

const DECORATIONS = { bars, hourglass, route, receipt, stamp };
export type DecorationName = keyof typeof DECORATIONS;

/** Hiasan piksel kecil beranimasi (ukuran aslinya sel × kolom). */
export function PixelDecoration({ name, className }: { name: DecorationName; className?: string }) {
  const spec = DECORATIONS[name];
  return (
    <PixelCanvas
      spec={spec}
      className={cn("shrink-0", className)}
      style={{ width: spec.cols! * spec.cell, height: spec.rows! * spec.cell }}
    />
  );
}

// --- Strip jalan: warga & petugas arsip menuju kantor ---------------------------------

const BUILDING = [
  "........XX........",
  ".......XDDX.......",
  "......XDDDDX......",
  ".....XXXXXXXX.....",
  "XXXXXXXXXXXXXXXXXX",
  "XWWWWWWWWWWWWWWWWX",
  "XWLLWWLLWWWLLWWLLX",
  "XWLLWWLLWWWLLWWLLX",
  "XWWWWWWWWWWWWWWWWX",
  "XWLLWWWWXXXWWWLLWX",
  "XWLLWWWWXDXWWWLLWX",
  "XXXXXXXXXXXXXXXXXX",
];
const STREET_CELL = 8;
const SCALE = 2; // sprite karakter 16×32 → 32×64 px

type Walker = { sheet: keyof typeof SHEETS; speed: number; offset: number; toward: boolean };
const WALKERS: Walker[] = [
  { sheet: "wargaA", speed: 34, offset: 0, toward: true },
  { sheet: "kurir", speed: 42, offset: 380, toward: false },
  { sheet: "wargaB", speed: 28, offset: 620, toward: true },
];

const images = new Map<string, HTMLImageElement>();
function sheetImage(name: string) {
  let img = images.get(name);
  if (!img) {
    img = new Image();
    img.onload = () => window.dispatchEvent(new Event(ASSET_EVENT));
    img.src = `/office/pixel/chars/${name}.png`;
    images.set(name, img);
  }
  return img;
}

const street: PixelSpec = {
  cell: STREET_CELL,
  fps: 20,
  still: 1.3,
  draw(p, t) {
    const ground = p.rows - 2;
    drawClouds(p, t * 0.25, { bottom: 9 }, 41);
    // Jalan: garis tinta + trotoar dither, kantor di sisi kanan.
    p.rect(0, ground, p.cols, 1, Ink);
    p.rect(0, ground + 1, p.cols, 1, LightChecker);
    p.sprite(BUILDING, p.cols - BUILDING[0].length - 4, ground - BUILDING.length, {
      X: Ink,
      W: White,
      L: Light,
      D: Dark,
    });
  },
  overlay(ctx, t, { width, height }) {
    const groundY = height - 2 * STREET_CELL;
    const door = width - (4 + 18 - 9) * STREET_CELL; // pintu kantor (kolom 9 bangunan)
    const frame = [0, 1, 2, 1][Math.floor(t / 0.15) % 4];
    for (const w of WALKERS) {
      const img = sheetImage(SHEETS[w.sheet]);
      if (!img.complete || !img.naturalWidth) continue;
      // Warga berjalan masuk ke pintu; petugas arsip keluar dari pintu ke kiri.
      const span = door + 40;
      const travelled = (w.offset + t * w.speed) % span;
      const x = w.toward ? -40 + travelled : door - travelled;
      const dx = Math.round(x);
      const dy = Math.round(groundY - 32 * SCALE + 6);
      ctx.save();
      if (!w.toward) {
        ctx.translate(dx + 16 * SCALE, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(img, frame * 16, 2 * 32, 16, 32, 0, 0, 16 * SCALE, 32 * SCALE);
      } else {
        ctx.drawImage(img, frame * 16, 2 * 32, 16, 32, dx, dy, 16 * SCALE, 32 * SCALE);
      }
      ctx.restore();
    }
  },
};

/** Strip penutup halaman: awan, jalan, dan orang berjalan ke/dari kantor. */
export function PixelStreet({ className }: { className?: string }) {
  return <PixelCanvas spec={street} className={cn("h-44 w-full", className)} />;
}
