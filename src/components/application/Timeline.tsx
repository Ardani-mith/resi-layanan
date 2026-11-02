"use client";

import { Check, Circle, CircleAlert, CircleCheck, CircleMinus, CirclePause, CircleX } from "lucide-react";
import { STEP_STATE } from "@/components/application/Badges";
import { Disclosure } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration, formatWorkHours } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import type { PublicView, StepViewState } from "@/lib/present";

/** Tahap dari publicView; petugas juga mendapat nama petugas & catatan internal. */
type TimelineStep = PublicView["steps"][number] & {
  handledByName?: string | null;
  internalNote?: string | null;
  checked?: string[];
  evidenceLabel?: string | null;
  evidence?: string | null;
};

/** Status tahap dihitung ulang di browser supaya "berjalan" berubah jadi "terlambat" tanpa reload. */
function liveState(step: TimelineStep, now: number): StepViewState {
  if ((step.state === "berjalan" || step.state === "terlambat") && step.dueAt) {
    return now > new Date(step.dueAt).getTime() ? "terlambat" : "berjalan";
  }
  return step.state;
}

/** Tanggapan pimpinan atas tahap yang terlambat (jabatan, bukan nama), dipakai juga di halaman lacak. */
export function FollowUpNote({ followUp }: { followUp: NonNullable<TimelineStep["followUp"]> }) {
  return (
    <blockquote className="mt-2 border-l-2 border-late pl-3 text-sm">
      <span className="block text-xs font-medium text-late">
        Tindak lanjut {followUp.target} · {formatDateTime(followUp.at)}
      </span>
      {followUp.note}
      {followUp.promisedAt && (
        <span className="mt-1 block font-semibold">
          Target selesai: {formatDateTime(followUp.promisedAt)}
        </span>
      )}
    </blockquote>
  );
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
      return step.slaHours ? (
        <p className="text-sm text-muted">Target {formatWorkHours(step.slaHours)}</p>
      ) : null;
    default:
      return null;
  }
}

// --- Versi petugas: log aktivitas yang ringkas -------------------------------------------

/**
 * Ikon status di garis waktu. Tahap berjalan = titik bercincin (versi warga `large` berdenyut).
 * `large` untuk timeline warga, kecil untuk log petugas.
 */
function StepIcon({ state, large = false }: { state: StepViewState; large?: boolean }) {
  const base = cn("relative z-10 shrink-0 rounded-full bg-surface", large ? "size-6" : "size-4");
  switch (state) {
    case "selesai":
      return <CircleCheck aria-hidden className={cn(base, "text-ok")} />;
    case "terlambat":
      return <CircleAlert aria-hidden className={cn(base, "text-late")} />;
    case "dijeda":
      return <CirclePause aria-hidden className={cn(base, "text-pause")} />;
    case "ditolak":
      return <CircleX aria-hidden className={cn(base, "text-late")} />;
    case "dibatalkan":
      return <CircleMinus aria-hidden className={cn(base, "text-muted")} />;
    case "berjalan":
      return (
        <span aria-hidden className={cn(base, "grid place-items-center border-2 border-run")}>
          {large && <span className="absolute inset-0 rounded-full bg-run/25 motion-safe:animate-ping" />}
          <span className={cn("rounded-full bg-run", large ? "size-2" : "size-1.5")} />
        </span>
      );
    default:
      return <Circle aria-hidden className={cn(base, "text-line")} />;
  }
}

/** Satu baris keterangan di bawah nama tahap (waktu, petugas, tenggat). */
function StaffStepMeta({ step, state, now }: { step: TimelineStep; state: StepViewState; now: number }) {
  const due = step.dueAt ? new Date(step.dueAt).getTime() : null;
  const who = step.handledByName ? <span>{step.handledByName}</span> : null;
  const sep = <span aria-hidden> · </span>;
  switch (state) {
    case "selesai":
      return (
        <p className="text-xs text-muted">
          {who}
          {who && due && sep}
          {due && (step.finishedLate ? <span className="text-late">melewati tenggat</span> : "tepat waktu")}
        </p>
      );
    case "berjalan":
      return due ? (
        <>
          <p className="text-xs text-muted">
            <span className="font-medium text-text tabular-nums">Sisa {formatDuration(due - now)}</span>
            {sep}tenggat {formatDateTime(step.dueAt)}
          </p>
          <Progress step={step} now={now} />
        </>
      ) : (
        <p className="text-xs text-muted">Sejak {formatDateTime(step.startedAt)}</p>
      );
    case "terlambat":
      return (
        <p className="text-xs text-muted">
          <span className="font-medium text-late tabular-nums">
            Lewat {formatDuration(now - (due ?? now))}
          </span>
          {sep}tenggat {formatDateTime(step.dueAt)}
          {step.escalated && (
            <>
              {sep}
              <span className="text-late">diteruskan ke atasan</span>
            </>
          )}
        </p>
      );
    case "dijeda":
      return <p className="text-xs text-muted">Hitung mundur dihentikan sampai berkas dilengkapi.</p>;
    case "menunggu":
      return step.slaHours ? (
        <p className="text-xs text-muted">Target {formatWorkHours(step.slaHours)}</p>
      ) : null;
    default:
      return null;
  }
}

