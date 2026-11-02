import { Suspense } from "react";
import { Panel, Skeleton, StaffHeader } from "@/components/ui";
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
      <Panel
        title={
          <>
            Daftar layanan <span className="ml-1 font-normal text-muted tabular-nums">{services.length}</span>
          </>
        }
        flush
      >
        <ul className="divide-y divide-line">
          {services.map((service) => (
            <ServiceRow key={service.id} service={service} />
          ))}
        </ul>
      </Panel>
      <AdminLog events={events} />
    </>
  );
}

export default function AdminServicesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <StaffHeader
        title="Layanan & SLA"
        description="Atur persyaratan, tahapan, peran penanggung jawab, dan tenggat tiap tahap. Permohonan yang sudah berjalan tetap memakai tahapan saat diajukan, jadi perubahan aman dilakukan kapan saja."
      />
      <Suspense fallback={<Skeleton />}>
        <ServicesPanel />
      </Suspense>
    </div>
  );
}
