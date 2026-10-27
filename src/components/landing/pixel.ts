// Mesin pixel-art landing page (teknik dari situs portofolio penulis, ardanicz-space): grid sel
// bertingkat putih → biru muda → biru tua, tingkat di antaranya berupa dither 2px, awan yang
// "mendidih" lewat noise Perlin. Warna dari token CSS --px-* (ikut tema terang/gelap).
// Animasi hanya berjalan saat terlihat, dan berhenti (satu frame diam) bila pengguna memilih
// "kurangi gerakan" atau menekan Jeda di kantor transparan (WCAG 2.2.2).

// --- Matematika & noise --------------------------------------------------------------

export const clamp = (value: number, min = 0, max = 1) => (value < min ? min : value > max ? max : value);
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

const PERMUTATION = (() => {
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = 20240611;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  const table = new Uint8Array(512);
  for (let i = 0; i < 512; i++) table[i] = p[i & 255];
  return table;
})();

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const GRADIENTS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const grad = (hash: number, x: number, y: number) => {
  const [gx, gy] = GRADIENTS[hash & 7];
  return gx * x + gy * y;
};

/** Perlin 2D klasik, kira-kira [-1, 1]. */
function perlin(x: number, y: number) {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const xf = x - X;
  const yf = y - Y;
  const P = PERMUTATION;
  const a = P[P[X & 255] + (Y & 255)];
  const b = P[P[X & 255] + (Y & 255) + 1];
  const c = P[P[(X & 255) + 1] + (Y & 255)];
  const d = P[P[(X & 255) + 1] + (Y & 255) + 1];
  const u = fade(xf);
  return lerp(
    lerp(grad(a, xf, yf), grad(c, xf - 1, yf), u),
    lerp(grad(b, xf, yf - 1), grad(d, xf - 1, yf - 1), u),
    fade(yf),
  );
}

/** Turbulensi yang pelan bergolak & bergeser ke barat (awan). */
export const turbulence = (u: number, v: number, time: number) =>
  perlin(u * 0.21 + time * 0.32, v * 0.31 + time * 0.045) * 0.72 +
  perlin(u * 0.47 - time * 0.13 + 19.1, v * 0.55 + time * 0.1 + 7.3) * 0.42 +
  perlin(u * 0.09 + time * 0.06 + 3.7, v * 0.14 - time * 0.035 + 11.9) * 0.75;

// --- Tingkat warna & palet -----------------------------------------------------------

/** Tingkat sel: putih → dither muda → muda → dither tua → tua, lalu tinta (garis). */
export const L = { White: 0, LightChecker: 1, Light: 2, DarkChecker: 3, Dark: 4, Ink: 5 } as const;
export type Level = (typeof L)[keyof typeof L];
export const EMPTY = 255;

export type Tone = "sky" | "dusk" | "dawn";

function readPalette(tone: Tone) {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  const accent = tone === "sky" ? "" : `-${tone}`;
  return {
    white: v("--px-white"),
    light: v(`--px${accent}-light`),
    dark: v(`--px${accent}-dark`),
    ink: v("--px-ink"),
  };
}

/** Dither 2px CSS dari dua warna, menempel ke titik asal kanvas. */
function checker(ctx: CanvasRenderingContext2D, base: string, accent: string, dpr: number) {
  const px = Math.max(1, Math.round(2 * dpr));
  const tile = document.createElement("canvas");
  tile.width = tile.height = px * 2;
  const t = tile.getContext("2d");
  if (!t) return base;
  t.fillStyle = base;
  t.fillRect(0, 0, px * 2, px * 2);
  t.fillStyle = accent;
  t.fillRect(px, 0, px, px);
  t.fillRect(0, px, px, px);
  return ctx.createPattern(tile, "repeat") ?? base;
}

function createFills(ctx: CanvasRenderingContext2D, tone: Tone, dpr: number) {
  const p = readPalette(tone);
  return [
    p.white,
    checker(ctx, p.white, p.light, dpr),
    p.light,
    checker(ctx, p.light, p.dark, dpr),
    p.dark,
    p.ink,
  ];
}

// --- Grid sel ------------------------------------------------------------------------

export type Painter = ReturnType<typeof createPainter>;

function createPainter(cols: number, rows: number) {
  const cells = new Uint8Array(cols * rows).fill(EMPTY);
  const set = (x: number, y: number, level: Level) => {
    if (x >= 0 && y >= 0 && x < cols && y < rows) cells[y * cols + x] = level;
  };
  const rect = (x: number, y: number, w: number, h: number, level: Level) => {
    for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) set(c, r, level);
  };
  /** Sprite berupa baris teks; karakter yang tidak ada di `key` dilewati. */
  const sprite = (art: readonly string[], x: number, y: number, key: Record<string, Level>) => {
    art.forEach((line, r) => {
      for (let c = 0; c < line.length; c++) if (line[c] in key) set(x + c, y + r, key[line[c]]);
    });
  };
  return { cols, rows, cells, set, rect, sprite };
}

