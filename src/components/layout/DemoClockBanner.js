import { DAY_MS } from "@/lib/sla";

/** Penanda jelas bahwa jam sistem sedang digeser (mode demo), agar tidak dikira data asli. */
export default function DemoClockBanner({ offsetMs }) {
  if (!offsetMs) return null;
  const days = Math.round((offsetMs / DAY_MS) * 10) / 10;
  return (
    <p
      role="status"
      className="rounded-xl border border-warn bg-warn-soft px-4 py-2 text-sm font-medium text-warn"
    >
      Mode demo: jam sistem dimajukan {days > 0 ? "+" : ""}
      {days.toLocaleString("id-ID")} hari dari waktu nyata.
    </p>
  );
}
