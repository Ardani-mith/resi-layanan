import { Check } from "lucide-react";
import { Suspense } from "react";
import { Button, Skeleton } from "@/components/ui";
import type { SearchParamsOf } from "@/lib/api";
import { isValidResi, normalizeResi } from "@/lib/resi";

export const metadata = { title: "Permohonan terkirim" };

async function Success({ searchParams }: SearchParamsOf) {
  const params = await searchParams;
  const resi = normalizeResi(params.resi);
  const isLoket = params.loket === "1";

  if (!isValidResi(resi)) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Nomor resi tidak ditemukan di tautan ini</h1>
        <p className="mt-2 text-muted">Jika Anda baru saja mengajukan, cek resi di halaman lacak.</p>
        <Button href="/lacak" className="mt-6">
          Lacak resi
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <span aria-hidden className="mx-auto grid size-14 place-items-center rounded-full bg-ok-soft text-ok">
        <Check className="size-7" />
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {isLoket ? "Permohonan terdaftar" : "Permohonan terkirim"}
      </h1>
      <p className="mt-2 text-muted">
        {isLoket
          ? "Berikan nomor resi ini kepada warga."
          : "Simpan nomor resi ini. Anda membutuhkannya untuk melacak permohonan."}
      </p>

      <div className="mt-6 rounded-card border-2 border-dashed border-brand bg-brand-soft px-4 py-6">
        <p className="text-sm text-muted">Nomor resi</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-widest select-all sm:text-4xl">{resi}</p>
      </div>

      <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm">
        <li>• Petugas loket akan memverifikasi berkas paling lambat 1 hari kerja.</li>
        <li>
          • Jika ada berkas yang kurang, catatannya muncul di halaman lacak dan hitung mundur instansi
          dihentikan sampai Anda melengkapinya.
        </li>
        <li>• Untuk melihat detail, siapkan 4 digit terakhir nomor HP yang Anda daftarkan.</li>
      </ul>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href={`/lacak/${resi}`}>Lacak sekarang</Button>
        <Button href={isLoket ? "/kerja/baru" : "/"} variant="secondary">
          {isLoket ? "Input warga berikutnya" : "Kembali ke beranda"}
        </Button>
      </div>
    </div>
  );
}

export default function SuccessPage({ searchParams }: SearchParamsOf) {
  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <Suspense fallback={<Skeleton className="h-80" />}>
        <Success searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
