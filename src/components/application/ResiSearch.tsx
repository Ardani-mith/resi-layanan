"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { isValidResi, normalizeResi } from "@/lib/resi";

// "hero" = di atas latar gelap hero beranda: satu kartu (kolom + tombol panah bulat di dalamnya),
// teks bantuan dari token hero-*.
const VARIANTS = {
  default: {
    helper: "text-muted",
    error: "text-late",
    example: "text-brand",
    row: "flex flex-col gap-2 sm:flex-row",
    input:
      "min-h-13 rounded-xl border border-line bg-surface px-4 focus:border-brand aria-invalid:border-late",
    button: "min-h-13 rounded-xl px-6",
  },
  hero: {
    helper: "text-hero-muted",
    error: "text-hero-alert",
    example: "text-hero-fg",
    row: "flex items-center gap-2 rounded-2xl bg-surface p-2 pl-5 shadow-[0_24px_60px_-20px_rgb(2_8_30/0.7)] ring-1 ring-white/20 focus-within:ring-4 focus-within:ring-white/30",
    input: "min-h-12 min-w-0 bg-transparent",
    button: "grid size-12 shrink-0 place-items-center rounded-full shadow-[0_8px_20px_-6px_var(--brand)]",
  },
};

/** Form cek resi: validasi format di browser, lalu buka /lacak/[resi]. */
export default function ResiSearch({
  example,
  autoFocus = false,
  variant = "default",
}: {
  example: string;
  autoFocus?: boolean;
  variant?: keyof typeof VARIANTS;
}) {
  const tone = VARIANTS[variant];
  // Bisa ada dua kolom cek resi di satu halaman (hero & penutup beranda): ID harus unik.
  const id = useId();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const resi = normalizeResi(value);
    if (!isValidResi(resi)) {
      setError(`Format resi: RL-XXXX-XXXX, contoh ${example}.`);
      return;
    }
    // Maju ke halaman lacak: konten bergeser ke kiri (PageSlide + view-transitions.css).
    router.push(`/lacak/${resi}`, { transitionTypes: ["nav-forward"] });
  }

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <label htmlFor={id} className="sr-only">
        Nomor resi
      </label>
      <div className={tone.row}>
        <input
          id={id}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError("");
          }}
          placeholder={example}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-message`}
          className={cn(
            "flex-1 font-mono text-lg tracking-wider uppercase outline-none placeholder:text-muted/60",
            tone.input,
          )}
        />
        <button
          type="submit"
          aria-label={variant === "hero" ? "Lacak" : undefined}
          className={cn(
            "bg-brand font-semibold text-on-brand transition-colors hover:bg-brand-strong",
            tone.button,
          )}
        >
          {variant === "hero" ? <ArrowRight aria-hidden className="size-5" /> : "Lacak"}
        </button>
      </div>
      <p
        id={`${id}-message`}
        className={cn("mt-3 text-sm", variant === "hero" && "text-center", error ? tone.error : tone.helper)}
      >
        {error || (
          <>
            Coba resi demo{" "}
            <button
              type="button"
              onClick={() => setValue(example)}
              className={cn("font-mono font-semibold underline-offset-2 hover:underline", tone.example)}
            >
              {example}
            </button>
          </>
        )}
      </p>
    </form>
  );
}
