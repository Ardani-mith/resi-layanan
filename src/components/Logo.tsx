// Logo Pantas dari aset brand (public/brand/pantas-logo.png). Gambarnya hitam di atas latar
// transparan, jadi dipakai sebagai mask: warnanya ikut currentColor dan berganti sendiri di
// tema gelap. Versi web yang dipangkas: pantas-wordmark.png & pantas-p.png (P saja).

import { site } from "@/config/site";
import { cn } from "@/lib/cn";

const maskStyle = (src: string) => ({
  maskImage: `url(${src})`,
  maskSize: "contain",
  maskRepeat: "no-repeat",
  maskPosition: "center",
});

/** Logo kata "Pantas". Tinggi = 1em, jadi ukuran diatur lewat font-size (mis. text-2xl). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label={site.name}
      // 1150×366 = ukuran pantas-wordmark.png
      className={cn("inline-block aspect-[1150/366] h-[1em] bg-current", className)}
      style={maskStyle("/brand/pantas-wordmark.png")}
    />
  );
}

/** Ikon persegi (navy tetap di kedua tema) untuk ruang sempit, mis. navbar di HP. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-[#0f1b2d] text-white ring-1 ring-white/10",
        className,
      )}
    >
      {/* 293×358 = ukuran pantas-p.png */}
      <span className="aspect-[293/358] h-[64%] bg-current" style={maskStyle("/brand/pantas-p.png")} />
    </span>
  );
}
