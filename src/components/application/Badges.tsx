// Label status yang dipakai berulang: status permohonan, status tahap (timeline), dan kanal pengajuan.
import { Globe, Store } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StepViewState } from "@/lib/present";
import { type Channel, type Status, STATUS_LABELS } from "@/lib/workflow";

/** Warna titik status (badge "tenang": titik berwarna + teks, bingkai tipis). */
const STATUS_DOT: Record<Status, string> = {
  diajukan: "bg-run",
  diproses: "bg-run",
  siap_diambil: "bg-ok",
  selesai: "bg-ok",
  perlu_perbaikan: "bg-pause",
  menunggu_kedatangan: "bg-warn",
  ditolak: "bg-late",
};

const chip =
  "inline-flex items-center gap-1.5 rounded-md border border-line bg-surface font-medium whitespace-nowrap";

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
  onDark = false,
}: {
  status: Status;
  late?: boolean;
  size?: "md" | "lg";
  /** di atas kepala gelap (hero): chip kaca berteks putih */
  onDark?: boolean;
}) {
  const sizing = size === "lg" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs";
  const glass = onDark && "border-hero-line bg-hero-chip text-hero-fg backdrop-blur";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={cn(chip, sizing, glass)}>
        <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[status] ?? "bg-muted")} />
        {STATUS_LABELS[status] ?? status}
      </span>
      {late && (
        <span
          className={cn(
            chip,
            sizing,
            onDark
              ? "border-hero-alert/40 bg-hero-alert/15 text-hero-alert"
              : "border-late/30 bg-late-soft text-late",
          )}
        >
          <span aria-hidden className={cn("size-1.5 rounded-full", onDark ? "bg-hero-alert" : "bg-late")} />
          Terlambat
        </span>
      )}
    </span>
  );
}

/**
 * Pembeda kanal pengajuan, dipakai konsisten di antrean, detail, dan form loket:
 * Online (ikon globe biru) = diisi sendiri oleh warga; Loket (ikon toko amber) = diinput petugas.
 */
const CHANNELS = {
  online: {
    label: "Online",
    long: "Diajukan online oleh warga",
    icon: Globe,
    tone: "text-brand",
  },
  loket: { label: "Loket", long: "Input petugas di loket", icon: Store, tone: "text-warn" },
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
        "inline-flex items-center gap-1 rounded-md border border-line bg-surface font-medium whitespace-nowrap text-muted",
        long ? "px-2 py-0.5 text-xs" : "px-1.5 py-px text-xs",
        className,
      )}
    >
      <Icon aria-hidden className={cn(long ? "size-3.5" : "size-3", info.tone)} />
      {long ? info.long : info.label}
    </span>
  );
}
