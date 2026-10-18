import { cn } from "@/lib/cn";

/** Label kecil berhuruf kapital dengan titik persegi. `tone="dark"` untuk latar navy. */
export function Eyebrow({ tone = "light", className, children }) {
  return (
    <p
      className={cn(
        "flex w-fit items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold tracking-[0.08em] uppercase",
        tone === "dark" ? "bg-white/10 text-white/85" : "bg-brand-soft text-brand",
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5", tone === "dark" ? "bg-sky-300" : "bg-brand")} />
      {children}
    </p>
  );
}

/** Pita garis miring pemisah bagian (gaya blueprint). */
export function Hatch({ className }) {
  return <div aria-hidden className={cn("h-9 border-y border-white/10 pattern-hatch", className)} />;
}

function Crosshair({ className }) {
  return (
    <span className={cn("absolute size-[11px] -translate-x-1/2 -translate-y-1/2", className)}>
      <span className="absolute top-0 left-[5px] h-full w-px bg-white/40" />
      <span className="absolute top-[5px] left-0 h-px w-full bg-white/40" />
    </span>
  );
}

/** Garis panduan tipis dengan tanda "+" di persilangan; hanya di layar lebar. */
export function GuideLines() {
  const line = "absolute bg-white/[0.07]";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      <span className={cn(line, "inset-y-0 left-0 w-px")} />
      <span className={cn(line, "inset-y-0 right-0 w-px")} />
      <span className={cn(line, "inset-x-0 top-10 h-px")} />
      <Crosshair className="top-10 left-0" />
      <Crosshair className="top-10 left-full" />
    </div>
  );
}
