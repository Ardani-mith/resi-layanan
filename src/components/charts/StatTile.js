import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

/** Stat tile: label · nilai · keterangan. `tone="late"` menambahkan penanda status + ikon (bukan warna saja). */
export default function StatTile({ label, value, note, tone }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1.5 text-3xl font-semibold tracking-tight",
          tone === "late" && "text-late",
        )}
      >
        {tone === "late" && <TriangleAlert aria-hidden className="size-6" />}
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}
