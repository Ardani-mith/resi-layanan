// npm run sprite:sheet -- <sumber.png|jpeg> <keluaran.png> [--preview <pratinjau.png>] [--copy b1k4=b1k5]
//
// Mengubah lembar karakter hasil generator AI (latar hijau polos, 7 kolom × 3 baris, ukuran
// bebas) menjadi lembar sprite kantor pixel-art: 112×96 px, frame 16×32, latar transparan.
// Urutan frame mengikuti Pixel Agents: kolom 1–3 jalan (A, diam, B), 4–5 mengetik, 6–7 membaca;
// baris bawah, atas, kanan.
//
// Langkah: buang latar hijau (chroma key) → temukan grid lewat celah kosong → tiap frame
// diperkecil dengan warna terbanyak (modus) per blok supaya tetap tajam (tanpa blur) → kepala
// dijadikan jangkar horizontal (tidak bergoyang antar-frame) dan kaki menempel di dasar frame.
// --copy b1k4=b1k5: ganti frame baris 1 kolom 4 dengan salinan baris 1 kolom 5 yang badan atasnya
// turun 1 px (mis. frame yang ikut menggambar meja; hasilnya tetap terlihat "mengetik").

import { parseArgs } from "node:util";
import sharp from "sharp";

const FRAME_W = 16;
const FRAME_H = 32;
const COLS = 7;
const ROWS = 3;
/** Tinggi karakter berdiri di frame (sisakan 1 px di atas). */
const FIGURE_H = 31;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { preview: { type: "string" }, copy: { type: "string", multiple: true } },
});
const [input, output] = positionals;
if (!input || !output) {
  console.error("Pakai: npm run sprite:sheet -- <sumber> <keluaran.png> [--preview <pratinjau.png>]");
  process.exit(1);
}

const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const px = (x: number, y: number) => (y * W + x) * 3;

/** Latar = hijau dominan (termasuk noda JPEG di sekitarnya). */
const isBg = (i: number) => data[i + 1] - Math.max(data[i], data[i + 2]) > 45;

/** Rentang berisi (bukan latar) di satu sumbu, dipisah oleh celah kosong. */
function spans(sums: number[], count: number) {
  const out: [number, number][] = [];
  let start = -1;
  sums.forEach((v, i) => {
    if (v > 3 && start < 0) start = i;
    if (v <= 3 && start >= 0) {
      out.push([start, i - 1]);
      start = -1;
    }
  });
  if (start >= 0) out.push([start, sums.length - 1]);
  // Gabungkan potongan kecil (mis. kertas terpisah dari tangan) sampai jumlahnya pas.
  while (out.length > count) {
    let best = 0;
    for (let i = 1; i < out.length - 1; i++) {
      const gap = (k: number) => out[k + 1][0] - out[k][1];
      if (gap(i) < gap(best)) best = i;
    }
    out.splice(best, 2, [out[best][0], out[best + 1][1]]);
  }
  if (out.length !== count) throw new Error(`Grid tidak terbaca: ${out.length} bukan ${count}`);
  return out;
}

const rowSums = Array.from({ length: H }, () => 0);
const colSums = Array.from({ length: W }, () => 0);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (!isBg(px(x, y))) {
      rowSums[y]++;
      colSums[x]++;
    }
const rows = spans(rowSums, ROWS);
const cols = spans(colSums, COLS);

type Box = { x0: number; y0: number; x1: number; y1: number };
function bbox(cell: Box): Box {
  const box = { x0: cell.x1, y0: cell.y1, x1: cell.x0, y1: cell.y0 };
  for (let y = cell.y0; y <= cell.y1; y++)
    for (let x = cell.x0; x <= cell.x1; x++)
      if (!isBg(px(x, y))) {
        box.x0 = Math.min(box.x0, x);
        box.x1 = Math.max(box.x1, x);
        box.y0 = Math.min(box.y0, y);
        box.y1 = Math.max(box.y1, y);
      }
  return box;
}

const cells = rows.flatMap(([y0, y1]) => cols.map(([x0, x1]) => bbox({ x0, y0, x1, y1 })));
// Skala sama untuk semua frame: karakter berdiri tertinggi (frame "diam" tiap baris) = FIGURE_H.
const standH = Math.max(...[1, 8, 15].map((i) => cells[i].y1 - cells[i].y0 + 1));
const scale = standH / FIGURE_H; // px sumber per px sprite