/** Kolom kanan baris: waktu selesai, atau status untuk tahap yang belum selesai. */
function StaffStepAside({ step, state }: { step: TimelineStep; state: StepViewState }) {
  if (state === "selesai")
    return <span className="text-xs text-muted tabular-nums">{formatDateTime(step.completedAt)}</span>;
  const meta = STEP_STATE[state] ?? STEP_STATE.menunggu;
  const label = state === "berjalan" && !step.dueAt ? "Siap" : meta.label;
  return <span className={cn("text-xs font-medium", meta.text)}>{label}</span>;
}

/**
 * Timeline petugas sebagai log aktivitas: ikon kecil di garis tipis, nama tahap + waktu sebaris,
 * keterangan satu baris. Daftar syarat yang dicentang dilipat ("n syarat dicentang") supaya
 * halaman tidak panjang; catatan & tindak lanjut tampil sebagai kutipan bergaris kiri.
 */
function StaffTimeline({ steps, now }: { steps: TimelineStep[]; now: number }) {
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const state = liveState(step, now);
        const last = i === steps.length - 1;
        const muted = state === "menunggu" || state === "dibatalkan";
        return (
          <li
            key={step.key}
            className="relative flex gap-3 pb-5 last:pb-0"
            aria-current={step.isCurrent ? "step" : undefined}
          >
            {!last && <span aria-hidden className="absolute top-5 bottom-0 left-[7.5px] w-px bg-line" />}
            <span className="mt-0.5">
              <StepIcon state={state} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h3 className={cn("text-sm font-medium", muted && "text-muted")}>{step.name}</h3>
                <StaffStepAside step={step} state={state} />
              </div>
              <div className="mt-0.5">
                <StaffStepMeta step={step} state={state} now={now} />
              </div>
              {step.publicNote && (
                <blockquote className="mt-2 border-l-2 border-brand/50 pl-3 text-sm">
                  <span className="block text-xs text-muted">Catatan untuk warga</span>
                  {step.publicNote}
                </blockquote>
              )}
              {step.followUp && <FollowUpNote followUp={step.followUp} />}
              {step.internalNote && (
                <p className="mt-2 text-sm">
                  <span className="text-xs text-muted">Catatan internal · </span>
                  {step.internalNote}
                </p>
              )}
              {step.evidence && (
                <p className="mt-1 text-xs text-muted">
                  {step.evidenceLabel}: <span className="font-mono text-text">{step.evidence}</span>
                </p>
              )}
              {/* Dasar keputusan "selesai" yang dicentang petugas (terekam di audit log). */}
              {step.checked && step.checked.length > 0 && (
                <Disclosure summary={`${step.checked.length} syarat dicentang`} className="mt-1.5">
                  <ul className="space-y-1 text-xs">
                    {step.checked.map((item) => (
                      <li key={item} className="flex gap-1.5">
                        <Check aria-hidden className="mt-px size-3.5 shrink-0 text-ok" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Timeline vertikal per tahap. `staff` = versi petugas (log aktivitas ringkas, dengan nama
 * petugas, catatan internal, dan syarat yang dicentang).
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
  if (staff) return <StaffTimeline steps={steps} now={now} />;
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const state = liveState(step, now);
        const meta = STEP_STATE[state] ?? STEP_STATE.menunggu;
        const label = state === "berjalan" && !step.dueAt ? "Siap" : meta.label;
        const last = i === steps.length - 1;
        const muted = state === "menunggu" || state === "dibatalkan";
        return (
          <li
            key={step.key}
            className="relative flex gap-4 pb-7 last:pb-0"
            aria-current={step.isCurrent ? "step" : undefined}
          >
            {/* Garis penghubung: hijau sampai tahap yang sudah selesai. */}
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-7 bottom-1 left-[11.5px] w-px",
                  state === "selesai" ? "bg-ok/40" : "bg-line",
                )}
              />
            )}
            <span className="mt-0.5">
              <StepIcon state={state} large />
            </span>
            {/* Tahap yang sedang berjalan disorot dengan kotak lembut agar langsung terlihat. */}
            <div
              className={cn(
                "min-w-0 flex-1",
                step.isCurrent && !muted && "-mt-2 rounded-xl border border-line bg-surface-2/60 px-4 py-3",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className={cn("font-semibold", muted && "font-medium text-muted")}>{step.name}</h3>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap",
                    meta.text,
                  )}
                >
                  <span aria-hidden className="size-1.5 rounded-full bg-current" />
                  {label}
                </span>
              </div>
              <div className="mt-0.5">
                <StepDetail step={step} state={state} now={now} />
              </div>
              {/* Saat dijeda, catatan perbaikan sudah tampil di kartu langkah berikutnya. */}
              {step.publicNote && state !== "dijeda" && (
                <blockquote className="mt-2.5 border-l-2 border-brand/50 pl-3 text-sm">
                  <span className="block text-xs text-muted">Catatan petugas</span>
                  {step.publicNote}
                </blockquote>
              )}
              {/* Tahap terlambat yang sedang berjalan: tanggapan sudah tampil di kartu langkah berikutnya. */}
              {step.followUp && !(step.isCurrent && state === "terlambat") && (
                <FollowUpNote followUp={step.followUp} />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
