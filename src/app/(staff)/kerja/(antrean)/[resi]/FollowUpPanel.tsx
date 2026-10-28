"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert, buttonClass, Field } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatWorkHours } from "@/lib/format";
import { useResetOnHide } from "@/lib/hooks";
import { type FormErrors, formErrors, postJson } from "@/lib/http";
import { FOLLOW_UP_PROMISE_HOURS } from "@/lib/workflow";

/**
 * Pimpinan menanggapi eskalasi: tanggapan tampil di halaman lacak warga, arahan tampil untuk
 * petugas pemilik tahap. Tahapnya tetap diselesaikan petugas itu (pemisahan tugas).
 */
export default function FollowUpPanel({
  resi,
  stepName,
  target,
}: {
  resi: string;
  stepName: string;
  /** Jabatan tujuan eskalasi tertinggi yang belum ditanggapi, mis. "Kepala Bidang". */
  target: string;
}) {
  const router = useRouter();
  const [promiseHours, setPromiseHours] = useState<number | null>(FOLLOW_UP_PROMISE_HOURS[1]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  useResetOnHide(() => setPending(false));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setErrors({});
    const res = await postJson(`/api/applications/${resi}/escalation`, {
      publicNote: String(form.get("publicNote") ?? "").trim(),
      internalNote: String(form.get("internalNote") ?? "").trim() || undefined,
      promiseHours: promiseHours ?? undefined,
    });
    if (!res.ok) {
      setErrors(formErrors(res.error));
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-card border-2 border-late bg-surface p-5" aria-labelledby="follow-up-title">
      <h2 id="follow-up-title" className="text-lg font-bold">
        Tindak lanjuti eskalasi
      </h2>
      <p className="text-sm text-muted">
        Tahap <span className="font-medium text-text">{stepName}</span> melewati tenggat dan diteruskan ke{" "}
        {target}. Tanggapan Anda tampil di halaman lacak warga; tahapnya tetap diselesaikan petugasnya.
      </p>

      <form method="post" onSubmit={submit} noValidate className="mt-4 space-y-4">
        <Field
          as="textarea"
          name="publicNote"
          label="Tanggapan untuk warga"
          maxLength={500}
          hint="Dibaca warga, tanpa nama Anda. Mis. penyebab keterlambatan dan langkah yang diambil."
          error={errors.publicNote}
        />
        <Field
          as="textarea"
          name="internalNote"
          label="Arahan untuk petugas (opsional)"
          maxLength={1000}
          hint="Hanya terlihat petugas, tampil di atas panel tindak lanjut mereka."
          error={errors.internalNote}
        />
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Janji selesai kepada warga</legend>
          <div className="flex flex-wrap gap-2">
            {[null, ...FOLLOW_UP_PROMISE_HOURS].map((hours) => (
              <button
                key={hours ?? "none"}
                type="button"
                aria-pressed={promiseHours === hours}
                onClick={() => setPromiseHours(hours)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-medium",
                  promiseHours === hours
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line hover:bg-surface-2",
                )}
              >
                {hours ? `≤ ${formatWorkHours(hours)}` : "Tanpa janji"}
              </button>
            ))}
          </div>
          <p className="mt-1 text-sm text-muted">
            Dihitung dalam jam kerja dari sekarang. Tenggat asli tidak berubah, jadi keterlambatan tetap masuk
            rapor.
          </p>
        </fieldset>
        <Alert>{errors.form}</Alert>
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Menyimpan…" : "Kirim tindak lanjut"}
        </button>
      </form>
    </section>
  );
}
