"use client";

import { MousePointerClick } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ORB_LABEL, OrbCanvas, type OrbMode, Typed } from "@/components/AiOrb";
import type { site } from "@/config/site";
import { cn } from "@/lib/cn";

// Demo Asisten Pantas di beranda (tiruan kartu di halaman lacak, tanpa memanggil AI): klik
// pertanyaan → orb "berpikir" sebentar → "menjawab" sambil jawaban diketik → kembali siap.
// Orb juga bereaksi pada kursor (kilau & tepi mengikuti) dan klik (tepi memantul).

type Demo = typeof site.assistant.demo;

const THINK_MS = 1100;
const ANSWER_MS = 2400;

export default function AssistantDemo({ demo, resi }: { demo: Demo; resi: string }) {
  const [active, setActive] = useState<number>(demo.initial);
  const [mode, setMode] = useState<OrbMode>("idle");
  /** Jawaban awal tampil utuh (tanpa animasi); setelah diklik, jawaban diketik. */
  const [typed, setTyped] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const ask = (i: number) => {
    if (mode === "thinking" || (i === active && typed)) return;
    timers.current.forEach(clearTimeout);
    setActive(i);
    setMode("thinking");
    timers.current = [
      setTimeout(() => {
        setTyped(true);
        setMode("answering");
      }, THINK_MS),
      setTimeout(() => setMode("idle"), THINK_MS + ANSWER_MS),
    ];
  };

  const question = demo.questions[active];
  const thinking = mode === "thinking";

  return (
    <div className="reveal relative overflow-hidden rounded-3xl border border-hero-line bg-white/[0.05] p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_30px_70px_-30px_rgb(0_0_0/0.7)] backdrop-blur-md sm:p-7">
      <div
        aria-hidden
        className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-[#b4a3ff] to-transparent"
      />
      <div
        aria-hidden
        className={cn(
          "absolute -top-24 -right-16 size-72 rounded-full bg-[#8b7bff]/20 blur-3xl transition-colors duration-700",
          mode !== "idle" && "bg-[#8b7bff]/35",
        )}
      />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_11rem] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2.5 text-sm font-semibold text-hero-fg">
              {/* HP: orb kecil sebagai avatar; desktop: orb besar di kolom kanan. */}
              <span className="lg:hidden">
                <OrbCanvas mode={mode} size={28} />
              </span>
              Asisten Pantas
            </p>
            <span className="font-mono text-xs text-hero-muted">{resi}</span>
          </div>
          <p className="mt-4 text-base leading-relaxed text-hero-fg sm:text-lg">{demo.summary}</p>

          <p className="mt-5 flex items-center gap-1.5 text-xs text-hero-muted">
            <MousePointerClick aria-hidden className="size-3.5" />
            {demo.hint}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {demo.questions.map((q, i) => (
              <button
                key={q.label}
                type="button"
                aria-pressed={i === active}
                onClick={() => ask(i)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition duration-200 active:scale-[0.97] motion-reduce:transform-none",
                  i === active
                    ? "border-white bg-white font-medium text-[#0c1f5c] shadow-[0_0_24px_-4px_rgb(180_163_255/0.7)]"
                    : "border-hero-line bg-hero-chip text-hero-muted hover:-translate-y-px hover:border-hero-line-strong hover:text-hero-fg",
                )}
              >
                {q.label}
              </button>
            ))}
          </div>

          <div
            data-seq
            aria-live="polite"
            className="mt-4 min-h-[9.75rem] rounded-xl border border-hero-line bg-black/20 px-4 py-3.5 text-sm leading-relaxed text-hero-fg sm:text-base"
          >
            <p className="mb-1.5 text-xs text-hero-muted">“{question.label}”</p>
            {thinking ? (
              <span className="flex items-center gap-2 text-hero-muted">
                {ORB_LABEL.thinking}
                <span aria-hidden className="flex gap-0.5">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="size-1 rounded-full bg-hero-accent motion-safe:animate-dot-bounce"
                      style={{ animationDelay: `${d * 150}ms` }}
                    />
                  ))}
                </span>
              </span>
            ) : typed ? (
              <Typed key={active} text={question.answer} />
            ) : (
              question.answer
            )}
          </div>
        </div>

        {/* Orb besar + status (desktop): hidup mengikuti kursor & pertanyaan yang diklik. */}
        <div aria-hidden className="hidden flex-col items-center gap-4 lg:flex">
          <OrbCanvas mode={mode} size={150} />
          <span className="text-sm font-medium whitespace-nowrap text-hero-muted">
            <span key={mode} className="motion-safe:animate-fade-up">
              {ORB_LABEL[mode]}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
