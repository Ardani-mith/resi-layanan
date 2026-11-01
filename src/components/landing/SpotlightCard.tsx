"use client";

import type { PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

// Kartu dengan sorot cahaya yang mengikuti kursor (diadaptasi dari "Card Spotlight", Aceternity UI):
// lingkaran biru lembut di isi kartu + tepi yang ikut menyala. Posisi kursor disimpan sebagai
// variabel CSS (--spot-x/y, dan --tilt-x/y untuk efek miring 3D "3D Card" di anak kartu), jadi
// tidak ada render ulang React. Anak kartu bisa bereaksi lewat varian `spot-on:`. Layar sentuh:
// kartu biasa.

function track(event: PointerEvent<HTMLDivElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
  el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  // Miring maksimal ±6°, berlawanan dengan posisi kursor (kartu "condong" ke arah kursor).
  el.style.setProperty("--tilt-x", `${(0.5 - (event.clientY - rect.top) / rect.height) * 12}deg`);
  el.style.setProperty("--tilt-y", `${((event.clientX - rect.left) / rect.width - 0.5) * 12}deg`);
}

function reset(event: PointerEvent<HTMLDivElement>) {
  event.currentTarget.style.setProperty("--tilt-x", "0deg");
  event.currentTarget.style.setProperty("--tilt-y", "0deg");
}

export default function SpotlightCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      onPointerMove={track}
      onPointerLeave={reset}
      className={cn(
        "group/spot relative isolate overflow-hidden rounded-3xl border border-line bg-surface shadow-card",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 spot-on:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--spot-x) var(--spot-y), color-mix(in srgb, var(--brand) 12%, transparent), transparent 70%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] spot-border opacity-0 transition-opacity duration-300 spot-on:opacity-100"
      />
      {children}
    </div>
  );
}
