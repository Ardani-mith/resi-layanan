"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { AssistantAnswer } from "@/lib/assist";
import { cn } from "@/lib/cn";
import { postJson } from "@/lib/http";
import type { QuestionId } from "@/lib/validators";

type Question = { id: QuestionId; label: string };
/** null = sedang dimuat; `{ error }` = gagal (pesan singkat di kartu). */
type Slot = AssistantAnswer | { error: string } | null;

/** Teks muncul bertahap seperti sedang diketik; "kurangi gerakan" = langsung utuh. */
function Typed({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setInterval(() => {
      setShown((n) => {
        const next = instant ? text.length : Math.min(text.length, n + 2);
        if (next >= text.length) clearInterval(timer);
        return next;
      });
    }, 14);
    return () => clearInterval(timer);
  }, [text]);
  const typing = shown < text.length;
  return (
    <>
      {/* Pembaca layar mendapat teks utuh sekali, bukan per huruf. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, shown)}
        {typing && (
          <span className="ml-0.5 inline-block h-[1.1em] w-0.5 translate-y-[0.2em] bg-hero-accent motion-safe:animate-pulse" />
        )}
      </span>
    </>
  );
}

/** Kerangka teks di atas latar gelap. */
function Lines({ count }: { count: number }) {
  return (
    <span className="block space-y-2 py-1" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            "block h-3.5 rounded-full bg-white/10 motion-safe:animate-pulse",
            i === count - 1 ? "w-2/3" : "w-full",
          )}
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

/** Isi kotak jawaban: kerangka saat dimuat, pesan saat gagal, atau teks yang "diketik". */
function SlotText({ slot, lines, id }: { slot: Slot | undefined; lines: number; id: string }) {
  if (!slot) return <Lines count={lines} />;
  if ("error" in slot) return <span className="text-hero-muted">{slot.error}</span>;
  return <Typed key={id} text={slot.text} />;
}

/**
 * Asisten Pantas di kepala halaman lacak: ringkasan status yang dituturkan AI, pertanyaan
 * template (sesuai status), dan kolom tanya bebas (maks. `limit` per resi per hari, hanya bila
 * AI aktif). Semua jawaban bersumber dari data resi ini (lib/assist.ts); tanpa AI, jawaban
 * dasarnya tetap tampil. Dipasang dengan `key` status, jadi berganti status = mulai ulang.
 */
export default function Assistant({
  resi,
  questions,
  canAsk,
  limit,
}: {
  resi: string;
  questions: Question[];
  /** Tanya bebas tersedia (API key AI diisi). */
  canAsk: boolean;
  /** Batas tanya bebas per hari. */
  limit: number;
}) {
  const url = `/api/track/${resi}/assistant`;
  const [summary, setSummary] = useState<Slot>(null);
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, Slot>>>({});
  const [custom, setCustom] = useState<{ question: string; slot: Slot } | null>(null);
  const [active, setActive] = useState<QuestionId | "custom" | null>(null);
  const [draft, setDraft] = useState("");
  /** Sisa jatah tanya bebas hari ini; null = belum diketahui (belum bertanya). */
  const [remaining, setRemaining] = useState<number | null>(null);

  // Satu request ringkasan per pemasangan; dibatalkan bila komponen dilepas lebih dulu
  // (mis. efek ganda React Strict Mode saat dev, atau pindah halaman).
  useEffect(() => {
    const controller = new AbortController();
    postJson<AssistantAnswer>(url, { question: null }, controller.signal).then((res) => {
      if (!controller.signal.aborted)
        setSummary(res.ok ? res.data : { error: "Ringkasan belum bisa dimuat." });
    });
    return () => controller.abort();
  }, [url]);

  async function ask(id: QuestionId) {
    setActive(id);
    if (answers[id] && !("error" in answers[id])) return;
    setAnswers((a) => ({ ...a, [id]: null }));
    const res = await postJson<AssistantAnswer>(url, { question: id });
    setAnswers((a) => ({ ...a, [id]: res.ok ? res.data : { error: res.error.message } }));
  }

  const asking = active === "custom" && custom?.slot === null;

  async function askFree(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || asking) return;
    setActive("custom");
    setCustom({ question, slot: null });
    const res = await postJson<AssistantAnswer & { remaining: number }>(url, { ask: question });
    if (res.ok) {
      setCustom({ question, slot: res.data });
      setRemaining(res.data.remaining);
      setDraft("");
    } else {
      setCustom({ question, slot: { error: res.error.fields.ask ?? res.error.message } });
      if (res.status === 429) setRemaining(0);
    }
  }

  const slots = [summary, custom?.slot, ...Object.values(answers)];
  const usedAi = slots.some((s) => s && "source" in s && s.source === "ai");
  const activeLabel = active === "custom" ? custom?.question : questions.find((q) => q.id === active)?.label;
  const activeSlot = active === "custom" ? custom?.slot : active ? answers[active] : undefined;
  const exhausted = remaining === 0;

  return (
    <section
      aria-labelledby="assistant-title"
      className="relative mt-8 overflow-hidden rounded-2xl border border-hero-line bg-white/[0.05] p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_24px_60px_-30px_rgb(0_0_0/0.6)] backdrop-blur-md sm:p-6"
    >
      {/* Aksen "AI": garis gradien di tepi atas + pendar ungu di sudut. */}
      <div
        aria-hidden
        className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-[#b4a3ff] to-transparent"
      />
      <div aria-hidden className="absolute -top-24 -right-16 size-64 rounded-full bg-[#8b7bff]/20 blur-3xl" />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="assistant-title" className="flex items-center gap-2.5 text-sm font-semibold">
            <span
              aria-hidden
              className="grid size-7 place-items-center rounded-lg bg-linear-to-br from-[#7c9cff] to-[#b07cff] shadow-[0_6px_18px_-6px_#8b7bff]"
            >
              <Sparkles className="size-4 text-white" />
            </span>
            Asisten Pantas
          </h2>
          <span className="text-xs text-hero-muted">
            {usedAi
              ? "Dibantu AI · acuan resmi tetap data di halaman ini"
              : "Jawaban otomatis dari data resi ini"}
          </span>
        </div>

        <p aria-live="polite" className="mt-3 max-w-4xl text-base leading-relaxed text-hero-fg sm:text-lg">
          <SlotText slot={summary} lines={2} id="summary" />
        </p>

        {questions.length > 0 && (
          <div className="mt-5">
            <p className="text-xs text-hero-muted">Tanya asisten</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {questions.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  aria-pressed={active === q.id}
                  aria-controls="assistant-answer"
                  onClick={() => ask(q.id)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    active === q.id
                      ? "border-white bg-white font-medium text-[#0c1f5c]"
                      : "border-hero-line bg-hero-chip text-hero-muted hover:border-hero-line-strong hover:text-hero-fg",
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {canAsk && (
          <form method="post" onSubmit={askFree} className="mt-4 max-w-2xl">
            <label htmlFor="assistant-ask" className="sr-only">
              Tanya hal lain tentang permohonan ini
            </label>
            <div className="flex items-center gap-2 rounded-full border border-hero-line bg-black/20 py-1.5 pr-1.5 pl-4 transition-colors focus-within:border-hero-line-strong focus-within:ring-4 focus-within:ring-white/10">
              <input
                id="assistant-ask"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={160}
                autoComplete="off"
                disabled={exhausted}
                placeholder={
                  exhausted
                    ? "Jatah pertanyaan hari ini sudah habis"
                    : "Tanya hal lain tentang permohonan ini…"
                }
                aria-describedby="assistant-ask-hint"
                className="min-w-0 flex-1 bg-transparent text-sm text-hero-fg outline-none placeholder:text-hero-muted/70 disabled:cursor-not-allowed sm:text-base"
              />
              <button
                type="submit"
                aria-label="Kirim pertanyaan"
                disabled={exhausted || asking || draft.trim().length < 5}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#7c9cff] to-[#b07cff] text-white shadow-[0_6px_18px_-6px_#8b7bff] transition-opacity disabled:opacity-40"
              >
                <ArrowUp aria-hidden className={cn("size-4", asking && "motion-safe:animate-bounce")} />
              </button>
            </div>
            <p id="assistant-ask-hint" className="mt-2 px-4 text-xs text-hero-muted">
              {remaining === null
                ? `Maks. ${limit} pertanyaan per hari`
                : `Sisa ${remaining} dari ${limit} pertanyaan hari ini`}{" "}
              · jangan tulis NIK atau nomor HP
            </p>
          </form>
        )}

        {active && (
          <div
            id="assistant-answer"
            aria-live="polite"
            className="mt-4 rounded-xl border border-hero-line bg-black/20 px-4 py-3.5 text-sm leading-relaxed sm:text-base"
          >
            <p className="mb-1.5 text-xs text-hero-muted">“{activeLabel}”</p>
            <SlotText
              slot={activeSlot}
              lines={3}
              id={active === "custom" ? `custom-${custom?.question}` : active}
            />
          </div>
        )}
      </div>
    </section>
  );
}
