"use client";

import { STEP_STATE } from "@/components/application/StatusBadge";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import type { PublicView, StepViewState } from "@/lib/present";

/** Tahap dari publicView; petugas juga mendapat nama petugas & catatan internal. */
type TimelineStep = PublicView["steps"][number] & {
  handledByName?: string | null;
  internalNote?: string | null;
};

/** Status tahap dihitung ulang di browser supaya "berjalan" berubah jadi "terlambat" tanpa reload. */
function liveState(step: TimelineStep, now: number): StepViewState {
  if ((step.state === "berjalan" || step.state === "terlambat") && step.dueAt) {
    return now > new Date(step.dueAt).getTime() ? "terlambat" : "berjalan";
  }
  return step.state;
}

function Progress({ step, now }: { step: TimelineStep; now: number }) {
  const start = new Date(step.startedAt ?? now).getTime();
  const due = new Date(step.dueAt ?? now).getTime();
  const pct = Math.min(100, Math.max(2, ((now - start) / (due - start)) * 100));
  const tone = pct >= 100 ? "bg-late" : pct >= 75 ? "bg-warn" : "bg-run";
  return (
    <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-2" aria-hidden>
      <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StepDetail({ step, state, now }: { step: TimelineStep; state: StepViewState; now: number }) {
  const due = step.dueAt ? new Date(step.dueAt).getTime() : null;
  switch (state) {
    case "selesai":
      return (
        <p className="text-sm text-muted">
          {formatDateTime(step.completedAt)}
          {due &&
            (step.finishedLate ? (
              <span className="text-late"> · melewati tenggat</span>
            ) : (
              <span className="text-ok"> · tepat waktu</span>
            ))}
        </p>
      );
    case "berjalan":
      if (!due) return <p className="text-sm text-muted">Sejak {formatDateTime(step.startedAt)}</p>;
      return (
        <>
          <p className="text-sm">
            <span className="font-semibold">Sisa {formatDuration(due - now)}</span>
            <span className="text-muted"> · tenggat {formatDateTime(step.dueAt)}</span>
          </p>
          <Progress step={step} now={now} />
        </>
      );
    case "terlambat":
      return (
        <>
          <p className="text-sm">
            <span className="font-semibold text-late">Lewat {formatDuration(now - (due ?? now))}</span>
            <span className="text-muted"> · tenggat {formatDateTime(step.dueAt)}</span>
          </p>
          {step.escalated && (
            <p className="mt-1 text-sm text-late">Sudah diteruskan otomatis ke atasan petugas.</p>
          )}
        </>
      );
    case "dijeda":
      return (
        <p className="text-sm text-muted">
          Hitung mundur dihentikan sampai berkas dilengkapi; waktu menunggu tidak mengurangi jatah waktu
          instansi.
        </p>
      );
    case "menunggu":
      return step.slaDays ? <p className="text-sm text-muted">Target {step.slaDays} hari kerja</p> : null;
    default:
      return null;
  }
}

/**
 * Timeline vertikal per tahap. `staff` menambahkan nama petugas & catatan internal.
 * serverNow + offsetMs: lihat useNow.
 */
export default function Timeline({
  steps,
  serverNow,
  offsetMs = 0,
  staff = false,
}: {
  steps: TimelineStep[];
  serverNow: string | Date;
  offsetMs?: number;
  staff?: boolean;
}) {
  const now = useNow(serverNow, offsetMs);
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const state = liveState(step, now);
        const meta = STEP_STATE[state] ?? STEP_STATE.menunggu;
        const label = state === "berjalan" && !step.dueAt ? "Siap" : meta.label;
        const last = i === steps.length - 1;
        return (
          <li
            key={step.key}
            className="relative flex gap-4 pb-6 last:pb-0"
            aria-current={step.isCurrent ? "step" : undefined}
          >
            {!last && <span aria-hidden className="absolute top-6 bottom-0 left-[9px] w-0.5 bg-line" />}
            <span
              aria-hidden
              className={cn("relative z-10 mt-1 size-5 shrink-0 rounded-full border-2", meta.dot)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3
                  className={cn(
                    "font-semibold",
                    (state === "menunggu" || state === "dibatalkan") && "text-muted",
                  )}
                >
                  {step.name}
                </h3>
                <span className={cn("text-xs font-semibold tracking-wide uppercase", meta.text)}>
                  {label}
                </span>
              </div>
              <div className="mt-0.5">
                <StepDetail step={step} state={state} now={now} />
              </div>
              {/* Saat dijeda, catatan perbaikan sudah tampil di banner atas halaman lacak. */}
              {step.publicNote && (staff || state !== "dijeda") && (
                <blockquote className="mt-2 rounded-xl border-l-4 border-brand bg-brand-soft px-3 py-2 text-sm">
                  <span className="block text-xs font-semibold text-brand">Catatan petugas</span>
                  {step.publicNote}
                </blockquote>
              )}
              {staff && (step.handledByName || step.internalNote) && (
                <div className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                  {step.handledByName && <p className="text-muted">Ditangani: {step.handledByName}</p>}
                  {step.internalNote && (
                    <p>
                      <span className="font-semibold">Internal:</span> {step.internalNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
