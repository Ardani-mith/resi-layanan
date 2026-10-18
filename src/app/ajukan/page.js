import { connection } from "next/server";
import { Suspense } from "react";
import ApplyForm from "@/components/ApplyForm";
import { dbConnect } from "@/lib/db";
import { listActiveServices } from "@/lib/services";

export const metadata = { title: "Ajukan permohonan" };

async function ApplyLoader({ searchParams }) {
  await connection();
  const [{ layanan }] = await Promise.all([searchParams, dbConnect()]);
  const services = await listActiveServices();
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
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-surface" aria-busy="true" />}>
          <ApplyLoader searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
