import Link from "next/link";
import { Suspense } from "react";
import { Meter, StatTile, weeklyOnTime } from "@/components/charts";
import ColumnChart from "@/components/charts/ColumnChart";
import { Skeleton } from "@/components/ui";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";
import { getStats } from "@/lib/dal";
import { formatDateTime, formatPercent, formatWorkHours } from "@/lib/format";

export const metadata = {
  title: "Rapor SLA publik",
  description: `Seberapa sering ${site.agency} menepati janji waktu layanannya.`,
};

async function Report() {
  const { overall, services, trend, generatedAt } = await getStats();
  return (
    <>
      <section className="grid gap-6 rounded-card border border-line bg-surface p-6 lg:grid-cols-[1fr_2fr] lg:items-center">
        <div>
          <p className="text-sm text-muted">Selesai tepat waktu</p>
          <p className="text-6xl font-semibold tracking-tight">{formatPercent(overall.onTimeRate)}</p>
          <p className="mt-2 text-sm text-muted">
            {overall.completed === 0
              ? "Belum ada permohonan yang selesai."
              : `dari ${overall.completed} permohonan yang selesai, tidak ada satu tahap pun yang melewati tenggat.`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile
            label="Terbit ≤ 24 jam"
            value={formatPercent(overall.promiseRate)}
            note={`rata-rata ${formatWorkHours(overall.avgIssueHours)} setelah berkas lengkap`}
          />
          <StatTile
            label="Kepuasan warga"
            value={overall.ratingAvg === null ? "—" : `${overall.ratingAvg.toLocaleString("id-ID")} / 5`}
            note={`${overall.ratingCount} penilaian`}
          />
          <StatTile
            label="Sedang diproses"
            value={overall.open}
            note={`${overall.overdueNow} di antaranya terlambat`}
          />
        </div>
      </section>

      <ColumnChart
        title="Tren per minggu"
        description="Persentase permohonan yang selesai tepat waktu, dikelompokkan menurut minggu selesainya."
        data={weeklyOnTime(trend)}
        emptyLabel="Belum ada yang selesai"
      />

      <section className="rounded-card border border-line bg-surface" aria-labelledby="per-layanan">
        <h2 id="per-layanan" className="border-b border-line p-5 text-lg font-bold">
          Per layanan
        </h2>
        {services.length === 0 && <p className="p-5 text-sm text-muted">Belum ada layanan yang dibuka.</p>}
        {/* Daftar responsif: kolom berjajar di layar lebar, bertumpuk dengan label di HP. */}
        <div
          aria-hidden
          className={cn(
            "hidden grid-cols-[1.4fr_1.2fr_1fr_1fr] gap-4 px-5 pt-3 text-sm text-muted",
            services.length > 0 && "sm:grid",
          )}
        >
          <span>Layanan</span>
          <span>Tepat waktu</span>
          <span>Rata-rata lama</span>
          <span>Kepuasan</span>
        </div>
        <ul className="divide-y divide-line">
          {services.map((s) => (
            <li
              key={s.slug}
              className="grid gap-x-4 gap-y-2 px-5 py-4 sm:grid-cols-[1.4fr_1.2fr_1fr_1fr] sm:items-center"
            >
              <div>
                <Link href={`/layanan/${s.slug}`} className="font-medium hover:text-brand">
                  {s.name}
                </Link>
                <span className="block text-xs text-muted">
                  {s.completed} selesai · {s.open} berjalan
                </span>
              </div>
              <div>
                <span className="text-xs text-muted sm:hidden">Tepat waktu</span>
                <Meter value={s.onTimeRate} label={`Tepat waktu ${s.name}`} />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:contents">
                <p className="text-sm tabular-nums">
                  <span className="block text-xs text-muted sm:hidden">Rata-rata terbit</span>
                  {formatWorkHours(s.avgIssueHours)}
                  <span className="block text-xs text-muted">
                    janji ≤ {formatWorkHours(s.issueTargetHours)} · {formatPercent(s.promiseRate)} tepat janji
                  </span>
                </p>
                <p className="text-sm tabular-nums">
                  <span className="block text-xs text-muted sm:hidden">Kepuasan</span>
                  {s.ratingAvg === null ? "—" : `${s.ratingAvg.toLocaleString("id-ID")} / 5`}
                  <span className="block text-xs text-muted">{s.ratingCount} penilaian</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted">
        Diperbarui {formatDateTime(generatedAt)}. Angka dihitung langsung dari data permohonan; tidak ada data
        pribadi yang ditampilkan. Tenggat dihitung dalam jam kerja (Senin–Jumat 08.00–16.00 WIB). Janji terbit
        mengikuti Permendagri 19/2018: dokumen terbit paling lama 24 jam setelah berkas dinyatakan lengkap.
      </p>
    </>
  );
}

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Rapor SLA publik</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Seberapa sering {site.agency} menepati janji waktu layanannya. Terbuka untuk siapa pun.
        </p>
      </div>
      <Suspense fallback={<Skeleton />}>
        <Report />
      </Suspense>
    </div>
  );
}
