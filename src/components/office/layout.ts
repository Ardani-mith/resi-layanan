// Denah "Kantor transparan" versi pixel-art (teknik dari Pixel Agents, MIT): aula terbuka berbasis
// petak 16 px, tanpa sekat. Tiap tahap layanan = satu zona berlantai beda warna. Semua koordinat
// dalam petak [kolom, baris]; baris 0 kosong (ruang untuk dinding atas yang tingginya 2 petak).

import type { OfficeRoomKey } from "@/lib/present";

export const TILE = 16;
export const COLS = 30;
export const ROWS = 17;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

export type Tile = [number, number];
export type Dir = "down" | "up" | "right" | "left";

/** Warna lantai (gaya "colorize" Pixel Agents): hue, saturasi, kecerahan, kontras. */
export type Tint = { h: number; s: number; b: number; c: number };

export type Zone = {
  key: OfficeRoomKey;
  /** kolom & baris awal–akhir (inklusif) */
  rect: [number, number, number, number];
  floor: number;
  tint: Tint;
  /** papan nama & jumlah berkas (petak, boleh pecahan) */
  label: [number, number];
  count: [number, number];
};

const HALL: Tint = { h: 35, s: 16, b: 16, c: -50 };

export const ZONES: Zone[] = [
  {
    key: "verifikasi",
    rect: [1, 2, 9, 8],
    floor: 3,
    tint: { h: 210, s: 20, b: 16, c: -50 },
    label: [5, 8.1],
    count: [9, 4],
  },
  {
    key: "entri",
    rect: [10, 2, 19, 8],
    floor: 3,
    tint: { h: 165, s: 14, b: 16, c: -50 },
    label: [15, 8.1],
    count: [19, 4],
  },
  {
    key: "kepala",
    rect: [20, 2, 28, 8],
    floor: 5,
    tint: { h: 28, s: 26, b: 2, c: -45 },
    label: [24.5, 8.1],
    count: [21, 5],
  },
  {
    key: "lobi",
    rect: [1, 10, 9, 16],
    floor: 1,
    tint: { h: 40, s: 22, b: 18, c: -55 },
    label: [5, 15.4],
    count: [4.5, 10.4],
  },
  {
    key: "ambil",
    rect: [10, 10, 19, 16],
    floor: 3,
    tint: { h: 135, s: 12, b: 16, c: -50 },
    label: [14.5, 15.4],
    count: [18.5, 12],
  },
  {
    key: "cetak",
    rect: [20, 10, 28, 16],
    floor: 3,
    tint: { h: 220, s: 8, b: 14, c: -55 },
    label: [24.5, 15.4],
    count: [27.5, 14],
  },
];

export const HALL_FLOOR = { floor: 1, tint: HALL };
export const WALL_TINT: Tint = { h: 28, s: 22, b: -30, c: -15 };

/** Dinding: atas (baris 1) + dua sisi; depan terbuka supaya isi kantor terlihat. */
export function isWall(c: number, r: number) {
  return (r === 1 && c >= 0 && c < COLS) || ((c === 0 || c === COLS - 1) && r >= 1 && r < ROWS);
}

export function zoneAt(c: number, r: number) {
  return ZONES.find(({ rect: [c0, r0, c1, r1] }) => c >= c0 && c <= c1 && r >= r0 && r <= r1);
}

/**
 * Perabot: `sprite` = berkas di public/office/pixel/furniture (huruf besar tanpa berkas = digambar
 * di kode: PRINTER, QUEUE, SIGN, WINDOW, DISPENSER, KIOSK, CABINET, BOX, CARDS), `at` = petak kiri-atas,
 * `size` = jejak petak (lebar, tinggi), `bg` = baris atas yang hanya latar (boleh dilewati di
 * belakangnya), `wall` = menempel di dinding, `surface` = diletakkan di atas meja (urutan gambar
 * sesudah meja), `front` = sandaran kursi/sofa yang menutupi orang yang duduk menghadap atas,
 * `dy` = geser gambar ke bawah (px) supaya barang benar-benar duduk di permukaan meja.
 */
export type Furniture = {
  sprite: string;
  at: Tile;
  size: [number, number];
  bg?: number;
  wall?: boolean;
  surface?: boolean;
  front?: boolean;
  /** frame animasi bergantian (mis. layar PC) */
  frames?: string[];
  dy?: number;
};

const desk = (at: Tile): Furniture => ({ sprite: "DESK_FRONT", at, size: [3, 2], bg: 1 });
const pcBack = (at: Tile): Furniture => ({
  sprite: "PC_BACK",
  at,
  size: [1, 2],
  bg: 1,
  surface: true,
  dy: 8,
});
const pcOn = (at: Tile): Furniture => ({
  sprite: "PC_FRONT_ON_1",
  frames: ["PC_FRONT_ON_1", "PC_FRONT_ON_2", "PC_FRONT_ON_3"],
  at,
  size: [1, 2],
  bg: 1,
  surface: true,
  dy: 8,
});
const chairFront = (at: Tile): Furniture => ({ sprite: "CUSHIONED_CHAIR_FRONT", at, size: [1, 1], bg: 1 });
const chairBack = (at: Tile): Furniture => ({
  sprite: "CUSHIONED_CHAIR_BACK",
  at,
  size: [1, 1],
  bg: 1,
  front: true,
});
const sofa = (at: Tile): Furniture => ({ sprite: "SOFA_BACK", at, size: [2, 1], bg: 1, front: true });

