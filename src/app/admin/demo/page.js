import { Suspense } from "react";
import DemoClockBanner from "@/components/layout/DemoClockBanner";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { getClockInfo, requireStaffPage } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import DemoControls from "./DemoControls";

export const metadata = { title: "Mode demo" };

async function DemoPanel() {
  await requireStaffPage(["admin"], "/admin/demo");
  const clock = await getClockInfo();
  const realNow = new Date(new Date(clock.now).getTime() - clock.offsetMs);

  return (
    <>
      <DemoClockBanner offsetMs={clock.offsetMs} />
      <section className="rounded-card border border-line bg-surface p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">Waktu nyata</dt>
            <dd className="text-lg font-semibold">{formatDateTime(realNow)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Waktu sistem (dipakai untuk SLA)</dt>
            <dd className={`text-lg font-semibold ${clock.offsetMs ? "text-warn" : ""}`}>{formatDateTime(clock.now)}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <DemoControls hasOffset={clock.offsetMs !== 0} />
        </div>
      </section>
      <section className="rounded-card border border-line bg-surface p-5 text-sm">
        <h2 className="font-bold">Alur demo yang disarankan</h2>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-muted">
          <li>Warga mengajukan akta kelahiran di <span className="font-mono">/ajukan</span>, lalu menyimpan resinya.</li>
          <li>Petugas loket menyelesaikan verifikasi di antrean.</li>
          <li>Majukan jam +2 hari di sini: tahap entri data melewati tenggat.</li>
          <li>Buka resi di HP (tahap merah) dan dashboard pimpinan (eskalasi muncul).</li>
          <li>Kembalikan ke waktu nyata setelah demo selesai.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="/pantau" variant="secondary">Buka dashboard pimpinan</Button>
          <Button href="/kerja" variant="secondary">Buka antrean</Button>
        </div>
      </section>
    </>
  );
}

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mode demo: simulasi waktu</h1>
        <p className="mt-1 text-muted">
          Menggeser jam sistem agar keterlambatan & eskalasi bisa diperlihatkan tanpa menunggu berhari-hari. Tanggal
          permohonan tidak diubah, hanya &ldquo;sekarang&rdquo; yang bergeser. Saat kembali ke waktu nyata, eskalasi
          hasil simulasi dibatalkan; audit log tetap mencatatnya. Untuk data yang benar-benar bersih, jalankan{" "}
          <span className="font-mono">npm run seed</span>.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <DemoPanel />
      </Suspense>
    </div>
  );
}
