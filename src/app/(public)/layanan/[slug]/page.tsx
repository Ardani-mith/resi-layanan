import { CheckCircle2, FileCheck2, HandCoins, Megaphone } from "lucide-react";
import { notFound } from "next/navigation";
import { StatTile } from "@/components/charts";
import { Button, PageSlide, Skeleton, SuspenseReveal } from "@/components/ui";
import type { ParamsOf } from "@/lib/api";
import { getServiceCatalog } from "@/lib/dal";
import { formatPercent, formatWorkHours } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";

export const metadata = { title: "Detail layanan" };

const number = (value: number | null, suffix = "") =>
  value === null ? "—" : `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}${suffix}`;

async function ServiceDetail({ params }: ParamsOf<{ slug: string }>) {
  const { slug } = await params;
  const service = (await getServiceCatalog()).find((s) => s.slug === slug);
  if (!service) notFound();
  const perf = service.performance;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok">
            <HandCoins aria-hidden className="size-3.5" />
            Gratis · Rp0
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{service.name}</h1>
          <p className="mt-2 text-muted">{service.description}</p>
        </div>
        <Button href={`/ajukan?layanan=${service.slug}`} transitionTypes={["nav-forward"]}>
          Ajukan sekarang
        </Button>
      </div>

      <section aria-labelledby="kinerja" className="mt-8">
        <h2 id="kinerja" className="sr-only">
          Kinerja layanan
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Selesai tepat waktu"
            value={formatPercent(perf.onTimeRate)}
            note={`dari ${perf.completed} permohonan`}
          />
          <StatTile
            label="Terbit ≤ 24 jam"
            value={formatPercent(perf.promiseRate)}
            note={`rata-rata ${formatWorkHours(perf.avgIssueHours)} setelah berkas lengkap`}
          />
          <StatTile
            label="Kepuasan warga"
            value={number(perf.ratingAvg, "/5")}
            note={`${perf.ratingCount} penilaian`}
          />
          <StatTile label="Sedang diproses" value={perf.open} />
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section aria-labelledby="syarat" className="rounded-card border border-line bg-surface p-5">
          <h2 id="syarat" className="text-lg font-bold">
            Persyaratan
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {service.requirements.map((r) => (
              <li key={r} className="flex gap-2">
                <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-4 flex gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <FileCheck2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>
              Hasil: <span className="font-semibold">{service.output}</span>
            </span>
          </p>
        </section>

        <section aria-labelledby="tahapan" className="rounded-card border border-line bg-surface p-5">
          <h2 id="tahapan" className="text-lg font-bold">
            Tahapan & janji waktu
          </h2>
          <p className="text-sm text-muted">
            Verifikasi berkas paling lama {formatWorkHours(service.steps[0]?.slaHours)}; setelah berkas
            lengkap, dokumen terbit paling lama {formatWorkHours(service.issueSlaHours)} (Permendagri 19/2018:
            maksimal 24 jam). Jam kerja Senin–Jumat 08.00–16.00 WIB. Waktu menunggu perbaikan berkas dari
            warga tidak dihitung.
          </p>
          <ol className="mt-4 space-y-3">
            {service.steps.map((step, i) => (
              <li key={step.key} className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-medium">{step.name}</p>
                  <p className="text-sm text-muted">
                    {ROLE_LABELS[step.role]} ·{" "}
                    {step.slaHours ? formatWorkHours(step.slaHours) : "tanpa tenggat"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Komponen standar pelayanan yang sering ditanyakan: biaya dan jalur pengaduan. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="biaya" className="rounded-card border border-line bg-surface p-5">
          <h2 id="biaya" className="flex items-center gap-2 text-lg font-bold">
            <HandCoins aria-hidden className="size-5 text-ok" />
            Biaya: gratis
          </h2>
          <p className="mt-2 text-sm">
            Pengurusan dan penerbitan dokumen kependudukan tidak dipungut biaya (UU 24/2013 tentang
            Administrasi Kependudukan, Pasal 79A). Tidak ada biaya resmi untuk mempercepat, mencetak, atau
            mengambil dokumen.
          </p>
          <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">
            Petugas tidak boleh meminta atau menerima imbalan dalam bentuk apa pun.
          </p>
        </section>

        <section aria-labelledby="pengaduan" className="rounded-card border border-line bg-surface p-5">
          <h2 id="pengaduan" className="flex items-center gap-2 text-lg font-bold">
            <Megaphone aria-hidden className="size-5 text-brand" />
            Jika ada masalah
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            <li>
              <span className="font-semibold">Terlambat:</span> tidak perlu mengadu. Tahap yang melewati
              tenggat otomatis diteruskan ke Kepala Seksi, lalu Kepala Bidang, dan tanggapannya tampil di
              halaman lacak.
            </li>
            <li>
              <span className="font-semibold">Dimintai bayaran atau dipersulit:</span> laporkan ke SP4N-LAPOR!
              di{" "}
              <a
                href="https://www.lapor.go.id"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand hover:underline"
              >
                lapor.go.id
              </a>{" "}
              dengan menyertakan nomor resi Anda.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}

export default function ServiceDetailPage({ params }: ParamsOf<{ slug: string }>) {
  return (
    <PageSlide className="px-20 py-8">
      <SuspenseReveal fallback={<Skeleton />}>
        <ServiceDetail params={params} />
      </SuspenseReveal>
    </PageSlide>
  );
}