// --- Gerak: "kurangi gerakan" + tombol Jeda di kantor ----------------------------------

let motionPaused = false;
const motionListeners = new Set<() => void>();

/** Dipanggil kantor transparan: Jeda/Putar di sana berlaku untuk semua animasi piksel halaman. */
export function setPixelMotion(playing: boolean) {
  if (motionPaused === !playing) return;
  motionPaused = !playing;
  for (const listener of motionListeners) listener();
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Aset gambar (mis. lembar karakter) selesai dimuat: kanvas yang diam menggambar ulang. */
export const ASSET_EVENT = "pixel-asset";

// --- Penjalan kanvas -----------------------------------------------------------------

export type PixelSpec = {
  /** Sisi sel dalam px CSS (genap, supaya dither 2px tetap tajam). */
  cell: number;
  /** Ukuran grid tetap; tanpa ini grid mengisi ukuran kanvas (ResizeObserver). */
  cols?: number;
  rows?: number;
  tone?: Tone;
  /** Frame per detik saat bergerak (awan cukup pelan, hemat CPU). */
  fps?: number;
  /** Detik simulasi untuk frame diam (gerak dimatikan). */
  still?: number;
  /** Isi grid untuk waktu `time` (detik). */
  draw: (p: Painter, time: number) => void;
  /** Gambar tambahan di atas sel (mis. sprite karakter), dalam px CSS. */
  overlay?: (ctx: CanvasRenderingContext2D, time: number, size: { width: number; height: number }) => void;
};

/** Jalankan `spec` di `canvas`; kembalikan fungsi pembersih. */
export function runPixel(canvas: HTMLCanvasElement, spec: PixelSpec) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const { cell, fps = 12, still = 2, tone = "sky" } = spec;
  let dpr = 1;
  let fills: (string | CanvasPattern)[] = [];
  let painter = createPainter(1, 1);
  let width = 0;
  let height = 0;
  let frameId = 0;
  let visible = false;
  let lastStep = -1;
  const origin = performance.now();

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = spec.cols ? spec.cols * cell : canvas.clientWidth;
    height = spec.rows ? spec.rows * cell : canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    painter = createPainter(spec.cols ?? Math.ceil(width / cell), spec.rows ?? Math.ceil(height / cell));
    fills = createFills(ctx, tone, dpr);
  };

  const render = (time: number) => {
    painter.cells.fill(EMPTY);
    spec.draw(painter, time);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Satu path per tingkat warna; tepi dibulatkan ke piksel perangkat supaya tidak ada celah.
    for (let level = 0; level < fills.length; level++) {
      ctx.fillStyle = fills[level];
      ctx.beginPath();
      painter.cells.forEach((value, i) => {
        if (value !== level) return;
        const x0 = Math.round((i % painter.cols) * cell * dpr);
        const y0 = Math.round(Math.floor(i / painter.cols) * cell * dpr);
        const x1 = Math.round(((i % painter.cols) + 1) * cell * dpr);
        const y1 = Math.round((Math.floor(i / painter.cols) + 1) * cell * dpr);
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
      });
      ctx.fill();
    }
    if (spec.overlay) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      spec.overlay(ctx, time, { width, height });
    }
  };

  const moving = () => !motionPaused && !reducedMotion();
  const loop = (now: number) => {
    frameId = requestAnimationFrame(loop);
    const time = (now - origin) / 1000;
    const step = Math.floor(time * fps);
    if (step === lastStep) return;
    lastStep = step;
    render(step / fps);
  };
  const update = () => {
    cancelAnimationFrame(frameId);
    if (visible && moving()) frameId = requestAnimationFrame(loop);
    else render(still);
  };

  resize();
  render(still);
  const resizeObserver = new ResizeObserver(() => {
    resize();
    lastStep = -1;
    if (!moving() || !visible) render(still);
  });
  resizeObserver.observe(canvas);
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  });
  visibility.observe(canvas);
  // Ganti tema = warna token berubah: buat ulang isian lalu gambar ulang.
  const theme = new MutationObserver(() => {
    fills = createFills(ctx, tone, dpr);
    lastStep = -1;
    if (!moving() || !visible) render(still);
  });
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  motionListeners.add(update);
  const redraw = () => {
    lastStep = -1;
    if (!moving() || !visible) render(still);
  };
  window.addEventListener(ASSET_EVENT, redraw);

  return () => {
    window.removeEventListener(ASSET_EVENT, redraw);
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    visibility.disconnect();
    theme.disconnect();
    motionListeners.delete(update);
  };
}
