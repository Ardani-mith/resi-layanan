/**
 * Meter rasio 0–1 dengan angka di sampingnya (nilai tidak pernah hanya lewat warna).
 * severity=true: isi berubah warna sesuai tingkat (aman → waspada → kritis) untuk
 * metrik yang "makin tinggi makin buruk", mis. tingkat keterlambatan.
 */
export default function Meter({ value, label, severity = false, thresholds = [0.15, 0.3] }) {
  if (value === null || value === undefined) return <span className="text-sm text-muted">—</span>;
  const pct = Math.round(value * 100);
  const fill = !severity
    ? "bg-chart"
    : value >= thresholds[1]
      ? "bg-late"
      : value >= thresholds[0]
        ? "bg-warn"
        : "bg-ok";
  return (
    <div className="flex items-center gap-2">
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
        className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-chart-track"
      >
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.max(pct, value > 0 ? 3 : 0)}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-sm tabular-nums">{pct}%</span>
    </div>
  );
}
