import {
  ArrowRight,
  BadgeCheck,
  Clock,
  HandCoins,
  MapPin,
  Megaphone,
  Send,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentArtFor } from "@/components/application/DocumentArt";
import { PageSlide, Skeleton, SuspenseReveal } from "@/components/ui";
import type { ParamsOf } from "@/lib/api";
import { cn } from "@/lib/cn";
import { getServiceCatalog } from "@/lib/dal";
import { formatPercent, formatWorkHours } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";

export const metadata = { title: "Detail layanan" };

/** Tahap bawaan yang menuntut warga hadir (ditandai di linimasa). */
const CITIZEN_STEP: Record<string, string> = {
  perekaman: "Anda hadir",
  penyerahan: "Anda ambil",
};

/** Satu angka persentase rapor + bar tipis (hijau ≥ 80%, kuning ≥ 60%, merah di bawahnya). */
function RateMetric({ label, rate, note }: { label: string; rate: number | null; note: string }) {
  const tone = rate === null ? "bg-line" : rate >= 0.8 ? "bg-ok" : rate >= 0.6 ? "bg-warn" : "bg-late";
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-2xl font-medium tracking-tight tabular-nums">
        {formatPercent(rate)}
      </dd>
      <dd className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <span className={cn("block h-full rounded-full", tone)} style={{ width: `${(rate ?? 0) * 100}%` }} />
      </dd>
      <dd className="mt-1.5 text-xs text-muted">{note}</dd>
    </div>
  );
}

