"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidResi, normalizeResi } from "@/lib/resi-format";

/** Form cek resi: validasi format di browser, lalu buka /lacak/[resi]. */
export default function ResiSearch({ example, autoFocus = false }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const resi = normalizeResi(value);
    if (!isValidResi(resi)) {
      setError(`Format resi: RL-XXXX-XXXX, contoh ${example}.`);
      return;
    }
    router.push(`/lacak/${resi}`);
  }

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <label htmlFor="resi" className="sr-only">Nomor resi</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="resi"
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
          aria-describedby="resi-message"
          className="min-h-13 flex-1 rounded-xl border border-line bg-surface px-4 font-mono text-lg tracking-wider uppercase outline-none placeholder:text-muted/60 focus:border-brand aria-invalid:border-late"
        />
        <button type="submit" className="min-h-13 rounded-xl bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong">
          Lacak
        </button>
      </div>
      <p id="resi-message" className={`mt-2 text-sm ${error ? "text-late" : "text-muted"}`}>
        {error || (
          <>
            Coba resi demo{" "}
            <button type="button" onClick={() => setValue(example)} className="font-mono font-semibold text-brand underline-offset-2 hover:underline">
              {example}
            </button>
          </>
        )}
      </p>
    </form>
  );
}
