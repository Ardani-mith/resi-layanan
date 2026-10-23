import { Inbox } from "lucide-react";

export const metadata = { title: "Antrean petugas" };

/** Panel kanan saat belum ada permohonan dipilih (hanya tampil di layar lebar). */
export default function QueueEmptyPage() {
  return (
    <div className="grid h-full min-h-96 place-items-center p-8 text-center">
      <div className="max-w-xs">
        <span
          aria-hidden
          className="mx-auto grid size-14 place-items-center rounded-2xl bg-surface text-muted"
        >
          <Inbox className="size-7" />
        </span>
        <h1 className="mt-4 text-lg font-bold">Pilih permohonan</h1>
        <p className="mt-1 text-sm text-muted">
          Detail, tindak lanjut, dan timeline tampil di sini. Paling mendesak ada di urutan teratas antrean.
        </p>
        <p className="mt-4 text-xs text-muted">
          Tekan <kbd className="rounded border border-line bg-surface px-1.5 font-sans">⌘K</kbd> untuk cari
          resi.
        </p>
      </div>
    </div>
  );
}
