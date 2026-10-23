import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import ReceiptCard from "@/components/application/ReceiptCard";
import StatusBadge from "@/components/application/StatusBadge";
import Timeline from "@/components/application/Timeline";
import { Alert, Skeleton } from "@/components/ui";
import { firstParam, type ParamsOf, type SearchParamsOf } from "@/lib/api";
import { cn } from "@/lib/cn";
import { getQueue, getStaffApplication, requireStaffPage } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { receiptFor } from "@/lib/qr";
import { isValidResi } from "@/lib/resi";
import { ROLE_LABELS, STAFF_ROLES } from "@/lib/roles";
import { ACTION_DONE, EVENT_LABELS } from "@/lib/workflow";
import ActionPanel from "./ActionPanel";

export const metadata = { title: "Detail permohonan" };

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
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
  // Setelah aksi, panel langsung pindah ke tugas berikutnya (urutan antrean = paling mendesak).
  const nextTask = queue.items.find((i) => i.mine && i.status !== "perlu_perbaikan" && i.resi !== app.resi);
  return (
    <>
      {/* Di layar lebar konfirmasi tampil di atas antrean; di HP daftar tersembunyi, jadi di sini. */}
      <Alert tone="success" className="lg:hidden">
        {isValidResi(doneResi) && doneAction ? `${doneResi}: ${doneAction}.` : null}
      </Alert>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/kerja"
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline lg:hidden"
          >
            <ArrowLeft aria-hidden className="size-4" /> Antrean
          </Link>
          <p className="font-mono text-sm tracking-wider text-muted">{app.resi}</p>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{app.serviceName}</h1>
          <p className="text-sm text-muted">
            {app.applicant.name} · {app.channel === "loket" ? "Loket" : "Online"} ·{" "}
            {formatDateTime(app.createdAt)}
          </p>
        </div>
        <StatusBadge status={app.status} late={app.isLate} size="lg" />
      </header>

      {/* Container query: panel detail sempit (di samping antrean) atau lebar (HP/tablet). */}
      <div className="grid gap-5 @4xl:grid-cols-[1fr_20rem] @4xl:items-start">
        <div className="min-w-0 space-y-5">
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
            app.status !== "selesai" &&
            app.status !== "ditolak" && (
              <p
                className={cn(
                  "rounded-card px-4 py-3 text-sm",
                  app.isLate ? "border-l-4 border-late bg-late-soft" : "bg-surface-2 text-muted",
                )}
              >
                Tahap &ldquo;{current?.name}&rdquo; ditangani {ROLE_LABELS[current?.role] ?? "peran lain"}.
                Anda hanya bisa melihat.
                {app.isLate && (
                  <span className="mt-1 block">
                    Tahap ini melewati tenggat dan tercatat di eskalasi. Penyelesaiannya tetap oleh{" "}
                    {ROLE_LABELS[current?.role] ?? "peran pemilik tahap"} agar timeline dan audit log jelas
                    siapa mengerjakan apa; tindak lanjuti dengan menghubungi petugasnya.
                  </span>
                )}
              </p>
            )
          )}

          {app.status === "ditolak" && (
            <p className="rounded-card border-l-4 border-late bg-late-soft p-4 text-sm">
              <span className="font-semibold">Ditolak:</span> {app.rejectionReason}
            </p>
          )}

          <Card title="Perjalanan permohonan">
            <Timeline steps={app.steps} serverNow={app.now} offsetMs={app.offsetMs} staff />
          </Card>
        </div>

        <aside className="min-w-0 space-y-5">
          <ReceiptCard {...receipt} title="Bukti resi untuk warga" />
          <Card title="Pemohon">
            <dl className="grid gap-3">
              <Detail label="Nama">{app.applicant.name}</Detail>
              <Detail label="Nomor HP">
                <a href={`tel:${app.applicant.phone}`} className="font-mono text-brand hover:underline">
                  {app.applicant.phone}
                </a>
              </Detail>
              {app.applicant.email && <Detail label="Email">{app.applicant.email}</Detail>}
              {app.applicant.ktp && (
                <Detail label="Data KTP-el">
                  <span className="mt-1 block space-y-0.5 text-sm font-normal">
                    <span className="block">
                      {app.applicant.ktp.birthPlace}, {app.applicant.ktp.birthDate} ·{" "}
                      {app.applicant.ktp.gender} · Gol. darah {app.applicant.ktp.bloodType}
                    </span>
                    <span className="block">
                      {app.applicant.ktp.address}, RT/RW {app.applicant.ktp.rtRw}, {app.applicant.ktp.village}
                      , {app.applicant.ktp.district}
                    </span>
                    <span className="block">
                      {app.applicant.ktp.religion} · {app.applicant.ktp.marital} · {app.applicant.ktp.job}
                    </span>
                  </span>
                </Detail>
              )}
              <Detail label="Kanal">
                {app.channel === "loket" ? "Loket" : "Online"} · {formatDateTime(app.createdAt)}
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
          </Card>

          {app.escalations.length > 0 && (
            <Card title="Eskalasi">
              <ul className="space-y-2 text-sm">
                {app.escalations.map((e) => (
                  <li key={`${e.stepKey}-${e.level}`} className="rounded-xl bg-surface-2 px-3 py-2">
                    <span className="font-semibold">
                      Level {e.level} → {e.target}
                    </span>
                    <span className="block text-muted">
                      {formatDateTime(e.createdAt)} ·{" "}
                      {e.resolvedAt ? `selesai ${formatDateTime(e.resolvedAt)}` : "belum selesai"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Audit log">
            <ol className="space-y-3 text-sm">
              {app.events.map((e, i) => (
                <li key={i} className="border-l-2 border-line pl-3">
                  <span className="block font-medium">{EVENT_LABELS[e.action] ?? e.action}</span>
                  <span className="block text-muted">
                    {e.actorName ?? "—"}
                    {e.actorRole && e.actorRole !== "sistem" && e.actorRole !== "warga"
                      ? ` (${ROLE_LABELS[e.actorRole]})`
                      : ""}{" "}
                    · {formatDateTime(e.at)}
                  </span>
                  {typeof e.payload?.publicNote === "string" && (
                    <span className="mt-0.5 block text-muted italic">
                      &ldquo;{e.payload.publicNote}&rdquo;
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted">Catatan ini tidak bisa diubah atau dihapus.</p>
          </Card>
        </aside>
      </div>
    </>
  );
}

export default function StaffDetailPage({ params, searchParams }: Props) {
  return (
    // data-detail: penanda untuk layout dua panel (di HP, daftar antrean disembunyikan).
    <div data-detail className="@container space-y-5 p-4 sm:p-6">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <StaffDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
