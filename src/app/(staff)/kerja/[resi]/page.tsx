import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import StatusBadge from "@/components/application/StatusBadge";
import Timeline from "@/components/application/Timeline";
import { DemoClockBanner, Skeleton } from "@/components/ui";
import type { ParamsOf } from "@/lib/api";
import { getStaffApplication, requireStaffPage } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS, STAFF_ROLES } from "@/lib/roles";
import { EVENT_LABELS } from "@/lib/workflow";
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

async function StaffDetail({ params }: ParamsOf<{ resi: string }>) {
  const { resi } = await params;
  const user = await requireStaffPage(STAFF_ROLES, `/kerja/${resi}`);
  const app = await getStaffApplication(resi, user);
  if (!app) notFound();

  const current = app.steps[app.currentStep];
  return (
    <>
      <DemoClockBanner offsetMs={app.offsetMs} />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/kerja"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            <ArrowLeft aria-hidden className="size-4" /> Antrean
          </Link>
          <p className="mt-2 font-mono text-sm tracking-wider text-muted">{app.resi}</p>
          <h1 className="text-2xl font-bold tracking-tight">{app.serviceName}</h1>
        </div>
        <StatusBadge status={app.status} late={app.isLate} size="lg" />
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-5">
          {app.canAct ? (
            <ActionPanel resi={app.resi} status={app.status} stepName={current?.name} />
          ) : (
            app.status !== "selesai" &&
            app.status !== "ditolak" && (
              <p className="rounded-card bg-surface-2 px-4 py-3 text-sm text-muted">
                Tahap &ldquo;{current?.name}&rdquo; ditangani {ROLE_LABELS[current?.role] ?? "peran lain"}.
                Anda hanya bisa melihat.
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

        <aside className="space-y-5">
          <Card title="Pemohon">
            <dl className="grid gap-3">
              <Detail label="Nama">{app.applicant.name}</Detail>
              <Detail label="Nomor HP">
                <a href={`tel:${app.applicant.phone}`} className="font-mono text-brand hover:underline">
                  {app.applicant.phone}
                </a>
              </Detail>
              {app.applicant.email && <Detail label="Email">{app.applicant.email}</Detail>}
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

export default function StaffDetailPage({ params }: ParamsOf<{ resi: string }>) {
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <Suspense fallback={<Skeleton />}>
        <StaffDetail params={params} />
      </Suspense>
    </div>
  );
}