/** Papan nama instansi di dinding tengah (papan digambar di kanvas, teks di lapisan HTML). */
export const SIGN: Tile = [12, 0];

export const FURNITURE: Furniture[] = [
  // Dinding: papan pengumuman, layar nomor antrean, jendela, rak, lukisan.
  { sprite: "WHITEBOARD", at: [2, 0], size: [2, 2], wall: true },
  { sprite: "QUEUE", at: [5, 0], size: [2, 2], wall: true },
  { sprite: "CLOCK", at: [8, 0], size: [1, 2], wall: true },
  { sprite: "WINDOW", at: [10, 0], size: [2, 2], wall: true },
  { sprite: "SIGN", at: SIGN, size: [5, 2], wall: true },
  { sprite: "DOUBLE_BOOKSHELF", at: [17, 0], size: [2, 2], wall: true },
  { sprite: "CLOCK", at: [20, 0], size: [1, 2], wall: true },
  { sprite: "DOUBLE_BOOKSHELF", at: [21, 0], size: [2, 2], wall: true },
  { sprite: "LARGE_PAINTING", at: [24, 0], size: [2, 2], wall: true },
  { sprite: "WINDOW", at: [26, 0], size: [2, 2], wall: true },
  // Loket verifikasi: meja loket menutupi kaki petugas (duduk di balik loket, menghadap warga).
  desk([2, 3]),
  desk([6, 3]),
  pcBack([2, 2]),
  pcBack([8, 2]),
  chairFront([3, 3]),
  chairFront([7, 3]),
  { sprite: "PLANT", at: [9, 2], size: [1, 2], bg: 1 },
  { sprite: "PLANT_2", at: [1, 6], size: [1, 2], bg: 1 },
  // Entri & perekaman: petugas teknis membelakangi kita, layar PC menyala, lemari arsip.
  { ...desk([11, 3]), dy: 6 },
  { ...desk([15, 3]), dy: 6 },
  { ...pcOn([12, 2]), dy: 14 },
  { ...pcOn([16, 2]), dy: 14 },
  chairBack([12, 5]),
  chairBack([16, 5]),
  { sprite: "CABINET", at: [10, 2], size: [1, 2], bg: 1 },
  { sprite: "CABINET", at: [19, 2], size: [1, 2], bg: 1 },
  { sprite: "BIN", at: [10, 5], size: [1, 1] },
  // Ruang kepala: meja pimpinan di atas karpet, kursi tamu, rak arsip.
  desk([23, 4]),
  pcBack([25, 3]),
  chairFront([24, 4]),
  chairBack([23, 6]),
  chairBack([25, 6]),
  { sprite: "LARGE_PLANT", at: [27, 2], size: [2, 3], bg: 2 },
  { sprite: "PLANT", at: [20, 6], size: [1, 2], bg: 1 },
  // Ruang tunggu: sofa di atas karpet, dispenser, mesin tiket antrean dekat pintu.
  sofa([2, 12]),
  sofa([5, 12]),
  sofa([2, 14]),
  sofa([5, 14]),
  { sprite: "PLANT_2", at: [1, 10], size: [1, 2], bg: 1 },
  { sprite: "DISPENSER", at: [8, 11], size: [1, 2], bg: 1 },
  { sprite: "KIOSK", at: [7, 15], size: [1, 2], bg: 1 },
  { sprite: "CACTUS", at: [9, 15], size: [1, 2], bg: 1 },
  // Loket pengambilan: rak dokumen jadi, kardus berkas, bangku tunggu ambil dokumen.
  { sprite: "DOUBLE_BOOKSHELF", at: [11, 10], size: [2, 2], bg: 1 },
  { sprite: "DOUBLE_BOOKSHELF", at: [16, 10], size: [2, 2], bg: 1 },
  desk([13, 12]),
  pcBack([13, 11]),
  chairFront([14, 12]),
  { sprite: "BOX", at: [10, 12], size: [1, 1] },
  { sprite: "BOX", at: [10, 13], size: [1, 1] },
  { sprite: "WOODEN_BENCH", at: [17, 15], size: [1, 1] },
  { sprite: "WOODEN_BENCH", at: [18, 15], size: [1, 1] },
  // Ruang cetak: printer, lemari blangko, meja hasil cetak berisi tumpukan KTP, kardus.
  { sprite: "PRINTER", at: [21, 11], size: [2, 2], bg: 1 },
  { sprite: "CABINET", at: [24, 10], size: [1, 2], bg: 1 },
  { sprite: "SMALL_TABLE_FRONT", at: [25, 12], size: [2, 2], bg: 1 },
  { sprite: "CARDS", at: [25, 12], size: [1, 1], surface: true, dy: 4 },
  { sprite: "CARDS", at: [26, 12], size: [1, 1], surface: true, dy: 3 },
  { sprite: "PLANT", at: [28, 10], size: [1, 2], bg: 1 },
  { sprite: "BOX", at: [27, 15], size: [1, 1] },
  { sprite: "BOX", at: [28, 15], size: [1, 1] },
  { sprite: "BIN", at: [20, 15], size: [1, 1] },
];

