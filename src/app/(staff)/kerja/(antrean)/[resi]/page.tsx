import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { ChannelBadge, StatusBadge } from "@/components/application/Badges";
import ReceiptCard from "@/components/application/ReceiptCard";
import Timeline from "@/components/application/Timeline";
import { DetailSkeleton } from "@/components/skeletons";
import { Alert, Disclosure, Panel } from "@/components/ui";
import { firstParam, type ParamsOf, type SearchParamsOf } from "@/lib/api";
import { cn } from "@/lib/cn";
import { getQueue, getStaffApplication, requireStaffPage, type StaffApplication } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { receiptFor } from "@/lib/qr";
import { isValidResi } from "@/lib/resi";
import { ROLE_LABELS, STAFF_ROLES } from "@/lib/roles";
import { ACTION_DONE, EVENT_LABELS, followUpFor, WAITING_CITIZEN_STATUSES } from "@/lib/workflow";
import ActionPanel from "./ActionPanel";
import FollowUpPanel from "./FollowUpPanel";

export const metadata = { title: "Detail permohonan" };

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

const CALLOUT_TONE = {
  late: "border-l-late",
  pause: "border-l-pause",
  muted: "border-l-line",
};

/** Catatan penting di atas detail: kotak putih bertepi tipis + aksen warna di kiri. */
function Callout({
  tone,
  label,
  children,
}: {
  tone: keyof typeof CALLOUT_TONE;
  label?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "rounded-card border border-l-[3px] border-line bg-surface px-4 py-3 text-sm",
        CALLOUT_TONE[tone],
      )}
    >
      {children}
    </section>
  );
}

/**
 * Asal data permohonan: online (diisi warga sendiri) atau loket (diinput petugas), beserta
 * apa artinya bagi verifikasi. Dua warna & ikon yang sama dengan penanda di antrean.
 */
