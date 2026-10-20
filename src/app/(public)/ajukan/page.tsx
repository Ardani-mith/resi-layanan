import { Suspense } from "react";
import ApplyForm from "@/components/application/ApplyForm";
import Skeleton from "@/components/ui/Skeleton";
import { getActiveServices } from "@/lib/dal";

export const metadata = { title: "Ajukan permohonan" };

async function ApplyLoader({ searchParams }) {
  const [{ layanan }, services] = await Promise.all([searchParams, getActiveServices()]);
  return <ApplyForm services={services} initialSlug={layanan} />;
}

export default function ApplyPage({ searchParams }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ajukan permohonan</h1>
      <p className="mt-1 max-w-2xl text-muted">
        Isi sekali, dapat nomor resi, lalu pantau setiap tahap dan tenggatnya tanpa perlu datang bertanya.
      </p>
      <div className="mt-6">
        <Suspense fallback={<Skeleton />}>
          <ApplyLoader searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
