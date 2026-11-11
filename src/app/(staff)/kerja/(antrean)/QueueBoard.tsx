"use client";

import { ArrowUpRight, Flag, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { ChannelBadge } from "@/components/application/Badges";
import { Alert, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Queue } from "@/lib/dal";
import { formatDayMonth, formatDuration } from "@/lib/format";
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

/** Warna teks & titik hitung mundur. Hanya yang terlambat/hampir yang berwarna kuat. */
const TONE = {
  late: { text: "text-late", dot: "bg-late" },
  warn: { text: "text-warn", dot: "bg-warn" },
  run: { text: "text-muted", dot: "bg-run" },
  pause: { text: "text-pause", dot: "bg-pause" },
  muted: { text: "text-muted", dot: "bg-line" },
};

function Row({ item, now, selected }: { item: Item; now: number; selected: boolean }) {
  const u = urgency(item, now);
  const tone = TONE[u.tone];
  return (
    <li>
      <Link
        href={`/kerja/${item.resi}`}
        aria-current={selected ? "page" : undefined}
        className={cn(
          "relative block px-4 py-3 transition-colors hover:bg-surface-2/70",
          selected && "bg-brand-soft/70 hover:bg-brand-soft/70",
        )}
      >
        {/* Garis kiri: biru = sedang dibuka, merah = terlambat. */}
        {(selected || u.tone === "late") && (
          <span
            aria-hidden
            className={cn("absolute inset-y-2 left-0 w-0.5 rounded-r", selected ? "bg-brand" : "bg-late")}
          />
        )}
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-semibold">{item.applicantName}</span>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 font-mono text-xs font-medium tabular-nums",
              tone.text,
            )}
          >
            <span aria-hidden className={cn("size-1.5 rounded-full", tone.dot)} />
            {u.text}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">
          {item.serviceName} · {item.stepName}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 font-mono text-xs text-muted">{item.resi}</span>
          <ChannelBadge channel={item.channel} />
          {item.escalationLevel > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-md border border-late/30 px-1.5 py-px text-xs font-medium text-late">
              <ArrowUpRight aria-hidden className="size-3" />
              {item.escalationLevel === 2 ? "Kepala Bidang" : "Kepala Seksi"}
            </span>
          )}
          {/* Warga menandai keperluan mendesak (sinyal, bukan urutan otomatis). */}
          {item.urgentNeededBy && (
            <span className="inline-flex items-center gap-1 rounded-md border border-warn/40 px-1.5 py-px text-xs font-medium text-warn">
              <Flag aria-hidden className="size-3" />
              Mendesak · {formatDayMonth(item.urgentNeededBy)}
            </span>
          )}
          {/* Bukan tugas peran ini (pimpinan/admin melihat semua): hanya dipantau. */}
          {!item.mine && item.stepRole && (
            <span className="rounded-md border border-dashed border-line px-1.5 py-px text-xs text-muted">
              Dipantau · {ROLE_LABELS[item.stepRole]}
            </span>
          )}
        </span>
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
      label: "Belum datang",
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

  // Penanda tab yang masih bisa digeser ke kiri/kanan.
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabFade, setTabFade] = useState({ left: false, right: false });
  const updateTabFade = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setTabFade((f) => (f.left === left && f.right === right ? f : { left, right }));
  }, []);
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    updateTabFade();
    const observer = new ResizeObserver(updateTabFade);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateTabFade]);

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
      <div className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <div>
            <h1 id="queue-title" className="text-base font-semibold tracking-[-0.01em]">
              Antrean
            </h1>
            <p className="text-xs text-muted">{ROLE_LABELS[role]} · paling mendesak di atas</p>
          </div>
          {canInput && (
            <Link href="/kerja/baru" className={buttonClass("primary", "min-h-8 gap-1.5 px-2.5 text-[13px]")}>
              <Plus aria-hidden className="size-4" />
              Input loket
            </Link>
          )}
        </div>
        <Alert tone="success" className="mx-4 mt-3">
          {done}
        </Alert>
        <label className="relative mx-4 mt-3 block">
          <span className="sr-only">Saring antrean</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Saring resi atau nama…"
            className="h-8 w-full rounded-md border border-line bg-surface-2 pr-3 pl-8 text-sm outline-none placeholder:text-muted focus:border-brand focus:bg-surface"
          />
        </label>
        {/* Filter sebagai tab bergaris bawah, jumlah di kapsul kecil. Bila tidak muat (mis. pimpinan,
            5 tab), tepi yang masih bisa digeser memudar sebagai penanda, bukan terpotong tajam. */}
        <div
          ref={tabsRef}
          role="group"
          aria-label="Filter antrean"
          onScroll={updateTabFade}
          className={cn(
            "mt-2 flex [scrollbar-width:none] gap-2.5 overflow-x-auto pr-2 pl-4 [&::-webkit-scrollbar]:hidden",
            tabFade.left && tabFade.right
              ? "mask-x-from-90% mask-x-to-100%"
              : tabFade.right
                ? "mask-r-from-85% mask-r-to-100%"
                : tabFade.left && "mask-l-from-85% mask-l-to-100%",
          )}
        >
          {tabs.map((t) => {
            const on = t.key === active.key;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={on}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                  on ? "text-text" : "text-muted hover:text-text",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded px-1 text-xs tabular-nums",
                    on ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted",
                  )}
                >
                  {t.count}
                </span>
                {on && (
                  <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </div>
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
