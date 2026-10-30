import ServiceCard from "@/components/application/ServiceCard";
import { PageHeader, PageSlide, Skeleton, SuspenseReveal } from "@/components/ui";
import { site } from "@/config/site";
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
    <PageSlide className="px-page py-12">
      <PageHeader label={`Layanan ${site.agency}`} title="Pilih dokumen, lihat janjinya dulu.">
        Setiap layanan punya tahapan dengan tenggat dalam jam kerja; dokumen terbit paling lama 24 jam setelah
        berkas lengkap (Permendagri 19/2018). Angka tepat waktu dihitung dari permohonan yang sudah selesai.
      </PageHeader>
      <div className="mt-10">
        <SuspenseReveal fallback={<Skeleton className="h-64" />}>
          <Catalog />
        </SuspenseReveal>
      </div>
    </PageSlide>
  );
}
