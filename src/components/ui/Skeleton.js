/** Placeholder fallback <Suspense> selama data request-time di-stream. */
export default function Skeleton({ className = "h-96" }) {
  return <div className={`animate-pulse rounded-card bg-surface ${className}`} aria-busy="true" aria-label="Memuat" />;
}
