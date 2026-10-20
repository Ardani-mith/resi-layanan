import { Suspense } from "react";
import ServiceCard from "@/components/application/ServiceCard";
import { Skeleton } from "@/components/ui";
import { getServiceCatalog } from "@/lib/dal";

export const metadata = {
  title: "Layanan",
  description: "Daftar layanan, persyaratan, dan janji waktu tiap tahap.",
};

async function Catalog() {
  const services = await getServiceCatalog();
  if (!services.length) {
    return <p className="rounded-card bg-surface p-6 text-muted">Belum ada layanan yang dibuka.</p>;
  }
  return (
    <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {services.map((service, i) => (
        <li key={service.slug}>
          <ServiceCard service={service} index={i} />
        </li>
      ))}
    </ul>
  );
}

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Layanan</h1>
      <p className="mt-1 max-w-2xl text-muted">
        Setiap layanan punya tahapan dengan tenggat dalam hari kerja. Angka tepat waktu dihitung langsung dari
        permohonan yang sudah selesai.
      </p>
      <div className="mt-6">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <Catalog />
        </Suspense>
      </div>
    </div>
  );
}