async function ServiceDetail({ params }: ParamsOf<{ slug: string }>) {
  const { slug } = await params;
  const service = (await getServiceCatalog()).find((s) => s.slug === slug);
  if (!service) notFound();
  // Dokumen tegak (akta, dokumen umum) lebih sempit dari kartu mendatar (KTP, KK).
  const landscapeDoc = /ktp|kk|keluarga/.test(service.slug);
  const applyHref = `/ajukan?layanan=${service.slug}`;
  const perf = service.performance;
  const timed = service.steps.filter((step) => step.slaHours);
  // Fakta inti layanan, ditampilkan di kartu pengajuan (pengganti kartu statistik).
  const facts = [
    { icon: HandCoins, label: "Biaya", value: "Gratis, Rp0" },
    {
      icon: ShieldCheck,
      label: "Verifikasi berkas",
      value: `± ${formatWorkHours(service.steps[0]?.slaHours)}`,
    },
    {
      icon: Clock,
      label: "Dokumen terbit",
      value: `± ${formatWorkHours(service.issueSlaHours)} setelah berkas lengkap`,
    },
    service.requiresVisit
      ? { icon: MapPin, label: "Cara", value: "Daftar online, lalu datang ke loket" }
      : { icon: Send, label: "Cara", value: "Online, langsung dapat nomor resi" },
  ];

  // Urutan setelah menekan "Ajukan sekarang" (sesuai alur form & resi).
  const applySteps: [string, string][] = [
    ["Isi data pemohon", "±2 menit, tanpa membuat akun"],
    ["Verifikasi nomor HP", "kode 6 digit dikirim ke HP Anda"],
    ["Dapat nomor resi", "pantau tiap tahap & tenggatnya"],
    ...(service.requiresVisit
      ? ([["Datang ke loket", "bawa dokumen asli untuk perekaman"]] as [string, string][])
      : []),
  ];

  return (
    <>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{service.name}</h1>
        <p className="mt-2 text-muted">{service.description}</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Sorotan ke pengajuan: di HP tampil paling atas, di desktop setinggi kolom kiri (tombol di dasar,
            sejajar kartu "Jika ada masalah"). */}
        <aside
          aria-labelledby="ajukan-cta"
          className="relative flex flex-col overflow-hidden rounded-3xl bg-[linear-gradient(150deg,var(--hero-g1)_0%,var(--hero-g2)_50%,var(--hero-g3)_100%)] p-6 text-white lg:order-last"
        >
          <Send
            aria-hidden
            strokeWidth={1.5}
            className="pointer-events-none absolute -top-6 -right-8 size-36 rotate-12 text-white/10"
          />
          <p className="relative text-xs font-semibold tracking-wider text-white/70 uppercase">Pengajuan</p>
          <h2 id="ajukan-cta" className="relative mt-1 text-xl font-bold">
            Ajukan {service.name}
          </h2>
          <dl className="relative mt-4 mb-5 divide-y divide-white/10 border-y border-white/10">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 py-2.5">
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-white/70" />
                <dt className="sr-only">{label}</dt>
                <dd className="text-sm">
                  <span className="block text-xs text-white/60">{label}</span>
                  <span className="font-semibold">{value}</span>
                </dd>
              </div>
            ))}
          </dl>

          {/* Desktop: kartu setinggi kolom kiri, jadi ruang tengahnya diisi cara mengajukan. */}
          <div className="relative mb-6 hidden flex-1 flex-col justify-center lg:flex">
            <p className="text-xs font-semibold tracking-wider text-white/60 uppercase">Cara mengajukan</p>
            <ol className="mt-3">
              {applySteps.map(([title, note], i) => {
                const last = i === applySteps.length - 1;
                return (
                  <li key={title} className="relative flex gap-3 pb-4 last:pb-0">
                    {!last && (
                      <span
                        aria-hidden
                        className="absolute top-7 bottom-0 left-3.5 w-px -translate-x-1/2 bg-white/20"
                      />
                    )}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 font-mono text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span className="min-w-0 pt-0.5 text-sm">
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-xs text-white/60">{note}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <Link
            href={applyHref}
            transitionTypes={["nav-forward"]}
            className="relative mt-auto flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0c1f5c] shadow-lg transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Ajukan sekarang
            <ArrowRight aria-hidden className="size-4" />
          </Link>
          <p className="relative mt-2 text-center text-xs text-white/60">Isi data ±2 menit, tanpa akun.</p>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <section
              aria-labelledby="syarat"
              className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="syarat" className="text-lg font-bold">
                  Persyaratan
                </h2>
                <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">
                  {service.requirements.length} dokumen
                </span>
              </div>
              <p className="text-sm text-muted">
                {service.requiresVisit
                  ? "Bawa dokumen aslinya saat datang ke loket."
                  : "Siapkan dokumen berikut; petugas memverifikasi aslinya."}
              </p>
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
                {service.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-3 px-3.5 py-2.5 text-sm">
                    {/* Lencana centang bergaya "verified" (biru penuh, centang putih). */}
                    <BadgeCheck aria-hidden className="size-5 shrink-0 fill-[#0866ff] text-white" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              {/* Dokumen hasil di atas "meja" bergradasi lembut, muncul dari tepi bawah kartu dan sedikit
                  terangkat saat kartu disorot. Mengisi sisa tinggi kartu, jadi tidak ada ruang kosong. */}
              <div
                aria-hidden
                className="relative -mx-5 mt-4 -mb-5 min-h-28 flex-1 overflow-hidden bg-[linear-gradient(to_bottom,transparent,var(--brand-soft)_85%)]"
              >
                <div
                  className={cn(
                    "absolute top-4 left-1/2 -translate-x-1/2 drop-shadow-[0_10px_24px_rgb(15_27_45/0.18)] transition-transform duration-500 ease-out motion-safe:group-hover:-translate-y-2",
                    landscapeDoc ? "w-[70%] max-w-xs" : "w-[44%] max-w-52",
                  )}
                >
                  <DocumentArtFor slug={service.slug} />
                </div>
              </div>
            </section>

            <section
              aria-labelledby="tahapan"
              className="flex flex-col rounded-card border border-line bg-surface p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="tahapan" className="text-lg font-bold">
                  Tahapan & janji waktu
                </h2>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                  ± {formatWorkHours(service.totalSlaHours)}
                </span>
              </div>

              {/* Bar waktu tipis: lebar ruas sebanding tenggat; verifikasi lebih muda dari janji terbit. */}
              <div aria-hidden className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                {timed.map((step, i) => (
                  <span
                    key={step.key}
                    style={{ flexGrow: step.slaHours ?? 0 }}
                    className={cn("basis-0", i === 0 ? "bg-brand/30" : "bg-brand")}
                  />
                ))}
              </div>
              <p className="mt-1.5 flex justify-between gap-3 text-xs text-muted">
                <span>Verifikasi ± {formatWorkHours(service.steps[0]?.slaHours)}</span>
                <span className="font-medium text-brand">
                  Terbit ± {formatWorkHours(service.issueSlaHours)}
                </span>
              </p>

              <ol className="mt-5 mb-5">
                {service.steps.map((step, i) => {
                  const last = i === service.steps.length - 1;
                  const citizen = CITIZEN_STEP[step.key];
                  return (
                    <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
                      {!last && (
                        <span aria-hidden className="absolute top-4 bottom-0 left-[3.5px] w-px bg-line" />
                      )}
                      <span
                        aria-hidden
                        className={cn(
                          "relative mt-1.5 size-2 shrink-0 rounded-full",
                          i === 0 ? "bg-brand/40" : last ? "bg-ok" : "bg-brand",
                        )}
                      />
                      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{step.name}</p>
                          <p className="text-xs text-muted">
                            {ROLE_LABELS[step.role]}
                            {citizen && <span className="font-medium text-warn"> · {citizen}</span>}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono text-xs text-muted tabular-nums">
                          {step.slaHours ? formatWorkHours(step.slaHours, { short: true }) : "—"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <p className="mt-auto border-t border-line pt-3 text-xs text-muted">
                Jam kerja Senin–Jumat 08.00–16.00 WIB. Anda dikabari tiap tahap selesai; waktu menunggu
                perbaikan berkas tidak dihitung.
              </p>
            </section>
          </div>

          {/* Rapor layanan ini: angka kinerja dengan bar/bintang, satu kartu (bukan empat kotak). */}
          <section aria-labelledby="rapor" className="rounded-card border border-line bg-surface">
            {/* <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-4">
              <h2 id="rapor" className="text-lg font-bold">
                Rapor layanan
              </h2>
              <p className="text-sm text-muted">
                {perf.completed
                  ? `Dari ${perf.completed} permohonan selesai · `
                  : "Belum ada permohonan selesai · "}
                <Link href="/rapor" className="font-semibold text-brand hover:underline">
                  Rapor lengkap
                </Link>
              </p>
            </div> */}
            <dl className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x [&>div]:p-5 max-sm:[&>div:nth-child(-n+2)]:border-b max-sm:[&>div:nth-child(-n+2)]:border-line max-sm:[&>div:nth-child(odd)]:border-r max-sm:[&>div:nth-child(odd)]:border-line">
              <RateMetric
                label="Selesai tepat waktu"
                rate={perf.onTimeRate}
                note="sesuai tenggat tiap tahap"
              />
              <RateMetric
                label="Terbit ± 24 jam"
                rate={perf.promiseRate}
                note={
                  perf.avgIssueHours === null
                    ? "setelah berkas lengkap"
                    : `rata-rata ${formatWorkHours(perf.avgIssueHours)}`
                }
              />
              <div>
                <dt className="text-sm text-muted">Kepuasan warga</dt>
                <dd className="mt-1 font-mono text-2xl font-medium tracking-tight tabular-nums">
                  {perf.ratingAvg === null
                    ? "—"
                    : perf.ratingAvg.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                  <span className="text-base text-muted">/5</span>
                </dd>
                <dd className="mt-2 flex items-center gap-0.5" aria-hidden>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "size-3.5",
                        perf.ratingAvg !== null && i < Math.round(perf.ratingAvg)
                          ? "fill-[#f5b301] text-[#f5b301]"
                          : "fill-surface-2 text-line",
                      )}
                    />
                  ))}
                </dd>
                <dd className="mt-1.5 text-xs text-muted">{perf.ratingCount} penilaian</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Sedang diproses</dt>
                <dd className="mt-1 flex items-center gap-2 font-mono text-2xl font-medium tracking-tight tabular-nums">
                  {perf.open > 0 && (
                    <span aria-hidden className="relative flex size-2">
                      <span className="absolute inset-0 animate-ping rounded-full bg-brand/60 motion-reduce:animate-none" />
                      <span className="relative size-2 rounded-full bg-brand" />
                    </span>
                  )}
                  {perf.open}
                </dd>
                <dd className="mt-2 text-xs text-muted">permohonan berjalan saat ini</dd>
              </div>
            </dl>
          </section>

          {/* Komponen standar pelayanan yang sering ditanyakan: biaya dan jalur pengaduan, satu kartu. */}
          <section className="grid gap-5 rounded-card border border-line bg-surface p-5 md:grid-cols-2 md:gap-0 md:divide-x md:divide-line">
            <div className="md:pr-5">
              <h2 className="flex items-center gap-2 font-bold">
                <HandCoins aria-hidden className="size-5 text-ok" />
                Biaya: Gratis
              </h2>
              <p className="mt-2 text-sm text-muted">
                Tidak dipungut biaya (UU 24/2013, Pasal 79A), termasuk untuk mempercepat, mencetak, atau
                mengambil dokumen. Petugas tidak boleh meminta atau menerima imbalan apa pun.
              </p>
            </div>
            <div className="md:pl-5">
              <h2 className="flex items-center gap-2 font-bold">
                <Megaphone aria-hidden className="size-5 text-brand" />
                Jika ada masalah
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                <li>
                  <span className="font-semibold text-text">Terlambat:</span> otomatis diteruskan ke Kepala
                  Seksi, lalu Kepala Bidang; tanggapannya tampil di halaman lacak.
                </li>
                <li>
                  <span className="font-semibold text-text">Dimintai bayaran/dipersulit:</span> laporkan ke{" "}
                  <a
                    href="https://www.lapor.go.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand hover:underline"
                  >
                    lapor.go.id
                  </a>{" "}
                  dengan nomor resi Anda.
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default function ServiceDetailPage({ params }: ParamsOf<{ slug: string }>) {
  return (
    <PageSlide className="px-page py-8">
      <SuspenseReveal fallback={<Skeleton />}>
        <ServiceDetail params={params} />
      </SuspenseReveal>
    </PageSlide>
  );
}
