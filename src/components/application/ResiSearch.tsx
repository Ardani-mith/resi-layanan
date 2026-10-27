"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { isValidResi, normalizeResi } from "@/lib/resi";

// "hero" = di atas latar hero landing page: warna teks dari token hero-*, input lebih besar.
const VARIANTS = {
  default: { helper: "text-muted", error: "text-late", example: "text-brand", input: "min-h-13" },
  hero: {
    helper: "text-hero-muted",
    error: "text-hero-alert",
    example: "text-hero-fg",
    input: "min-h-14 shadow-lg",
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
      <div className="flex flex-col gap-2 sm:flex-row">
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
            "flex-1 rounded-xl border border-line bg-surface px-4 font-mono text-lg tracking-wider uppercase outline-none placeholder:text-muted/60 focus:border-brand aria-invalid:border-late",
            tone.input,
          )}
        />
        <button
          type="submit"
          className={cn(
            "rounded-xl bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong",
            tone.input,
          )}
        >
          Lacak
        </button>
      </div>
      <p id={`${id}-message`} className={cn("mt-2 text-sm", error ? tone.error : tone.helper)}>
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
