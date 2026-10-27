import ApplyForm from "@/components/application/ApplyForm";
import { PageSlide, Skeleton, SuspenseReveal } from "@/components/ui";
import { firstParam, type SearchParamsOf } from "@/lib/api";
import { getActiveServices } from "@/lib/dal";

export const metadata = { title: "Ajukan permohonan" };

async function ApplyLoader({ searchParams }: SearchParamsOf) {
  const [{ layanan }, services] = await Promise.all([searchParams, getActiveServices()]);
  return <ApplyForm services={services} initialSlug={firstParam(layanan)} />;
}

export default function ApplyPage({ searchParams }: SearchParamsOf) {
  return (
    <PageSlide className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ajukan permohonan</h1>
      <p className="mt-1 max-w-2xl text-muted">
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
