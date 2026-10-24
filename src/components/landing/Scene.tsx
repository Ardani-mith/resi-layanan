import type { ReactNode } from "react";

/**
 * Pemandangan bukit bergaya foto (SVG murni, tanpa berkas gambar): langit bergradasi,
 * matahari berpendar, tiga lapis bukit, dan grain halus. Waktu hari mengikuti cerita
 * "satu resi": pagi (warga mengajukan), siang (petugas bekerja), senja (pimpinan memantau).
 * Satu varian dipakai sekali per halaman, jadi id gradien cukup memakai nama varian.
 */
const SCENES = {
  pagi: {
    sky: ["#a9c6e3", "#e9d6c3", "#f6dcc0"],
    sun: { x: 300, y: 150, r: 26, color: "#fff4df" },
    hills: ["#b9b7a6", "#8f9479", "#5f6a4c"],
  },
  siang: {
    sky: ["#5f93cc", "#9cc2e4", "#d9e7f1"],
    sun: { x: 92, y: 62, r: 20, color: "#fffbe9" },
    hills: ["#9fae9b", "#6f875f", "#4c6339"],
  },
  senja: {
    sky: ["#4f6497", "#c98e6e", "#f0a55c"],
    sun: { x: 210, y: 168, r: 30, color: "#ffd9a0" },
    hills: ["#8a6f5c", "#6b4f3a", "#3f2f22"],
  },
} as const;

export type SceneName = keyof typeof SCENES;

// Siluet bukit (lebar 400, tinggi 250), dari jauh ke dekat.
// prettier-ignore
const HILLS = [
  "M0 172 C 40 150 90 140 140 156 S 230 132 290 148 S 370 140 400 150 L400 250 L0 250 Z",
  "M0 196 C 50 176 110 182 160 170 S 260 186 320 172 S 380 180 400 176 L400 250 L0 250 Z",
  "M0 222 C 60 206 120 214 190 204 S 300 220 360 208 S 390 212 400 210 L400 250 L0 250 Z",
];

export default function Scene({ name, children }: { name: SceneName; children?: ReactNode }) {
  const scene = SCENES[name];
  const id = `scene-${name}`;
  return (
    <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/10] lg:aspect-[4/3] xl:aspect-[16/10]">
      <svg
        aria-hidden
        viewBox="0 0 400 250"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={scene.sky[0]} />
            <stop offset="0.6" stopColor={scene.sky[1]} />
            <stop offset="1" stopColor={scene.sky[2]} />
          </linearGradient>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0" stopColor={scene.sun.color} stopOpacity="0.9" />
            <stop offset="1" stopColor={scene.sun.color} stopOpacity="0" />
          </radialGradient>
          {/* Grain seperti foto: noise halus yang dicampur tipis di atas semuanya. */}
          <filter id={`${id}-grain`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <rect width="400" height="250" fill={`url(#${id}-sky)`} />
        <circle cx={scene.sun.x} cy={scene.sun.y} r={scene.sun.r * 4} fill={`url(#${id}-glow)`} />
        <circle cx={scene.sun.x} cy={scene.sun.y} r={scene.sun.r} fill={scene.sun.color} />
        {HILLS.map((d, i) => (
          <path key={d} d={d} fill={scene.hills[i]} />
        ))}
        <rect width="400" height="250" fill={`url(#${id}-haze)`} />
        <rect
          width="400"
          height="250"
          filter={`url(#${id}-grain)`}
          opacity="0.12"
          style={{ mixBlendMode: "overlay" }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center p-5 sm:p-6">{children}</div>}
    </div>
  );
}

/** Kartu "kaca gelap" di atas pemandangan (gaya referensi): teks putih, tepi tipis. */
export function GlassCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[19rem] rounded-md border border-white/15 bg-[#1b1f24]/60 p-4 text-white shadow-[0_20px_40px_-12px_rgb(0_0_0/0.45)] backdrop-blur-md">
      {children}
    </div>
  );
}
