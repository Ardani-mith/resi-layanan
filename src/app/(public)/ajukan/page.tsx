import { redirect } from "next/navigation";
import ApplyForm from "@/components/application/ApplyForm";
import { PageSlide, Skeleton, SuspenseReveal } from "@/components/ui";
import { firstParam, type SearchParamsOf } from "@/lib/api";
import { getActiveServices } from "@/lib/dal";

export const metadata = { title: "Ajukan permohonan" };

async function ApplyLoader({ searchParams }: SearchParamsOf) {
  const [{ layanan }, services] = await Promise.all([searchParams, getActiveServices()]);
  const slug = firstParam(layanan);
  // Pilihan layanan warga hanya di katalog (satu tampilan); tanpa layanan yang valid, arahkan ke sana.
  if (services.length && !services.some((s) => s.slug === slug)) redirect("/layanan");
  // Kunci per layanan: halaman /ajukan yang tersimpan (Activity) tidak menahan pemilih layanan lama,
  // jadi "Ajukan sekarang" dari detail layanan selalu langsung membuka form layanan itu.
  return <ApplyForm key={slug ?? ""} services={services} initialSlug={slug} />;
}

export default function ApplyPage({ searchParams }: SearchParamsOf) {
  return (
    <PageSlide className="px-page py-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ajukan permohonan</h1>
      <p className="mt-1 max-w-4xl text-muted">
        Isi sekali, dapat nomor resi, lalu pantau setiap tahap dan tenggatnya tanpa perlu datang bertanya.
      </p>
      <div className="mt-6">
        <SuspenseReveal fallback={<Skeleton />}>
          <ApplyLoader searchParams={searchParams} />
        </SuspenseReveal>
      </div>
    </PageSlide>
  );
}
