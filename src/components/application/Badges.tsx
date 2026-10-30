// Label status yang dipakai berulang: status permohonan, status tahap (timeline), dan kanal pengajuan.
import { Globe, Store } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StepViewState } from "@/lib/present";
import { type Channel, type Status, STATUS_LABELS } from "@/lib/workflow";

const STATUS_STYLE: Record<Status, string> = {
  diajukan: "bg-run-soft text-run",
  diproses: "bg-run-soft text-run",
  siap_diambil: "bg-ok-soft text-ok",
  selesai: "bg-ok-soft text-ok",
  perlu_perbaikan: "bg-pause-soft text-pause",
  menunggu_kedatangan: "bg-warn-soft text-warn",
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

export function StatusBadge({
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

/**
 * Pembeda kanal pengajuan, dipakai konsisten di antrean, detail, dan form loket:
 * Online (biru, globe) = diisi sendiri oleh warga; Loket (amber, toko) = diinput petugas.
 */
const CHANNELS = {
  online: {
    label: "Online",
    long: "Diajukan online oleh warga",
    icon: Globe,
    tone: "bg-brand-soft text-brand",
  },
  loket: { label: "Loket", long: "Input petugas di loket", icon: Store, tone: "bg-warn-soft text-warn" },
} as const;

export function ChannelBadge({
  channel,
  long = false,
  className,
}: {
  channel: Channel;
  /** label panjang ("Diajukan online oleh warga") untuk kepala halaman */
  long?: boolean;
  className?: string;
}) {
  const info = CHANNELS[channel];
  const Icon = info.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-semibold whitespace-nowrap",
        long ? "px-2 py-1 text-xs" : "px-1.5 py-0.5 text-xs",
        info.tone,
        className,
      )}
    >
      <Icon aria-hidden className={long ? "size-3.5" : "size-3"} />
      {long ? info.long : info.label}
    </span>
  );
}
