"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert, buttonClass, Field } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { postJson } from "@/lib/http";

/** "2026-12-25" → tanggal WIB (siang hari, supaya zona waktu tidak menggeser harinya). */
const asDate = (day: string) => new Date(`${day}T12:00:00+07:00`);

/** Daftar hari libur: tambah/hapus langsung tersimpan. */
/** `today` = tanggal WIB jam sistem (YYYY-MM-DD), dari server. */
export default function HolidayEditor({ holidays, today }: { holidays: string[]; today: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(next: string[]) {
    setPending(true);
    setError(null);
    const res = await postJson("/api/admin/holidays", { holidays: next });
    setPending(false);
    if (!res.ok) {
      setError(Object.values(res.error.fields)[0] ?? res.error.message);
      return false;
    }
    router.refresh();
    return true;
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const day = String(new FormData(form).get("day") ?? "");
    if (!day) return setError("Pilih tanggal.");
    if (holidays.includes(day)) return setError("Tanggal ini sudah ada.");
    if (await save([...holidays, day])) form.reset();
  }

  const upcoming = holidays.filter((d) => d >= today);
  const past = holidays.length - upcoming.length;

  return (
    <div className="space-y-4">
      <form method="post" onSubmit={add} noValidate className="flex flex-wrap items-end gap-2">
        <Field label="Tanggal libur" name="day" type="date" required className="w-52" />
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          <Plus aria-hidden className="size-4" /> Tambah
        </button>
      </form>
      <Alert>{error}</Alert>

      {upcoming.length ? (
        <ul className="flex flex-wrap gap-2">
          {upcoming.map((day) => (
            <li
              key={day}
              className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 py-1 pr-1 pl-3 text-sm"
            >
              <time dateTime={day}>{formatDate(asDate(day))}</time>
              <button
                type="button"
                disabled={pending}
                onClick={() => save(holidays.filter((d) => d !== day))}
                aria-label={`Hapus ${formatDate(asDate(day))}`}
                className="grid size-7 place-items-center rounded-lg text-muted hover:bg-surface hover:text-late"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Belum ada hari libur mendatang.</p>
      )}
      {past > 0 && (
        <p className="text-xs text-muted">
          {past} tanggal yang sudah lewat tetap disimpan untuk riwayat SLA.
        </p>
      )}
    </div>
  );
}
