import { Panel } from "@/components/ui";
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
    <Panel title={title} description="Catatan ini tidak bisa diubah atau dihapus.">
      {events.length ? (
        <ol className="space-y-3 text-sm">
          {events.map((e) => (
            <li
              key={e.id}
              className="relative pl-4 before:absolute before:top-1.5 before:left-0 before:size-1.5 before:rounded-full before:bg-line"
            >
              <span className="font-semibold">{ADMIN_EVENT_LABELS[e.action] ?? e.action}</span>
              <span className="text-muted"> · {e.target}</span>
              <span className="block text-xs text-muted">
                {e.actorName} · {formatDateTime(e.at)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">Belum ada perubahan tercatat.</p>
      )}
    </Panel>
  );
}
