import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { getAdminEvents, getAdminServices, requireStaffPage } from "@/lib/dal";
import AdminLog from "../AdminLog";
import { NewService, ServiceRow } from "./ServiceEditor";

export const metadata = { title: "Layanan & SLA" };

async function ServicesPanel() {
  await requireStaffPage(["admin"], "/admin/layanan");
  const [services, events] = await Promise.all([getAdminServices(), getAdminEvents("service_", 15)]);
  return (
    <>
      <NewService />
      <section className="rounded-card border border-line bg-surface" aria-labelledby="daftar-layanan">
        <h2 id="daftar-layanan" className="border-b border-line p-5 text-lg font-bold">
          Daftar layanan <span className="text-sm font-normal text-muted">({services.length})</span>
        </h2>
        <ul className="divide-y divide-line">
          {services.map((service) => (
            <ServiceRow key={service.id} service={service} />
          ))}
        </ul>
      </section>
      <AdminLog events={events} />
    </>
  );
}

export default function AdminServicesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Layanan & SLA</h1>
        <p className="mt-1 text-muted">
          Atur persyaratan, tahapan, peran penanggung jawab, dan tenggat tiap tahap. Permohonan yang sudah
          berjalan tetap memakai tahapan saat diajukan, jadi perubahan aman dilakukan kapan saja.
        </p>
      </div>
      <Suspense fallback={<Skeleton />}>
        <ServicesPanel />
      </Suspense>
    </div>
  );
}
