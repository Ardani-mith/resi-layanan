import { cn } from "@/lib/cn";
import type { StepViewState } from "@/lib/present";
import { type Status, STATUS_LABELS } from "@/lib/workflow";

const STATUS_STYLE: Record<Status, string> = {
  diajukan: "bg-run-soft text-run",
  diproses: "bg-run-soft text-run",
  siap_diambil: "bg-ok-soft text-ok",
  selesai: "bg-ok-soft text-ok",
  perlu_perbaikan: "bg-pause-soft text-pause",
  ditolak: "bg-late-soft text-late",
};

export const STEP_STATE: Record<StepViewState, { label: string; dot: string; text: string }> = {
  selesai: { label: "Selesai", dot: "bg-ok border-ok", text: "text-ok" },
  berjalan: { label: "Sedang diproses", dot: "bg-surface border-run ring-4 ring-run-soft", text: "text-run" },
  dijeda: { label: "Menunggu perbaikan", dot: "bg-pause border-pause", text: "text-pause" },
  terlambat: { label: "Terlambat", dot: "bg-late border-late ring-4 ring-late-soft", text: "text-late" },
  menunggu: { label: "Menunggu", dot: "bg-surface border-line", text: "text-muted" },
  ditolak: { label: "Ditolak", dot: "bg-late border-late", text: "text-late" },
  dibatalkan: { label: "Tidak dilanjutkan", dot: "bg-surface-2 border-line", text: "text-muted" },
};

export default function StatusBadge({
  status,
  late = false,
  size = "md",
}: {
  status: Status;
  late?: boolean;
  size?: "md" | "lg";
}) {
  const sizing = size === "lg" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "rounded-full font-semibold",
          sizing,
          STATUS_STYLE[status] ?? "bg-surface-2 text-muted",
        )}
      >
        {STATUS_LABELS[status] ?? status}
      </span>
      {late && (
        <span className={cn("rounded-full bg-late font-semibold text-surface", sizing)}>Terlambat</span>
      )}
    </span>
  );
}
