import { ADMIN_EVENT_LABELS } from "@/lib/admin";
import type { getAdminEvents } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";

/** Riwayat tindakan admin (audit log, tidak bisa diubah), dipakai halaman-halaman admin. */
export default function AdminLog({
  events,
  title = "Riwayat perubahan",
}: {
  events: Awaited<ReturnType<typeof getAdminEvents>>;
  title?: string;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-5" aria-labelledby="riwayat-admin">
      <h2 id="riwayat-admin" className="text-lg font-bold">
        {title}
      </h2>
      {events.length ? (
        <ol className="mt-3 space-y-3 border-l-2 border-line pl-4 text-sm">
          {events.map((e) => (
            <li key={e.id}>
              <span className="font-semibold">{ADMIN_EVENT_LABELS[e.action] ?? e.action}</span>
              <span className="text-muted"> · {e.target}</span>
              <span className="block text-xs text-muted">
                {e.actorName} · {formatDateTime(e.at)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-muted">Belum ada perubahan tercatat.</p>
      )}
      <p className="mt-3 text-xs text-muted">Catatan ini tidak bisa diubah atau dihapus.</p>
    </section>
  );
}
