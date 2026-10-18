"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { postJson } from "@/lib/http";

const ACTIONS = {
  complete: {
    label: "Selesaikan tahap",
    variant: "primary",
    publicLabel: "Catatan untuk warga (opsional)",
    publicRequired: false,
    confirm: "Tandai tahap selesai",
  },
  request_fix: {
    label: "Minta perbaikan",
    variant: "secondary",
    publicLabel: "Apa yang perlu diperbaiki warga?",
    publicRequired: true,
    confirm: "Kirim permintaan perbaikan",
    hint: "Hitung mundur SLA instansi dihentikan sampai warga melengkapi.",
  },
  resume: {
    label: "Berkas sudah lengkap, lanjutkan",
    variant: "primary",
    publicLabel: null,
    confirm: "Lanjutkan proses",
    hint: "Gunakan jika warga melengkapi berkas langsung di loket.",
  },
  reject: {
    label: "Tolak",
    variant: "danger",
    publicLabel: "Alasan penolakan (dibaca warga)",
    publicRequired: true,
    confirm: "Tolak permohonan",
    hint: "Permohonan akan final dan tidak bisa dilanjutkan.",
  },
};

export default function ActionPanel({ resi, status, stepName }) {
  const router = useRouter();
  const available =
    status === "perlu_perbaikan" ? ["resume", "reject"] : ["complete", "request_fix", "reject"];
  const [action, setAction] = useState(null);
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);

  const spec = action ? ACTIONS[action] : null;

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const publicNote = String(form.get("publicNote") ?? "").trim();
    if (spec.publicRequired && !publicNote) {
      setErrors({ publicNote: "Wajib diisi, karena catatan ini dibaca warga." });
      return;
    }
    setPending(true);
    setErrors({});
    const res = await postJson(`/api/applications/${resi}/actions`, {
      action,
      publicNote: publicNote || undefined,
      internalNote: String(form.get("internalNote") ?? "").trim() || undefined,
    });
    if (!res.ok) {
      setErrors({ ...res.error.fields, form: res.error.message });
      setPending(false);
      return;
    }
    // Kembali ke antrean dengan konfirmasi: panel ini bisa hilang setelah aksi (tahap
    // pindah ke peran lain), jadi pesan sukses ditampilkan di halaman antrean.
    router.push(`/kerja?selesai=${resi}&aksi=${action}`);
  }

  return (
    <section className="rounded-card border-2 border-brand bg-surface p-5" aria-labelledby="action-title">
      <h2 id="action-title" className="text-lg font-bold">
        Tindak lanjut
      </h2>
      <p className="text-sm text-muted">
        Tahap saat ini: <span className="font-medium text-text">{stepName}</span>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {available.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={action === key}
            onClick={() => {
              setAction(action === key ? null : key);
              setErrors({});
            }}
            className={buttonClass(
              ACTIONS[key].variant,
              action === key && "ring-2 ring-brand ring-offset-2 ring-offset-surface",
            )}
          >
            {ACTIONS[key].label}
          </button>
        ))}
      </div>

      {spec && (
        <form method="post" onSubmit={submit} noValidate className="mt-5 space-y-4 border-t border-line pt-5">
          {spec.hint && <p className="text-sm text-muted">{spec.hint}</p>}
          {spec.publicLabel && (
            <div>
              <label htmlFor="publicNote" className="mb-1.5 block text-sm font-medium">
                {spec.publicLabel}
              </label>
              <textarea
                id="publicNote"
                name="publicNote"
                rows={3}
                maxLength={500}
                aria-invalid={Boolean(errors.publicNote)}
                aria-describedby={errors.publicNote ? "publicNote-error" : undefined}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 outline-none focus:border-brand aria-invalid:border-late"
              />
              {errors.publicNote && (
                <p id="publicNote-error" className="mt-1 text-sm text-late">
                  {errors.publicNote}
                </p>
              )}
            </div>
          )}
          <div>
            <label htmlFor="internalNote" className="mb-1.5 block text-sm font-medium">
              Catatan internal (hanya petugas)
            </label>
            <textarea
              id="internalNote"
              name="internalNote"
              rows={2}
              maxLength={1000}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
            />
          </div>
          <Alert>{errors.form}</Alert>
          <button type="submit" disabled={pending} className={buttonClass(spec.variant)}>
            {pending ? "Menyimpan…" : spec.confirm}
          </button>
        </form>
      )}
    </section>
  );
}
