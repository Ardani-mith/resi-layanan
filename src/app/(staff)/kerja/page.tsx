import { Suspense } from "react";
import { Alert, Button, DemoClockBanner, Skeleton } from "@/components/ui";
import { firstParam, type SearchParamsOf } from "@/lib/api";
import { getQueue, requireStaffPage } from "@/lib/dal";
import { isValidResi } from "@/lib/resi";
import { ROLE_LABELS, STAFF_ROLES } from "@/lib/roles";
import QueueBoard from "./QueueBoard";

export const metadata = { title: "Antrean petugas" };

// Konfirmasi setelah aksi di /kerja/[resi] (lihat ActionPanel).
const ACTION_DONE: Record<string, string> = {
  complete: "tahap diselesaikan dan diteruskan ke tahap berikutnya",
  request_fix: "permintaan perbaikan dikirim ke warga",
  resume: "berkas lengkap, proses dilanjutkan",
  reject: "permohonan ditolak; alasan sudah tampil di halaman lacak warga",
};

async function Queue({ searchParams }: SearchParamsOf) {
  const user = await requireStaffPage(STAFF_ROLES, "/kerja");
  const [queue, params] = await Promise.all([getQueue(user), searchParams]);
  const selesai = firstParam(params.selesai) ?? "";
  const aksi = firstParam(params.aksi) ?? "";
  const done = isValidResi(selesai) && ACTION_DONE[aksi] ? `${selesai}: ${ACTION_DONE[aksi]}.` : null;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Antrean</h1>
          <p className="text-muted">
            {user.name} · {ROLE_LABELS[user.role]}. Paling mendesak di atas.
          </p>
        </div>
        {(user.role === "petugas_loket" || user.role === "admin") && (
          <Button href="/kerja/baru">+ Input warga di loket</Button>
        )}
      </div>
      <DemoClockBanner offsetMs={queue.offsetMs} />
      <Alert tone="success">{done}</Alert>
      <QueueBoard {...queue} />
    </>
  );
}

export default function WorkPage({ searchParams }: SearchParamsOf) {
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <Suspense fallback={<Skeleton />}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