/** Karpet (digambar di lantai, di bawah perabot): persegi petak + warna isi & tepi. */
export const RUGS: { rect: [number, number, number, number]; fill: string; edge: string }[] = [
  { rect: [1, 11, 7, 15], fill: "#9b4a3c", edge: "#d9a066" },
  { rect: [22, 3, 26, 7], fill: "#2f4f6f", edge: "#c9a227" },
  { rect: [4, 16, 5, 16], fill: "#5b5146", edge: "#3b342c" },
];

/**
 * Lembar karakter (16×32 per frame, 7 kolom × 3 baris) per peran, di public/office/pixel/chars.
 * Buatan sendiri dikonversi dengan `npm run sprite:sheet` (sumber di design/sprites);
 * yang masih `char_N` = pengganti sementara bawaan Pixel Agents.
 */
export const SHEETS = {
  loket: "pns-pria",
  teknis: "petugas-teknis-pria",
  pimpinan: "pimpinan-pria",
  kurir: "petugas-arsip",
  wargaA: "char_1",
  wargaB: "char_5",
} as const;
export type Sheet = keyof typeof SHEETS;
export const WARGA_SHEETS: Sheet[] = ["wargaA", "wargaB"];

/** Petugas yang duduk/berdiri di mejanya. Animasi kerja hanya bila zonanya ada berkas. */
export type Staff = {
  zone: OfficeRoomKey;
  sheet: Sheet;
  at: Tile;
  dir: Dir;
  sit: boolean;
  pose: "type" | "read";
};

export const STAFF: Staff[] = [
  { zone: "verifikasi", sheet: "loket", at: [3, 3], dir: "down", sit: true, pose: "type" },
  { zone: "verifikasi", sheet: "loket", at: [7, 3], dir: "down", sit: true, pose: "type" },
  { zone: "entri", sheet: "teknis", at: [12, 5], dir: "up", sit: true, pose: "type" },
  { zone: "entri", sheet: "teknis", at: [16, 5], dir: "up", sit: true, pose: "type" },
  { zone: "kepala", sheet: "pimpinan", at: [24, 4], dir: "down", sit: true, pose: "read" },
  { zone: "ambil", sheet: "loket", at: [14, 12], dir: "down", sit: true, pose: "type" },
  { zone: "cetak", sheet: "teknis", at: [21, 13], dir: "up", sit: false, pose: "type" },
];

/** Kursi tunggu untuk warga yang menunggu (jumlah mengikuti berkas di ruang tunggu). */
export const WAITING_SEATS: Tile[] = [
  [2, 12],
  [3, 12],
  [5, 12],
  [2, 14],
  [5, 14],
  [6, 14],
];

/** Langkah skrip pejalan: jalan ke `to`, lalu berpose selama `wait` detik. `hide` = keluar kantor. */
export type Step = {
  to: Tile;
  face: Dir;
  wait: number;
  pose?: "stand" | "sit" | "read";
  say?: string;
  hide?: boolean;
};
export type WalkerScript = { id: string; sheet: Sheet; start: Tile; delay: number; steps: Step[] };

export const WALKERS: WalkerScript[] = [
  {
    // Kurir berkas mengikuti alur tahapan, dari meja ke meja.
    id: "kurir",
    sheet: "kurir",
    start: [5, 5],
    delay: 0,
    steps: [
      { to: [5, 5], face: "up", wait: 2.4, say: "Berkas lengkap, saya antar" },
      { to: [14, 5], face: "up", wait: 2.4, say: "Untuk entri data" },
      { to: [24, 6], face: "up", wait: 2.4, say: "Mohon TTE, Pak" },
      { to: [22, 13], face: "left", wait: 2.4, say: "Siap dicetak" },
      { to: [16, 12], face: "left", wait: 2.4, say: "Dokumen siap diambil" },
    ],
  },
  {
    id: "warga-a",
    sheet: "wargaA",
    start: [4, 16],
    delay: 0.5,
    steps: [
      { to: [3, 5], face: "up", wait: 3, say: "Mau urus akta kelahiran" },
      { to: [3, 14], face: "up", wait: 6, pose: "read" },
      { to: [14, 14], face: "up", wait: 3, say: "Ambil dokumen, Bu" },
      { to: [4, 16], face: "down", wait: 4, hide: true },
    ],
  },
  {
    id: "warga-b",
    sheet: "wargaB",
    start: [5, 16],
    delay: 7,
    steps: [
      { to: [7, 5], face: "up", wait: 3, say: "Ini KK & KTP saya" },
      { to: [6, 12], face: "up", wait: 8, pose: "read" },
      { to: [5, 16], face: "down", wait: 5, hide: true },
    ],
  },
];
