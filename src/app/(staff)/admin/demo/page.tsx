import { Suspense } from "react";
import { Button, DemoClockBanner, Panel, Skeleton, StaffHeader } from "@/components/ui";
import { cn } from "@/lib/cn";
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
      <Panel title="Jam sistem">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">Waktu nyata</dt>
            <dd className="text-lg font-semibold">{formatDateTime(realNow)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Waktu sistem (dipakai untuk SLA)</dt>
            <dd className={cn("text-lg font-semibold", clock.offsetMs && "text-warn")}>
              {formatDateTime(clock.now)}
            </dd>
          </div>
        </dl>
        <div className="mt-6">
          <DemoControls hasOffset={clock.offsetMs !== 0} />
        </div>
      </Panel>
      <Panel title="Alur demo yang disarankan">
        <ol className="list-inside list-decimal space-y-1 text-sm text-muted">
          <li>
            Warga mengajukan akta kelahiran di <span className="font-mono">/ajukan</span>, lalu menyimpan
            resinya.
          </li>
          <li>Petugas loket menyelesaikan verifikasi di antrean.</li>
          <li>
            Majukan jam +4 jam kerja di sini: tahap entri data (target 2 jam kerja) melewati tenggat dan
            diteruskan ke Kepala Seksi. +1 hari kerja lagi: naik ke Kepala Bidang.
          </li>
          <li>Buka resi di HP (tahap merah) dan dashboard pimpinan (eskalasi muncul).</li>
          <li>Kembalikan ke waktu nyata setelah demo selesai.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="/pantau" variant="secondary">
            Buka dashboard pimpinan
          </Button>
          <Button href="/kerja" variant="secondary">
            Buka antrean
          </Button>
        </div>
      </Panel>
    </>
  );
}

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <StaffHeader
        title="Mode demo: simulasi waktu"
        description={
          <>
            Menggeser jam sistem agar keterlambatan & eskalasi bisa diperlihatkan tanpa menunggu berhari-hari.
            Tanggal permohonan tidak diubah, hanya &ldquo;sekarang&rdquo; yang bergeser. Saat kembali ke waktu
            nyata, eskalasi hasil simulasi dibatalkan; audit log tetap mencatatnya. Untuk data yang
            benar-benar bersih, jalankan <span className="font-mono">npm run seed</span>.
          </>
        }
      />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <DemoPanel />
      </Suspense>
    </div>
  );
}
