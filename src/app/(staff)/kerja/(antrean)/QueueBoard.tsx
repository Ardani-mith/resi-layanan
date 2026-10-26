"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { ChannelBadge } from "@/components/application/Badges";
import { Alert, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Queue } from "@/lib/dal";
import { formatDuration } from "@/lib/format";
import { useAutoRefresh, useNow } from "@/lib/hooks";
import { isValidResi } from "@/lib/resi";
import { ROLE_LABELS } from "@/lib/roles";
import { ACTION_DONE } from "@/lib/workflow";

type Item = Queue["items"][number];

const REFRESH_MS = 30_000;

/** Status hitung mundur sebuah baris pada waktu `now` (dihitung ulang di browser). */
function urgency(item: Item, now: number): { tone: keyof typeof TONE; text: string } {
  if (item.status === "perlu_perbaikan") return { tone: "pause", text: "Menunggu warga" };
  if (item.status === "menunggu_kedatangan") return { tone: "muted", text: "Belum datang" };
  if (!item.dueAt) return { tone: "muted", text: "Tanpa tenggat" };
  const left = new Date(item.dueAt).getTime() - now;
  if (left < 0) return { tone: "late", text: `Lewat ${formatDuration(left)}` };
  if (left < 2 * 3_600_000) return { tone: "warn", text: `Sisa ${formatDuration(left)}` };
  return { tone: "run", text: `Sisa ${formatDuration(left)}` };
}

const TONE = {
  late: "bg-late-soft text-late",
  warn: "bg-warn-soft text-warn",
  run: "bg-run-soft text-run",
  pause: "bg-pause-soft text-pause",
  muted: "bg-surface-2 text-muted",
};

function Row({ item, now, selected }: { item: Item; now: number; selected: boolean }) {
  const u = urgency(item, now);
  return (
    <li>
      <Link
        href={`/kerja/${item.resi}`}
        aria-current={selected ? "page" : undefined}
        className={cn(
          "relative block px-4 py-3 transition-colors hover:bg-surface-2",
          selected && "bg-brand-soft hover:bg-brand-soft",
        )}
      >
        {selected && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-brand" />}
        <span className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs tracking-wide text-muted">{item.resi}</span>
          <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", TONE[u.tone])}>
            {u.text}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className="min-w-0 truncate font-semibold">{item.applicantName}</span>
          <ChannelBadge channel={item.channel} className="shrink-0" />
        </span>
        <span className="block truncate text-sm text-muted">
          {item.serviceName} · {item.stepName}
        </span>
        {(item.escalationLevel > 0 || (!item.mine && item.stepRole)) && (
          <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            {item.escalationLevel > 0 && (
              <span className="rounded-full bg-late px-2 py-0.5 text-surface">
                Eskalasi {item.escalationLevel === 2 ? "Kabid" : "Kasi"}
              </span>
            )}
            {/* Bukan tugas peran ini (pimpinan/admin melihat semua): hanya dipantau. */}
            {!item.mine && item.stepRole && (
              <span className="rounded-full border border-line px-2 py-0.5 text-muted">
                Dipantau · {ROLE_LABELS[item.stepRole]}
              </span>
            )}
          </span>
        )}
      </Link>
    </li>
  );
}

export default function QueueBoard(queue: Queue) {
  const params = useSearchParams();
  // Pencarian dari top bar (?cari=) mengisi kolom cari; ganti nilai = isian di-reset.
  const initial = params.get("cari") ?? "";
  return <Board key={initial} queue={queue} initialQuery={initial} done={doneMessage(params)} />;
}

function doneMessage(params: { get(name: string): string | null }): string | null {
  const resi = params.get("selesai") ?? "";
  const action = params.get("aksi") ?? "";
  return isValidResi(resi) && ACTION_DONE[action] ? `${resi}: ${ACTION_DONE[action]}.` : null;
}

function Board({ queue, initialQuery, done }: { queue: Queue; initialQuery: string; done: string | null }) {
  const { items, counts, role, now: serverNow, offsetMs } = queue;
  const seesAll = role === "pimpinan" || role === "admin";
  const tabs: { key: string; label: string; count: number; match: (i: Item) => boolean }[] = [
    {
      key: "mine",
      label: "Tugas saya",
      count: counts.mine,
      match: (i) => i.mine && i.status !== "perlu_perbaikan" && i.status !== "menunggu_kedatangan",
    },
    { key: "late", label: "Terlambat", count: counts.overdue, match: (i) => i.stepState === "terlambat" },
    // Daftar online layanan wajib hadir: dicari saat warga datang ke loket (tenggat belum berjalan).
    {
      key: "arrival",
      label: "Menunggu datang",
      count: counts.waitingArrival,
      match: (i) => i.status === "menunggu_kedatangan",
    },
    {
      key: "fix",
      label: "Perbaikan",
      count: counts.waitingFix,
      match: (i) => i.status === "perlu_perbaikan",
    },
    ...(seesAll ? [{ key: "all", label: "Semua", count: counts.total, match: () => true }] : []),
  ];

  const selected = usePathname().split("/")[2];
  // Tab awal: yang memuat permohonan yang sedang dibuka (mis. lewat ⌘K atau tautan), supaya
  // barisnya terlihat; ada kata kunci dari top bar → semua yang boleh dilihat.
  const [tab, setTab] = useState(() => {
    if (initialQuery) return seesAll ? "all" : "mine";
    const open = items.find((i) => i.resi === selected);
    return (open && tabs.find((t) => t.match(open))?.key) ?? "mine";
  });
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const now = useNow(serverNow, offsetMs);
  useAutoRefresh(REFRESH_MS);

  const active = tabs.find((t) => t.key === tab) ?? tabs[0];
  const visible = items.filter(
    (i) =>
      active.match(i) &&
      (!deferredQuery ||
        i.resi.toLowerCase().includes(deferredQuery) ||
        i.applicantName.toLowerCase().includes(deferredQuery)),
  );
  const canInput = role === "petugas_loket" || role === "admin";

  return (
    <section aria-labelledby="queue-title">
      <div className="sticky top-0 z-10 space-y-3 border-b border-line bg-surface px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 id="queue-title" className="text-lg font-bold tracking-tight">
              Antrean
            </h1>
            <p className="text-xs text-muted">{ROLE_LABELS[role]} · paling mendesak di atas</p>
          </div>
          {canInput && (
            <Link href="/kerja/baru" className={buttonClass("primary", "min-h-9 px-3")}>
              <Plus aria-hidden className="size-4" />
              Input loket
            </Link>
          )}
        </div>
        <Alert tone="success">{done}</Alert>
        <div role="group" aria-label="Filter antrean" className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={t.key === active.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap",
                t.key === active.key ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2",
              )}
            >
              {t.label} <span className="ml-0.5 tabular-nums opacity-80">{t.count}</span>
            </button>
          ))}
        </div>
        <label className="block">
          <span className="sr-only">Saring antrean</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Saring resi atau nama…"
            className="min-h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm outline-none focus:border-brand focus:bg-surface"
          />
        </label>
      </div>

      {visible.length ? (
        <ul className="divide-y divide-line bg-surface">
          {visible.map((item) => (
            <Row key={item.resi} item={item} now={now} selected={item.resi === selected} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-12 text-center text-sm text-muted">
          {deferredQuery ? "Tidak ada yang cocok dengan pencarian." : "Tidak ada permohonan di daftar ini."}
        </p>
      )}
    </section>
  );
}
