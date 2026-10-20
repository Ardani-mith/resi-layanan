"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useNow } from "@/hooks/useNow";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration } from "@/lib/format";

const REFRESH_MS = 30_000;

/** Status hitung mundur sebuah baris pada waktu `now` (dihitung ulang di browser). */
function urgency(item, now) {
  if (item.status === "perlu_perbaikan") return { tone: "pause", text: "Menunggu warga" };
  if (!item.dueAt) return { tone: "muted", text: "Tanpa tenggat" };
  const left = new Date(item.dueAt).getTime() - now;
  if (left < 0) return { tone: "late", text: `Lewat ${formatDuration(left)}` };
  if (left < 4 * 3_600_000) return { tone: "warn", text: `Sisa ${formatDuration(left)}` };
  return { tone: "run", text: `Sisa ${formatDuration(left)}` };
}

const TONE = {
  late: "bg-late-soft text-late",
  warn: "bg-warn-soft text-warn",
  run: "bg-run-soft text-run",
  pause: "bg-pause-soft text-pause",
  muted: "bg-surface-2 text-muted",
};

function Row({ item, now }) {
  const u = urgency(item, now);
  return (
    <li>
      <Link
        href={`/kerja/${item.resi}`}
        className="grid gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-2 md:grid-cols-[10rem_1fr_1fr_auto] md:items-center"
      >
        <span className={cn("w-fit rounded-lg px-2 py-1 text-xs font-semibold", TONE[u.tone])}>{u.text}</span>
        <span className="min-w-0">
          <span className="block font-mono text-sm tracking-wide">{item.resi}</span>
          <span className="block truncate text-sm text-muted">{item.serviceName}</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{item.applicantName}</span>
          <span className="block truncate text-sm text-muted">
            {item.stepName} · {item.channel === "loket" ? "Loket" : "Online"}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2 text-xs text-muted md:justify-end">
          {item.escalationLevel > 0 && (
            <span className="rounded-full bg-late px-2 py-0.5 font-semibold text-surface">
              Eskalasi {item.escalationLevel === 2 ? "Kabid" : "Kasi"}
            </span>
          )}
          {item.dueAt && <span className="hidden lg:inline">Tenggat {formatDateTime(item.dueAt)}</span>}
        </span>
      </Link>
    </li>
  );
}

export default function QueueBoard({ items, counts, role, now: serverNow, offsetMs }) {
  const seesAll = role === "pimpinan" || role === "admin";
  const tabs = [
    {
      key: "mine",
      label: "Tugas saya",
      count: counts.mine,
      match: (i) => i.mine && i.status !== "perlu_perbaikan",
    },
    { key: "late", label: "Terlambat", count: counts.overdue, match: (i) => i.stepState === "terlambat" },
    {
      key: "fix",
      label: "Menunggu perbaikan",
      count: counts.waitingFix,
      match: (i) => i.status === "perlu_perbaikan",
    },
    ...(seesAll ? [{ key: "all", label: "Semua", count: counts.total, match: () => true }] : []),
  ];

  const [tab, setTab] = useState("mine");
  const [query, setQuery] = useState("");
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

  return (
    <section className="rounded-card border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line p-3 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Filter antrean" className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={t.key === active.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
                t.key === active.key ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2",
              )}
            >
              {t.label} <span className="ml-1 tabular-nums opacity-80">{t.count}</span>
            </button>
          ))}
        </div>
        <label className="md:w-64">
          <span className="sr-only">Cari resi atau nama pemohon</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari resi atau nama…"
            className="min-h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-brand"
          />
        </label>
      </div>

      {visible.length ? (
        <ul className="divide-y divide-line">
          {visible.map((item) => (
            <Row key={item.resi} item={item} now={now} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-12 text-center text-muted">
          {deferredQuery ? "Tidak ada yang cocok dengan pencarian." : "Tidak ada permohonan di daftar ini."}
        </p>
      )}
    </section>
  );
}