/** Tengah kepala (sepertiga atas) sebagai jangkar horizontal. */
function headCenter(b: Box) {
  const limit = b.y0 + (b.y1 - b.y0) / 3;
  let sum = 0;
  let n = 0;
  for (let y = b.y0; y <= limit; y++)
    for (let x = b.x0; x <= b.x1; x++)
      if (!isBg(px(x, y))) {
        sum += x;
        n++;
      }
  return n ? sum / n : (b.x0 + b.x1) / 2;
}

const sheet = Buffer.alloc(FRAME_W * COLS * FRAME_H * ROWS * 4);
cells.forEach((b, index) => {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const cx = headCenter(b);
  for (let ty = 0; ty < FRAME_H; ty++)
    for (let tx = 0; tx < FRAME_W; tx++) {
      // Blok sumber untuk piksel (tx, ty): kaki (b.y1) = dasar frame, kepala di tengah frame.
      const sx0 = Math.round(cx + (tx - FRAME_W / 2) * scale);
      const sy0 = Math.round(b.y1 + 1 - (FRAME_H - ty) * scale);
      const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
      let fg = 0;
      let total = 0;
      for (let y = sy0; y < sy0 + scale; y++)
        for (let x = sx0; x < sx0 + scale; x++) {
          total++;
          if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue;
          const i = px(x, y);
          if (isBg(i)) continue;
          fg++;
          // Kelompokkan warna 4-bit per kanal: noda JPEG tidak memecah warna yang sama.
          const k = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
          const bucket = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
          bucket.n++;
          bucket.r += data[i];
          bucket.g += data[i + 1];
          bucket.b += data[i + 2];
          buckets.set(k, bucket);
        }
      if (fg / total < 0.45) continue;
      const top = [...buckets.values()].reduce((a, c) => (c.n > a.n ? c : a));
      const o = ((row * FRAME_H + ty) * FRAME_W * COLS + col * FRAME_W + tx) * 4; // = frameOffset
      sheet[o] = Math.round(top.r / top.n);
      sheet[o + 1] = Math.round(top.g / top.n);
      sheet[o + 2] = Math.round(top.b / top.n);
      sheet[o + 3] = 255;
    }
});

const frameOffset = (row: number, col: number, x: number, y: number) =>
  ((row * FRAME_H + y) * FRAME_W * COLS + col * FRAME_W + x) * 4;
for (const rule of values.copy ?? []) {
  const match = /^b(\d)k(\d)=b(\d)k(\d)$/.exec(rule);
  if (!match) throw new Error(`--copy tidak valid: ${rule} (contoh: b1k4=b1k5)`);
  const [toRow, toCol, fromRow, fromCol] = match.slice(1).map((n) => Number(n) - 1);
  const bob = Math.round(FRAME_H * 0.6); // kepala & lengan turun 1 px, kaki tetap
  for (let y = FRAME_H - 1; y >= 0; y--)
    for (let x = 0; x < FRAME_W; x++) {
      const srcY = y <= bob && y > 0 ? y - 1 : y === 0 ? -1 : y;
      const to = frameOffset(toRow, toCol, x, y);
      if (srcY < 0) sheet.fill(0, to, to + 4);
      else
        sheet.copy(
          sheet,
          to,
          frameOffset(fromRow, fromCol, x, srcY),
          frameOffset(fromRow, fromCol, x, srcY) + 4,
        );
    }
}

const raw = { raw: { width: FRAME_W * COLS, height: FRAME_H * ROWS, channels: 4 as const } };
await sharp(sheet, raw).png().toFile(output);
console.log(`${output}: ${FRAME_W * COLS}×${FRAME_H * ROWS}, skala 1:${scale.toFixed(1)}`);

if (values.preview) {
  await sharp(sheet, raw)
    .resize(FRAME_W * COLS * 8, FRAME_H * ROWS * 8, { kernel: "nearest" })
    .flatten({ background: "#d9d4ca" })
    .png()
    .toFile(values.preview);
}
