import CountUp from "@/components/landing/CountUp";
import { getStats } from "@/lib/dal";
import { formatPercent } from "@/lib/format";

const number = (value: number | null, digits = 1) =>
  value === null ? "—" : value.toLocaleString("id-ID", { maximumFractionDigits: digits });

function Stat({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div className="border-line py-1 sm:border-l sm:pl-5 sm:first:border-l-0 sm:first:pl-0">
      <p className="text-4xl font-semibold tracking-tight">
        {value === "—" ? value : <CountUp value={value} />}
      </p>
      <p className="mt-1 font-medium">{label}</p>
      <p className="text-sm text-muted">{note}</p>
    </div>
  );
}

/** Rapor ringkas di beranda: angka langsung dari data permohonan (publik, tanpa data pribadi). */
export default async function SummaryStats() {
  const { overall } = await getStats();
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
      <Stat
        value={formatPercent(overall.onTimeRate)}
        label="Selesai tepat waktu"
        note={`dari ${overall.completed} permohonan`}
      />
      <Stat
        value={formatPercent(overall.promiseRate)}
        label="Terbit ≤ 24 jam"
        note={
          overall.avgIssueHours === null
            ? "setelah berkas lengkap"
            : `rata-rata ${number(overall.avgIssueHours)} jam kerja setelah berkas lengkap`
        }
      />
      <Stat
        value={overall.ratingAvg === null ? "—" : `${number(overall.ratingAvg)}/5`}
        label="Kepuasan warga"
        note={`${overall.ratingCount} penilaian`}
      />
      <Stat
        value={String(overall.open)}
        label="Sedang diproses"
        note={`${overall.overdueNow} melewati tenggat`}
      />
    </div>
  );
}

export function SummaryStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-4" aria-busy="true" aria-label="Memuat rapor">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-2" />
      ))}
    </div>
  );
}
