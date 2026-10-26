import { Check, CheckCircle2 } from "lucide-react";
import { type ReactNode, Suspense } from "react";
import OfficeMap from "@/components/application/OfficeMap";
import ReceiptCard from "@/components/application/ReceiptCard";
import { Button, Skeleton } from "@/components/ui";
import type { SearchParamsOf } from "@/lib/api";
import { cn } from "@/lib/cn";
import { getTracking } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { receiptFor } from "@/lib/qr";
import { isValidResi, normalizeResi } from "@/lib/resi";

export const metadata = { title: "Permohonan terkirim" };

/** Satu langkah di urutan "apa yang terjadi selanjutnya". */
function Step({
  n,
  done,
  title,
  children,
}: {
  n: number;
  done?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="group relative flex gap-3 pb-5 last:pb-0">
      {/* garis penghubung antarlangkah */}
      <span aria-hidden className="absolute top-8 bottom-0 left-[0.9375rem] w-px bg-line group-last:hidden" />
      <span
        aria-hidden
        className={cn(
          "relative grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold",
          done ? "bg-ok text-surface" : "bg-brand-soft text-brand",
        )}
      >
        {done ? <Check className="size-4" /> : n}
      </span>
      <div className="min-w-0 pt-1 text-sm">
        <p className="font-semibold text-text">{title}</p>
        <div className="mt-0.5 text-muted">{children}</div>
      </div>
    </li>
  );
}

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

  const [data, receipt] = await Promise.all([getTracking(resi), receiptFor(resi)]);
  const current = data?.steps[data.currentStep];
  // Layanan wajib hadir (mis. KTP-el): pendaftaran online, tenggat mulai saat warga datang.
  const awaiting = data?.status === "menunggu_kedatangan";
  const n = (step: number) => (awaiting ? step + 1 : step);
  const bring = [
    "Bukti resi (QR di halaman ini)",
    "KTP-el atau KK asli pemohon",
    ...(data?.requirements ?? []),
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-full bg-ok-soft text-ok"
        >
          <Check className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {isLoket ? "Permohonan terdaftar" : "Permohonan terkirim"}
          </h1>
          <p className="text-muted">
            {data?.serviceName && <span className="font-medium text-text">{data.serviceName} · </span>}
            {isLoket
              ? "Berikan nomor resi ini kepada warga dan jelaskan langkah berikut."
              : "Simpan nomor resi ini untuk melacak permohonan."}
          </p>
        </div>
        <p className="rounded-xl border-2 border-dashed border-brand bg-brand-soft px-4 py-2 font-mono text-2xl font-bold tracking-widest select-all">
          {resi}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section
            aria-labelledby="next-title"
            className="rounded-card border border-line bg-surface p-5 shadow-card"
          >
            <h2 id="next-title" className="text-lg font-bold">
              Apa yang terjadi selanjutnya?
            </h2>
            <p className="mt-1 text-sm text-muted">
              {awaiting
                ? "Layanan ini wajib datang langsung ke loket untuk perekaman biometrik dan pemeriksaan dokumen asli. Hitung mundur layanan dimulai saat Anda hadir."
                : `${isLoket ? "Warga" : "Anda"} tidak perlu datang ke kantor sampai dokumen siap diambil, kecuali diminta melengkapi berkas.`}
            </p>
            <ol className="mt-5">
              <Step n={1} done title={awaiting ? "Pendaftaran diterima" : "Permohonan diterima"}>
                Nomor resi {resi} sudah aktif dan bisa dilacak kapan saja.
              </Step>
              {awaiting && (
                <Step n={2} title="Datang ke loket dengan dokumen asli">
                  <p>
                    Pada jam kerja (Senin–Jumat 08.00–16.00 WIB)
                    {data?.arrivalDeadline && (
                      <>
                        , paling lambat{" "}
                        <span className="font-medium text-text">{formatDateTime(data.arrivalDeadline)}</span>
                      </>
                    )}
                    . Bawa:
                  </p>
                  <ul className="mt-2 grid gap-x-4 gap-y-1.5 text-text sm:grid-cols-2">
                    {bring.map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Step>
              )}
              <Step n={n(2)} title={current ? `${current.name}` : "Pemeriksaan berkas"}>
                {current?.dueAt ? (
                  <>
                    Paling lambat{" "}
                    <span className="font-medium text-text">{formatDateTime(current.dueAt)}</span>.{" "}
                  </>
                ) : null}
                {awaiting && "Dimulai saat Anda hadir; tenggatnya baru berjalan sejak itu. "}
                Jika ada yang kurang, catatannya muncul di halaman lacak dan hitung mundur instansi dihentikan
                sampai berkas dilengkapi.
              </Step>
              <Step n={n(3)} title="Dokumen terbit ≤ 24 jam setelah berkas lengkap">
                Sesuai Permendagri 19/2018, dihitung dalam jam kerja (Senin–Jumat 08.00–16.00 WIB).
                {data?.estimatedCompletion && (
                  <>
                    {" "}
                    Perkiraan siap diambil{" "}
                    <span className="font-medium text-text">{formatDateTime(data.estimatedCompletion)}</span>.
                  </>
                )}{" "}
                Tahap yang terlambat diteruskan otomatis ke atasan petugas.
              </Step>
              <Step n={n(4)} title="Ambil dokumen di lokasi layanan">
                <p>Status berubah menjadi &ldquo;Siap Diambil&rdquo;. Bawa berkas berikut:</p>
                <ul className="mt-2 grid gap-x-4 gap-y-1.5 text-text sm:grid-cols-2">
                  {(awaiting ? bring.slice(0, 2) : bring).map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Step>
            </ol>
          </section>

          {/* Belum perlu sekarang: peta ringkas, dibuka bila warga ingin tahu lokasinya. */}
          {!isLoket && <OfficeMap defaultOpen={false} title="Lokasi pengambilan dokumen nanti" />}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <ReceiptCard {...receipt} title="Simpan bukti resi" />
          <p className="text-center text-xs text-muted">
            Untuk melihat detail di halaman lacak, siapkan 4 digit terakhir nomor HP yang didaftarkan.
          </p>
          <div className="grid gap-2">
            <Button href={`/lacak/${resi}`}>Lacak sekarang</Button>
            <Button href={isLoket ? "/kerja/baru" : "/"} variant="secondary">
              {isLoket ? "Input warga berikutnya" : "Kembali ke beranda"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function SuccessPage({ searchParams }: SearchParamsOf) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense fallback={<Skeleton className="h-80" />}>
        <Success searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