function ChannelOrigin({ app }: { app: StaffApplication }) {
  const online = app.channel === "online";
  const creator = app.events.find((e) => e.action === "created")?.actorName;
  const points = online
    ? [
        "Data diisi sendiri oleh warga",
        "Nomor HP terverifikasi kode OTP",
        "Persetujuan pemrosesan data dicentang warga",
        "Dokumen asli belum dilihat petugas: cocokkan saat verifikasi",
      ]
    : [
        `Diinput oleh ${creator ?? "petugas loket"} saat warga hadir`,
        "Identitas dicocokkan dengan KTP-el/KK asli di loket",
        "Persyaratan dicentang petugas saat input",
        "Tanpa OTP: nomor HP dikonfirmasi langsung ke warga",
      ];
  return (
    <div className="rounded-lg border border-line bg-surface-2/60 px-3 py-2.5">
      <ChannelBadge channel={app.channel} long />
      <ul className="mt-2 space-y-1 text-sm font-normal">
        {points.map((p) => (
          <li key={p} className="flex gap-1.5">
            <CheckCircle2
              aria-hidden
              className={cn("mt-0.5 size-3.5 shrink-0", online ? "text-brand" : "text-warn")}
            />
            {p}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Masuk {formatDateTime(app.createdAt)}</p>
    </div>
  );
}

/**
 * Isi KTP-el yang akan dicetak, sebagai tabel berurutan seperti di kartu supaya mudah
 * dicocokkan baris per baris dengan dokumen asli. Tanggal lahir & jenis kelamin berasal dari NIK.
 */
function KtpData({ app }: { app: StaffApplication }) {
  const ktp = app.applicant.ktp;
  if (!ktp) return null;
  const nik = app.applicant.nikMasked ?? "";
  const rows: [string, string][] = [
    ["NIK", nik || "—"],
    ["Nama", app.applicant.name.toUpperCase()],
    ["Tempat/Tgl lahir", `${ktp.birthPlace}, ${ktp.birthDate}`],
    ["Jenis kelamin", ktp.gender],
    ["Gol. darah", ktp.bloodType],
    ["Alamat", ktp.address],
    ["RT/RW", ktp.rtRw],
    ["Kel/Desa", ktp.village],
    ["Kecamatan", ktp.district],
    ["Agama", ktp.religion],
    ["Status perkawinan", ktp.marital],
    ["Pekerjaan", ktp.job],
    ["Kewarganegaraan", "WNI"],
  ];
  return (
    <Panel
      title="Isi KTP-el"
      description="Yang akan dicetak di kartu · cocokkan dengan dokumen asli · NIK tersamar"
      flush
    >
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-t border-line first:border-t-0">
              <th scope="row" className="w-40 px-5 py-2 text-left align-top text-xs font-medium text-muted">
                {label}
              </th>
              <td
                className={cn(
                  "px-5 py-2 font-medium",
                  label === "NIK" && "font-mono tracking-wide whitespace-nowrap",
                )}
              >
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/** Jumlah catatan audit log terbaru yang langsung terlihat. */
const AUDIT_VISIBLE = 4;

function AuditList({ events }: { events: StaffApplication["events"] }) {
  return (
    <ol className="space-y-3 text-sm">
      {events.map((e, i) => (
        <li
          key={`${e.action}-${String(e.at)}-${i}`}
          className="relative pl-4 before:absolute before:top-1.5 before:left-0 before:size-1.5 before:rounded-full before:bg-line"
        >
          <span className="block font-medium">{EVENT_LABELS[e.action] ?? e.action}</span>
          <span className="block text-xs text-muted">
            {e.actorName ?? "—"}
            {e.actorRole && e.actorRole !== "sistem" && e.actorRole !== "warga"
              ? ` (${ROLE_LABELS[e.actorRole]})`
              : ""}{" "}
            · {formatDateTime(e.at)}
          </span>
          {typeof e.payload?.publicNote === "string" && (
            <span className="mt-0.5 block text-xs text-muted italic">
              &ldquo;{e.payload.publicNote}&rdquo;
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

type Props = ParamsOf<{ resi: string }> & SearchParamsOf;

async function StaffDetail({ params, searchParams }: Props) {
  const [{ resi }, query] = await Promise.all([params, searchParams]);
  const doneResi = firstParam(query.selesai) ?? "";
  const doneAction = ACTION_DONE[firstParam(query.aksi) ?? ""];
  const user = await requireStaffPage(STAFF_ROLES, `/kerja/${resi}`);
  const [app, receipt, queue] = await Promise.all([
    getStaffApplication(resi, user),
    receiptFor(resi),
    getQueue(user),
  ]);
  if (!app) notFound();

  const current = app.steps[app.currentStep];
  const next = app.status === "perlu_perbaikan" ? null : app.steps[app.currentStep + 1];
  const isOpen = app.status !== "selesai" && app.status !== "ditolak";
  // Eskalasi tertinggi yang menunggu tanggapan pimpinan, dan tanggapan terakhir untuk tahap ini.
  const awaiting = isOpen
    ? app.escalations
        .filter((e) => e.stepKey === current?.key && !e.resolvedAt && !e.response)
        .sort((a, b) => b.level - a.level)[0]
    : undefined;
  const followUp = isOpen && current ? followUpFor(app.escalations, current.key) : null;
  // Setelah aksi, panel langsung pindah ke tugas berikutnya (urutan antrean = paling mendesak).
  const nextTask = queue.items.find(
    (i) => i.mine && !WAITING_CITIZEN_STATUSES.includes(i.status) && i.resi !== app.resi,
  );
  return (
    <>
      {/* Di layar lebar konfirmasi tampil di atas antrean; di HP daftar tersembunyi, jadi di sini. */}
      <Alert tone="success" className="lg:hidden">
        {isValidResi(doneResi) && doneAction ? `${doneResi}: ${doneAction}.` : null}
      </Alert>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
        <div className="min-w-0">
          {/* Jejak: kembali ke antrean (di HP daftar antrean tersembunyi). */}
          <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
            <Link href="/kerja" className="inline-flex items-center gap-1 hover:text-text">
              <ArrowLeft aria-hidden className="size-3.5 lg:hidden" /> Antrean
            </Link>
            <span aria-hidden>/</span>
            <span className="font-mono">{app.resi}</span>
          </p>
          <h1 className="text-xl font-semibold tracking-[-0.02em]">{app.serviceName}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <ChannelBadge channel={app.channel} long />
            <span>
              {app.applicant.name} · {formatDateTime(app.createdAt)}
            </span>
          </p>
        </div>
        <StatusBadge status={app.status} late={app.isLate} />
      </header>

      {/* Container query: panel detail sempit (di samping antrean) atau lebar (HP/tablet). */}
      <div className="grid gap-5 @4xl:grid-cols-[1fr_19rem] @4xl:items-start">
        <div className="min-w-0 space-y-5">
          {user.role === "pimpinan" && awaiting && (
            <FollowUpPanel
              resi={app.resi}
              stepName={current?.name ?? awaiting.stepKey}
              target={awaiting.target}
            />
          )}
          {followUp && (
            <Callout tone="late" label="Tindak lanjut pimpinan">
              <p className="font-semibold">
                Tindak lanjut {followUp.target} · {followUp.byName}
              </p>
              <p className="text-xs text-muted">{formatDateTime(followUp.at)}</p>
              {followUp.instruction && (
                <p className="mt-2">
                  <span className="font-semibold">Arahan untuk petugas:</span> {followUp.instruction}
                </p>
              )}
              <p className="mt-1">
                <span className="font-semibold">Tanggapan ke warga:</span> {followUp.note}
              </p>
              {followUp.promisedAt && (
                <p className="mt-1">
                  <span className="font-semibold">Janji selesai:</span> {formatDateTime(followUp.promisedAt)}
                </p>
              )}
            </Callout>
          )}
          {app.status === "perlu_perbaikan" && app.fixDeadline && (
            <Callout tone="pause">
              Menunggu warga melengkapi berkas, paling lambat{" "}
              <span className="font-semibold">{formatDateTime(app.fixDeadline)}</span>. Lewat dari itu
              permohonan dibatalkan otomatis.
            </Callout>
          )}
          {app.canAct ? (
            <ActionPanel
              // Pindah permohonan/tahap = isian (centang, bukti) mulai dari kosong.
              key={`${app.resi}-${app.currentStep}`}
              resi={app.resi}
              status={app.status}
              stepName={current?.name}
              next={next ? `${next.name} (${ROLE_LABELS[next.role]})` : null}
              nextResi={nextTask?.resi ?? null}
              checklist={current?.checklist ?? []}
              evidenceLabel={current?.evidenceLabel ?? null}
            />
          ) : (
            isOpen && (
              <Callout tone={app.isLate ? "late" : "muted"}>
                Tahap &ldquo;{current?.name}&rdquo; ditangani {ROLE_LABELS[current?.role] ?? "peran lain"}.
                Anda hanya bisa melihat.
                {app.isLate && (
                  <span className="mt-1 block">
                    Tahap ini melewati tenggat dan tercatat di eskalasi. Penyelesaiannya tetap oleh{" "}
                    {ROLE_LABELS[current?.role] ?? "peran pemilik tahap"} agar timeline dan audit log jelas
                    siapa mengerjakan apa
                    {user.role === "pimpinan"
                      ? "; tanggapan & arahan Anda dicatat lewat tindak lanjut eskalasi."
                      : "; tindak lanjuti dengan menghubungi petugasnya."}
                  </span>
                )}
              </Callout>
            )
          )}

          {app.status === "ditolak" && (
            <Callout tone="late">
              <span className="font-semibold">Ditolak:</span> {app.rejectionReason}
            </Callout>
          )}

          <KtpData app={app} />

          <Panel title="Perjalanan permohonan">
            <Timeline steps={app.steps} serverNow={app.now} offsetMs={app.offsetMs} staff />
          </Panel>
        </div>

        {/* Kolom ringkas yang menempel saat timeline digulir; isi sekunder dilipat. */}
        <aside className="min-w-0 space-y-4 @4xl:sticky @4xl:top-6">
          <ReceiptCard {...receipt} title="Bukti resi untuk warga" />
          <Panel title="Pemohon">
            <dl className="grid gap-3">
              <Detail label="Nama">{app.applicant.name}</Detail>
              {app.applicant.nikMasked && (
                <Detail label="NIK (tersamar)">
                  <span className="font-mono tracking-wide">{app.applicant.nikMasked}</span>
                </Detail>
              )}
              <Detail label="Nomor HP">
                <a href={`tel:${app.applicant.phone}`} className="font-mono text-brand hover:underline">
                  {app.applicant.phone}
                </a>
              </Detail>
            </dl>
            <Disclosure summary="Lihat detail" className="mt-3 border-t border-line pt-3">
              <dl className="grid gap-3">
                {app.applicant.email && <Detail label="Email">{app.applicant.email}</Detail>}
                <Detail label="Asal data">
                  <ChannelOrigin app={app} />
                </Detail>
                <Detail label="Persyaratan dinyatakan lengkap">
                  {app.requirementsChecked.length ? (
                    <ul className="mt-1 list-inside list-disc text-sm font-normal">
                      {app.requirementsChecked.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </Detail>
              </dl>
            </Disclosure>
          </Panel>

          {app.escalations.length > 0 && (
            <Panel title="Eskalasi" flush>
              <ul className="divide-y divide-line text-sm">
                {app.escalations.map((e) => (
                  <li key={`${e.stepKey}-${e.level}`} className="px-5 py-3">
                    <span className="font-semibold">
                      Level {e.level} → {e.target}
                    </span>
                    <span className="block text-muted">
                      {formatDateTime(e.createdAt)} ·{" "}
                      {e.resolvedAt ? `selesai ${formatDateTime(e.resolvedAt)}` : "belum selesai"}
                    </span>
                    <span className={cn("mt-1 block", !e.response && !e.resolvedAt && "text-late")}>
                      {e.response
                        ? `Ditindaklanjuti ${e.response.byName}, ${formatDateTime(e.response.at)}`
                        : e.resolvedAt
                          ? "Tanpa tindak lanjut pimpinan"
                          : "Menunggu tindak lanjut pimpinan"}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Audit log" description="Tidak bisa diubah atau dihapus.">
            {/* Ringkas: catatan terbaru saja; yang lebih lama dilipat di atasnya. */}
            {app.events.length > AUDIT_VISIBLE && (
              <Disclosure
                summary={`Tampilkan ${app.events.length - AUDIT_VISIBLE} catatan sebelumnya`}
                className="mb-3"
              >
                <AuditList events={app.events.slice(0, -AUDIT_VISIBLE)} />
              </Disclosure>
            )}
            <AuditList events={app.events.slice(-AUDIT_VISIBLE)} />
          </Panel>
        </aside>
      </div>
    </>
  );
}

export default function StaffDetailPage({ params, searchParams }: Props) {
  return (
    // data-detail: penanda untuk layout dua panel (di HP, daftar antrean disembunyikan).
    <div data-detail className="@container space-y-5 p-4 sm:p-6 lg:p-8">
      <Suspense fallback={<DetailSkeleton />}>
        <StaffDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
