"use client";

import type { PointerEvent } from "react";
import { maskStyle } from "@/components/Logo";

// Wordmark "Pantas" raksasa di dasar footer. Hurufnya gradien putih yang memudar ke bawah, dan
// menyala biru di sekitar kursor (diadaptasi dari "Text Hover Effect", Aceternity UI). Hiasan saja.

function track(event: PointerEvent<HTMLDivElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  el.style.setProperty("--my", `${event.clientY - rect.top}px`);
}

export default function FooterWordmark() {
  const mask = maskStyle("/brand/pantas-wordmark.png");
  return (
    // 1150×366 = ukuran pantas-wordmark.png
    <div aria-hidden onPointerMove={track} className="group/wm relative aspect-[1150/366] w-full select-none">
      <div
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(255_255_255/0.28)_5%,rgb(255_255_255/0.04)_80%)]"
        style={mask}
      />
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/wm:opacity-100"
        style={{
          ...mask,
          background:
            "radial-gradient(28rem circle at var(--mx) var(--my), #9dbcff 0%, #4f7fff 30%, transparent 70%)",
        }}
      />
    </div>
  );
}
