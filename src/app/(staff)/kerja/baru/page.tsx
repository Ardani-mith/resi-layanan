import { Suspense } from "react";
import ApplyForm from "@/components/application/ApplyForm";
import { ChannelBadge } from "@/components/application/Badges";
import { Skeleton } from "@/components/ui";
import { getActiveServices, requireStaffPage } from "@/lib/dal";

export const metadata = { title: "Input warga di loket" };

async function LoketForm() {
  await requireStaffPage(["petugas_loket", "admin"], "/kerja/baru");
  const services = await getActiveServices();
  return <ApplyForm services={services} channel="loket" />;
}

export default function LoketPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ChannelBadge channel="loket" long />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Input warga di loket</h1>
      <p className="mt-1 text-muted">
        Untuk warga yang datang langsung. Tahap verifikasi berkas langsung masuk antrean loket.
      </p>
      {/* Beda dengan pengajuan online: tanpa OTP, identitas & persyaratan diperiksa langsung. */}
      <ul className="mt-4 grid gap-2 rounded-card border-l-4 border-warn bg-warn-soft/60 p-4 text-sm sm:grid-cols-3">
        <li>
          <span className="font-semibold">Cocokkan identitas</span>
          <span className="block text-muted">NIK & nama dari KTP-el/KK asli yang dibawa warga.</span>
        </li>
        <li>
          <span className="font-semibold">Tanpa kode OTP</span>
          <span className="block text-muted">Konfirmasi nomor HP langsung ke warga sebelum disimpan.</span>
        </li>
        <li>
          <span className="font-semibold">Tercatat atas nama Anda</span>
          <span className="block text-muted">Berkas ditandai &ldquo;Loket&rdquo; dan masuk audit log.</span>
        </li>
      </ul>
      <div className="mt-6">
        <Suspense fallback={<Skeleton />}>
          <LoketForm />
        </Suspense>
      </div>
    </div>
  );
}
