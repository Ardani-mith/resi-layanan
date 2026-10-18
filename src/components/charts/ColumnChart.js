"use client";

import { useId, useState } from "react";
import { formatPercent } from "@/lib/format";

const TICKS = [0, 0.5, 1];
// Prop dari Server Component harus bisa diserialisasi, jadi formatnya berupa nama, bukan fungsi.
const FORMATTERS = { percent: formatPercent };

/**
 * Grafik kolom satu seri untuk rasio 0–1 (mis. % tepat waktu per minggu).
 * - Kolom ≤24px, ujung data membulat 4px, tumbuh dari satu garis dasar.
 * - Tooltip per kolom saat hover DAN fokus keyboard; nilai yang sama ada di tabel.
 * - Label langsung hanya di titik terakhir (selektif).
 * data: [{ label, value: number|null, detail?: string }]
 */
export default function ColumnChart({ title, description, data, format = "percent", emptyLabel = "Tidak ada data" }) {
  const formatValue = FORMATTERS[format];
  const [active, setActive] = useState(null);
  const id = useId();
  const lastIndex = data.findLastIndex((d) => d.value !== null);

  return (
    <figure className="rounded-card border border-line bg-surface p-5" aria-labelledby={`${id}-title`}>
      <figcaption>
        <h2 id={`${id}-title`} className="text-lg font-bold">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </figcaption>

      <div className="relative mt-6 h-48 pl-10">
        {/* Garis bantu & label sumbu Y */}
        {TICKS.map((t) => (
          <div key={t} aria-hidden className="absolute right-0 left-10 border-t border-grid" style={{ bottom: `${t * 100}%` }}>
            <span className="absolute -top-2.5 -left-10 w-8 text-right text-xs text-muted tabular-nums">{formatValue(t)}</span>
          </div>
        ))}

        <div className="absolute inset-0 left-10 flex items-end justify-around" onPointerLeave={() => setActive(null)}>
          {data.map((d, i) => (
            <button
              key={d.label}
              type="button"
              aria-label={`${d.label}: ${d.value === null ? emptyLabel : formatValue(d.value)}${d.detail ? `, ${d.detail}` : ""}`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group relative flex h-full flex-1 items-end justify-center outline-none"
            >
              {d.value === null ? (
                <span aria-hidden className="mb-1 text-xs text-muted">—</span>
              ) : (
                <span
                  aria-hidden
                  className={`w-full max-w-6 rounded-t-[4px] bg-chart transition-opacity ${
                    active !== null && active !== i ? "opacity-50" : ""
                  } group-focus-visible:ring-2 group-focus-visible:ring-brand group-focus-visible:ring-offset-2`}
                  style={{ height: `${Math.max(d.value * 100, 1)}%` }}
                />
              )}
              {i === lastIndex && active === null && (
                <span aria-hidden className="absolute text-xs font-semibold" style={{ bottom: `calc(${d.value * 100}% + 4px)` }}>
                  {formatValue(d.value)}
                </span>
              )}
              {active === i && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute z-10 w-max max-w-40 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-left shadow-card"
                  style={{ bottom: `calc(${(d.value ?? 0) * 100}% + 8px)` }}
                >
                  <span className="block text-sm font-semibold">{d.value === null ? emptyLabel : formatValue(d.value)}</span>
                  <span className="block text-xs text-muted">{d.label}</span>
                  {d.detail && <span className="block text-xs text-muted">{d.detail}</span>}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div aria-hidden className="mt-2 flex justify-around pl-10">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-xs text-muted">{d.label}</span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-brand">Lihat sebagai tabel</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-muted">
            <tr><th className="py-1 font-medium">Periode</th><th className="py-1 font-medium">Nilai</th><th className="py-1 font-medium">Keterangan</th></tr>
          </thead>
          <tbody className="tabular-nums">
            {data.map((d) => (
              <tr key={d.label} className="border-t border-line">
                <td className="py-1">{d.label}</td>
                <td className="py-1">{d.value === null ? "—" : formatValue(d.value)}</td>
                <td className="py-1 text-muted">{d.detail ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
