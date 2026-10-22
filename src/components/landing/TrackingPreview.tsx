"use client";

import { BellRing, Check, MessageSquareText } from "lucide-react";
import { useEffect, useState } from "react";
import StatusBadge from "@/components/application/StatusBadge";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/hooks";

// Sisa waktu awal tahap berjalan (ilustrasi): 01:12:45.
const START_SECONDS = 1 * 3600 + 12 * 60 + 45;
// Lama tahap entri data = 2 jam kerja; dipakai untuk progress bar.
const STEP_SECONDS = 2 * 3600;

type PreviewState = "done" | "current" | "waiting";

const STEPS: { name: string; state: PreviewState; detail?: string }[] = [
  { name: "Verifikasi berkas", state: "done", detail: "Selesai · tepat waktu" },
  { name: "Entri & validasi data", state: "current" },
  { name: "Persetujuan & tanda tangan elektronik", state: "waiting", detail: "Target 1 jam kerja" },
  { name: "Pencetakan akta", state: "waiting", detail: "Target 1 jam kerja" },
  { name: "Siap diambil di loket", state: "waiting" },
];

const pad = (n: number) => String(n).padStart(2, "0");

function formatCountdown(total: number): string {
  const days = Math.floor(total / 86400);
  const rest = total % 86400;
  const clock = `${pad(Math.floor(rest / 3600))}:${pad(Math.floor((rest % 3600) / 60))}:${pad(rest % 60)}`;
  return days ? `${days} hari ${clock}` : clock;
}

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

function StepDot({ state }: { state: PreviewState }) {
  if (state === "done") {
    return (
      <span className="grid size-5 place-items-center rounded-full bg-ok text-surface">
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative grid size-5 place-items-center">
        <span className="absolute inset-0 rounded-full bg-run/40 motion-safe:animate-ping" />
        <span className="relative size-5 rounded-full border-[5px] border-run bg-surface" />
      </span>
    );
  }
  return <span className="size-5 rounded-full border-2 border-line bg-surface" />;
}

/**
 * Cuplikan halaman /lacak di hero: jendela browser berisi timeline dengan hitung mundur
 * yang berdetak. Ilustrasi, jadi isinya disembunyikan dari pembaca layar dan diganti
 * satu deskripsi.
 */
export default function TrackingPreview({
  resi,
  service,
  applicant,
  officerNote,
  escalationNote,
}: {
  resi: string;
  service: string;
  applicant: string;
  officerNote: string;
  escalationNote: string;
}) {
  const elapsed = useTicker();
  const left = Math.max(0, START_SECONDS - elapsed);
  const progress = ((STEP_SECONDS - left) / STEP_SECONDS) * 100;

  return (
    <figure className="relative mx-auto w-full max-w-md lg:max-w-none">
      <figcaption className="sr-only">
        Contoh halaman lacak resi {resi}: tahap entri data sedang diproses dengan hitung mundur tenggat.
      </figcaption>

      {/* Cahaya biru di belakang jendela. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -top-8 h-48 rounded-[50%] bg-[radial-gradient(ellipse_at_50%_40%,var(--hero-glow),transparent_70%)] blur-2xl"
      />

      <div
        aria-hidden
        className="relative overflow-hidden rounded-2xl border border-hero-line bg-surface text-text shadow-[0_30px_80px_-20px_var(--hero-shadow)]"
      >
        {/* Bilah browser */}
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-late/70" />
            <span className="size-2.5 rounded-full bg-warn/70" />
            <span className="size-2.5 rounded-full bg-ok/70" />
          </span>
          <span className="ml-2 flex-1 truncate rounded-md bg-surface px-3 py-1 font-mono text-[11px] text-muted">
            pantas/lacak/{resi}
          </span>
        </div>

        <div className="p-5">
          <p className="font-mono text-xs tracking-wider text-muted">{resi}</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-bold">{service}</p>
            <StatusBadge status="diproses" />
          </div>
          <p className="mt-1 text-xs text-muted">
            Pemohon {applicant} · dokumen terbit{" "}
            <span className="font-semibold text-text">hari ini, ±15.30 WIB</span>
          </p>

          <ol className="mt-5 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.name} className="relative flex gap-3">
                {i < STEPS.length - 1 && (
                  <span
                    className={cn(
                      "absolute top-6 -bottom-3 left-[9px] w-0.5",
                      step.state === "done" ? "bg-ok" : "bg-line",
                    )}
                  />
                )}
                <StepDot state={step.state} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold", step.state === "waiting" && "text-muted")}>
                    {step.name}
                  </p>
                  {step.state === "current" ? (
                    <>
                      <p className="mt-0.5 text-xs">
                        <span className="font-semibold text-run tabular-nums">
                          Sisa {formatCountdown(left)}
                        </span>
                        <span className="text-muted"> · tenggat 2 jam kerja</span>
                      </p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-run transition-[width] duration-1000 ease-linear"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    step.detail && <p className="mt-0.5 text-xs text-muted">{step.detail}</p>
                  )}
                  {step.state === "done" && (
                    <p className="mt-1.5 rounded-lg border-l-2 border-brand bg-brand-soft px-2 py-1 text-xs">
                      {officerNote}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Kartu melayang: menjelaskan dua hal yang membedakan dari pelacakan biasa. */}
      <div
        aria-hidden
        className="absolute -top-12 -left-8 hidden items-center gap-2 rounded-xl border border-hero-line bg-hero-chip px-3 py-2 text-xs text-hero-fg shadow-xl backdrop-blur motion-safe:animate-fade-up lg:flex"
        style={{ animationDelay: "700ms" }}
      >
        <MessageSquareText className="size-4 text-hero-accent" />
        Catatan petugas tampil ke warga
      </div>
      <div
        aria-hidden
        className="absolute -right-6 -bottom-6 hidden max-w-60 items-start gap-2 rounded-xl border border-hero-line bg-hero-chip px-3 py-2 text-xs text-hero-fg shadow-xl backdrop-blur motion-safe:animate-fade-up lg:flex"
        style={{ animationDelay: "950ms" }}
      >
        <BellRing className="mt-0.5 size-4 shrink-0 text-hero-alert" />
        {escalationNote}
      </div>
    </figure>
  );
}
