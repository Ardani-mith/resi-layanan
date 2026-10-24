"use client";

import { useEffect, useState } from "react";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/hooks";

// Sisa waktu awal tahap berjalan (ilustrasi): 01:12:45 dari tenggat 2 jam kerja.
const START_SECONDS = 1 * 3600 + 12 * 60 + 45;
const STEP_SECONDS = 2 * 3600;

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (s: number) =>
  `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

/** Detik yang berjalan sejak mount; berhenti jika pengguna meminta kurangi gerakan. */
function useTicker() {
  const reducedMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (reducedMotion) return undefined;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [reducedMotion]);
  return elapsed;
}

type Line = { mark: "done" | "now" | "next"; label: string; value: string };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 text-ink-soft">{label}</span>
      <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-paper-line" />
      <span className="shrink-0 text-right">{value}</span>
    </div>
  );
}

/**
 * Struk resi di hero: identitas visual Pantas (resi = struk yang bisa dilacak). Tahap berjalan
 * berdetak mundur. Ilustrasi, jadi isinya disembunyikan dari pembaca layar dan diganti satu
 * deskripsi.
 */
export default function ReceiptSlip({ resi }: { resi: string }) {
  const { service, applicant, submitted, officerNote, promise } = site.hero.preview;
  const left = Math.max(0, START_SECONDS - useTicker());
  const progress = ((STEP_SECONDS - left) / STEP_SECONDS) * 100;

  const steps: Line[] = [
    { mark: "done", label: "Verifikasi berkas", value: "09.40 ✓" },
    { mark: "now", label: "Entri & validasi data", value: "≤ 2 jam" },
    { mark: "next", label: "Tanda tangan elektronik", value: "≤ 1 jam" },
    { mark: "next", label: "Pencetakan akta", value: "≤ 1 jam" },
    { mark: "next", label: "Siap diambil", value: "—" },
  ];

  return (
    <figure className="relative mx-auto w-full max-w-[26rem]">
      <figcaption className="sr-only">
        Contoh resi {resi}: verifikasi selesai, tahap entri data sedang diproses dengan hitung mundur, dan
        janji dokumen terbit paling lambat 24 jam setelah berkas lengkap.
      </figcaption>

      {/* drop-shadow (bukan box-shadow) agar bayangan mengikuti tepi bergerigi. */}
      <div aria-hidden className="drop-shadow-[0_24px_40px_rgb(15_27_45/0.18)] lg:rotate-[1.5deg]">
        <div className="bg-paper px-6 pt-9 pb-10 font-mono text-[12.5px] leading-relaxed text-text receipt-edges">
          <div className="flex items-baseline justify-between">
            <span className="font-sans text-lg font-extrabold tracking-tight">{site.name}</span>
            <span className="text-[11px] tracking-[0.2em] text-ink-soft uppercase">Resi layanan</span>
          </div>
          <p className="text-[11px] text-ink-soft">{site.agency}</p>

          <div className="my-4 h-px rule-dashed" />

          <p className="text-[11px] tracking-[0.2em] text-ink-soft uppercase">No. resi</p>
          <p className="text-2xl font-semibold tracking-[0.12em]">{resi}</p>
          <div className="mt-3 space-y-0.5">
            <Row label="Layanan" value={service} />
            <Row label="Pemohon" value={applicant} />
            <Row label="Diajukan" value={submitted} />
          </div>

          <div className="my-4 h-px rule-dashed" />

          <ol className="space-y-2">
            {steps.map((step) => (
              <li key={step.label}>
                <div
                  className={cn(
                    "flex items-baseline gap-2",
                    step.mark === "next" && "text-ink-soft",
                    step.mark === "now" && "font-semibold text-brand",
                  )}
                >
                  <span className="w-4 shrink-0">
                    {step.mark === "done" ? "■" : step.mark === "now" ? "▶" : "□"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{step.label}</span>
                  <span className="shrink-0 tabular-nums">{step.value}</span>
                </div>
                {step.mark === "done" && <p className="pl-6 text-[11.5px] text-ink-soft">“{officerNote}”</p>}
                {/* Tahap berjalan: hitung mundur di barisnya sendiri agar nama tahap tidak terpotong. */}
                {step.mark === "now" && (
                  <div className="mt-1 ml-6 flex items-center gap-3">
                    <div className="h-1 flex-1 bg-paper-line/60">
                      <div
                        className="h-full bg-brand transition-[width] duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[11.5px] font-semibold text-brand tabular-nums">
                      sisa {clock(left)}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="my-4 h-px rule-dashed" />

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-[0.08em] whitespace-nowrap text-ink-soft uppercase">
                Janji terbit ≤ 24 jam
              </p>
              <p className="text-base font-semibold">{promise}</p>
            </div>
            {/* Cap: gaya stempel dinas, sengaja sedikit miring. */}
            <span className="-rotate-6 rounded-sm border-2 border-brand/70 px-2 py-0.5 font-sans text-[11px] font-extrabold tracking-[0.18em] text-brand/80 uppercase">
              Dipantau
            </span>
          </div>

          <div className="mt-5 h-10 text-text/85 barcode" />
          <p className="mt-1.5 text-center text-[10.5px] tracking-[0.15em] text-ink-soft">
            pantas · lacak/{resi}
          </p>
        </div>
      </div>
    </figure>
  );
}
