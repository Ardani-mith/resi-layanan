import { Suspense } from "react";
import ApplyForm from "@/components/application/ApplyForm";
import Skeleton from "@/components/ui/Skeleton";
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
      <h1 className="text-2xl font-bold tracking-tight">Input warga di loket</h1>
      <p className="mt-1 text-muted">
        Untuk warga yang datang langsung. Tahap verifikasi berkas langsung masuk antrean loket.
      </p>
      <div className="mt-6">
        <Suspense fallback={<Skeleton />}>
          <LoketForm />
        </Suspense>
      </div>
    </div>
  );
}
