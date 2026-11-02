// Kerangka loading area petugas yang meniru bentuk halaman tujuan (antrean, detail berkas,
// dashboard, halaman umum). Kilauan tiap blok diberi jeda bertahap sehingga tampak bergelombang;
// di atasnya lapisan kaca interaktif (LoadingFrame → LoadingGlass) dengan kartu status.

import { LoadingFrame, Skeleton } from "@/components/ui";

/** Jeda kilauan untuk blok ke-i (gelombang dari atas ke bawah). */
const wave = (i: number) => i * 90;

/** Daftar antrean: kepala, kolom saring, tab, lalu baris-baris berkas. */
export function QueueSkeleton() {
  return (
    <LoadingFrame label="Memuat antrean…" glassPosition="top-56 left-1/2 -translate-x-1/2" className="pb-6">
      <div className="space-y-3 border-b border-line bg-surface p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-44" delay={wave(1)} />
        <Skeleton className="h-8" delay={wave(2)} />
        <div className="flex gap-4">
          {["w-16", "w-20", "w-24"].map((w, i) => (
            <Skeleton key={w} className={`h-4 ${w}`} delay={wave(3 + i)} />
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="space-y-2 px-4 py-3.5">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-36" delay={wave(i + 2)} />
              <Skeleton className="h-3.5 w-24" delay={wave(i + 3)} />
            </div>
            <Skeleton className="h-3 w-56" delay={wave(i + 3)} />
            <Skeleton className="h-4 w-40" delay={wave(i + 4)} />
          </li>
        ))}
      </ul>
    </LoadingFrame>
  );
}

/** Detail berkas: jejak & judul, panel aksi, timeline; kolom ringkas di kanan (layar lebar). */
export function DetailSkeleton() {
  return (
    <LoadingFrame
      label="Memuat permohonan…"
      glassPosition="top-64 left-1/2 -translate-x-1/2"
      className="@container space-y-5"
    >
      <div className="space-y-2 border-b border-line pb-5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-6 w-64" delay={wave(1)} />
        <Skeleton className="h-4 w-80 max-w-full" delay={wave(2)} />
      </div>
      <div className="grid gap-5 @4xl:grid-cols-[1fr_18rem]">
        <div className="space-y-5">
          <Skeleton className="h-32" delay={wave(3)} />
          <div className="space-y-4 rounded-card border border-line bg-surface p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-4 shrink-0 rounded-full" delay={wave(i + 4)} />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" delay={wave(i + 4)} />
                  <Skeleton className="h-3 w-64 max-w-full" delay={wave(i + 5)} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <Skeleton className="h-24" delay={wave(4)} />
          <Skeleton className="h-44" delay={wave(5)} />
        </div>
      </div>
    </LoadingFrame>
  );
}

/** Dashboard pimpinan: kepala, strip 5 angka, tabel eskalasi. */
export function DashboardSkeleton() {
  return (
    <LoadingFrame
      label="Memuat dashboard…"
      glassPosition="top-52 left-1/2 -translate-x-1/2"
      className="space-y-6"
    >
      <div className="space-y-2 border-b border-line pb-5">
        <Skeleton className="h-6 w-60" />
        <Skeleton className="h-4 w-96 max-w-full" delay={wave(1)} />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-3 bg-surface p-4 last:col-span-2 lg:last:col-span-1">
            <Skeleton className="h-3 w-24" delay={wave(i + 2)} />
            <Skeleton className="h-7 w-16" delay={wave(i + 2)} />
            <Skeleton className="h-3 w-32 max-w-full" delay={wave(i + 3)} />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="space-y-2 border-b border-line px-5 py-3.5">
          <Skeleton className="h-4 w-40" delay={wave(3)} />
          <Skeleton className="h-3 w-80 max-w-full" delay={wave(4)} />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-line px-5 py-3 last:border-0">
            <Skeleton className="h-3.5 w-24" delay={wave(i + 4)} />
            <Skeleton className="h-3.5 flex-1" delay={wave(i + 5)} />
            <Skeleton className="hidden h-3.5 w-28 sm:block" delay={wave(i + 5)} />
            <Skeleton className="h-3.5 w-16" delay={wave(i + 6)} />
          </div>
        ))}
      </div>
    </LoadingFrame>
  );
}

/** Halaman umum petugas (admin, akun): kepala halaman lalu panel. */
export function PageSkeleton() {
  return (
    <LoadingFrame
      label="Memuat halaman…"
      glassPosition="top-48 left-1/2 -translate-x-1/2"
      className="space-y-6"
    >
      <div className="space-y-2 border-b border-line pb-5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" delay={wave(1)} />
      </div>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="border-b border-line px-5 py-3.5">
          <Skeleton className="h-4 w-36" delay={wave(2)} />
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" delay={wave(i + 3)} />
              <Skeleton className="h-10" delay={wave(i + 3)} />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-56" delay={wave(5)} />
    </LoadingFrame>
  );
}
