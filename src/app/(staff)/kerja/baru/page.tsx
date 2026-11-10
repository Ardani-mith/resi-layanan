import { Suspense } from "react";
import ApplyForm from "@/components/application/ApplyForm";
import { ChannelBadge } from "@/components/application/Badges";
import { Skeleton, StaffHeader } from "@/components/ui";
import { getActiveServices, requireStaffPage } from "@/lib/dal";

export const metadata = { title: "Input warga di loket" };

async function LoketForm() {
  await requireStaffPage(["petugas_loket", "admin"], "/kerja/baru");
  const services = await getActiveServices();
  return <ApplyForm services={services} channel="loket" />;
}

export default function LoketPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <StaffHeader
        title="Input warga di loket"
        description="Untuk warga yang datang langsung. Tahap verifikasi berkas langsung masuk antrean loket."
        actions={<ChannelBadge channel="loket" long />}
      />
      {/* Beda dengan pengajuan online: tanpa OTP, identitas & persyaratan diperiksa langsung. */}
      <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line text-sm sm:grid-cols-3 [&>li]:bg-surface [&>li]:p-4">
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
      <Suspense fallback={<Skeleton />}>
        <LoketForm />
      </Suspense>
    </div>
  );
}
