import { cn } from "@/lib/cn";

/** Placeholder fallback <Suspense> selama data request-time di-stream. */
export default function Skeleton({ className }) {
  return (
    <div
      className={cn("h-96 animate-pulse rounded-card bg-surface", className)}
      aria-busy="true"
      aria-label="Memuat"
    />
  );
}
