import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Token desain dari globals.css (@theme). tailwind-merge perlu tau bahwa ini WARNA,
// kalau tidak `text-muted` dikira ukuran font dan bisa membuang `text-sm` saat digabung.
// prettier-ignore
const COLORS = [
  "bg", "surface", "surface-2", "text", "muted", "line",
  "brand", "brand-strong", "brand-soft", "on-brand",
  "ok", "ok-soft", "run", "run-soft", "warn", "warn-soft",
  "late", "late-soft", "pause", "pause-soft",
  "chart", "chart-track", "grid",
  "hero-fg", "hero-muted", "hero-soft", "hero-line", "hero-line-strong",
  "hero-accent", "hero-alert", "hero-chip", "nav-fg", "nav-muted",
];

const twMerge = extendTailwindMerge({
  extend: {
    theme: { color: COLORS, radius: ["card"], shadow: ["card"] },
  },
});

/**
 * Gabungkan class kondisional (clsx) lalu selesaikan konflik Tailwind: class yang
 * datang belakangan menang, mis. cn("px-4", props.className) dengan className="px-6".
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
