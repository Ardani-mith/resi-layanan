"use client";

import { catchError, type ErrorInfo } from "next/error";

/**
 * Batas error untuk satu bagian halaman (Next `catchError`): jika bagian di dalamnya
 * gagal (mis. database tidak terjangkau), hanya bagian ini yang diganti pesan, sisa
 * halaman tetap jalan. Sinyal internal Next (redirect, notFound, prerender) tidak ikut
 * tertangkap. `retry` memuat ulang bagian ini saja.
 */
function SectionErrorFallback(
  { message = "Bagian ini sementara tidak dapat dimuat." }: { message?: string },
  { retry }: ErrorInfo,
) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-5 text-sm text-muted"
    >
      <p>{message}</p>
      <button type="button" onClick={() => retry()} className="font-semibold text-brand hover:underline">
        Coba lagi
      </button>
    </div>
  );
}

export default catchError(SectionErrorFallback);
