"use client";

import { Sparkles, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { startNavProgress } from "@/components/layout/NavProgress";
import { Alert, buttonClass, type ButtonVariant, Field } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useResetOnHide } from "@/lib/hooks";
import { type FormErrors, postJson } from "@/lib/http";
import type { Action, Status } from "@/lib/workflow";

/** Aksi yang catatan untuk warganya bisa dirapikan asisten AI (lib/assist.ts). */
const ASSISTED: Action[] = ["request_fix", "reject"];
type Draft = { text: string; source: "ai" | "demo" };

interface ActionSpec {
  label: string;
  variant: ButtonVariant;
  /** null = tanpa isian catatan untuk warga. */
  publicLabel: string | null;
  publicRequired?: boolean;
  confirm: string;
  hint?: string;
}

const ACTIONS: Record<Action, ActionSpec> = {
  arrive: {
    label: "Warga sudah hadir",
    variant: "primary",
    publicLabel: null,
    confirm: "Catat kedatangan & mulai verifikasi",
    hint: "Hitung mundur tahap verifikasi dimulai sekarang. Pastikan warga membawa dokumen asli; pemeriksaannya dicentang saat menyelesaikan tahap.",
  },
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

export default function ActionPanel({
  resi,
  status,
  stepName,
  next,
  nextResi,
  checklist,
  evidenceLabel,
}: {
  resi: string;
  status: Status;
  stepName: string | null;
  /** Tahap & peran berikutnya, ditampilkan sebelum menyelesaikan agar jelas ke mana berkas pergi. */
  next: string | null;
  /** Tugas berikutnya di antrean petugas ini; null = kembali ke antrean. */
  nextResi: string | null;
  /** Syarat selesai tahap ini; semua wajib dicentang sebelum "Selesaikan". */
  checklist: string[];
  /** Label bukti wajib (mis. "Nomor seri blangko"); null = tanpa bukti. */
  evidenceLabel: string | null;
}) {
  const router = useRouter();
  const available: Action[] =
    status === "menunggu_kedatangan"
      ? ["arrive", "reject"]
      : status === "perlu_perbaikan"
        ? ["resume", "reject"]
        : ["complete", "request_fix", "reject"];
  const [action, setAction] = useState<Action | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [evidence, setEvidence] = useState("");
  // Tombol selesai baru aktif setelah dasar keputusannya lengkap.
  const ready = checked.length === checklist.length && (!evidenceLabel || evidence.trim() !== "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  // Catatan untuk warga (terkontrol, agar bisa diganti draf asisten AI dan dikembalikan).
  const [note, setNote] = useState("");
  const [assisting, setAssisting] = useState(false);
  /** Hasil asisten terakhir + tulisan petugas sebelumnya (untuk "Kembalikan"). */
  const [assisted, setAssisted] = useState<{ source: Draft["source"]; before: string } | null>(null);
  // Setelah aksi, halaman pindah tapi panel ini hanya disembunyikan: jangan kembali dalam keadaan "Menyimpan…".
  useResetOnHide(() => {
    setPending(false);
    setAssisting(false);
  });

  const spec = action ? ACTIONS[action] : null;

  /** Minta draf catatan yang lebih jelas untuk warga; petugas tetap memeriksa sebelum mengirim. */
  async function assist() {
    if (!action) return;
    if (note.trim().length < 3) {
      setErrors({ publicNote: 'Tulis dulu inti catatannya (mis. "KK lama, nama beda"), lalu rapikan.' });
      return;
    }
    setAssisting(true);
    setErrors({});
    const res = await postJson<Draft>(`/api/applications/${resi}/assist`, { kind: action, draft: note });
    setAssisting(false);
    if (!res.ok) {
      setErrors({ publicNote: res.error.fields?.draft ?? res.error.message });
      return;
    }
    setAssisted({ source: res.data.source, before: note });
    setNote(res.data.text);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!spec) return;
    const form = new FormData(event.currentTarget);
    const publicNote = String(form.get("publicNote") ?? "").trim();
    if (spec.publicRequired && !publicNote) {
      setErrors({ publicNote: "Wajib diisi, karena catatan ini dibaca warga." });
      return;
    }
    if (action === "reject" && !form.get("confirmFinal")) {
      setErrors({ confirmFinal: "Centang untuk memastikan penolakan memang disengaja." });
      return;
    }
    setPending(true);
    setErrors({});
    const res = await postJson(`/api/applications/${resi}/actions`, {
      action,
      publicNote: publicNote || undefined,
      internalNote: String(form.get("internalNote") ?? "").trim() || undefined,
      ...(action === "complete" && { checked, evidence: evidence.trim() || undefined }),
    });
    if (!res.ok) {
      setErrors({ ...res.error.fields, form: res.error.message });
      setPending(false);
      return;
    }
    // Lanjut ke tugas berikutnya (atau kembali ke antrean) dengan konfirmasi di atas daftar:
    // panel ini bisa hilang setelah aksi karena tahap pindah ke peran lain.
    startNavProgress();
    router.push(`/kerja${nextResi ? `/${nextResi}` : ""}?selesai=${resi}&aksi=${action}`);
    router.refresh();
  }

  return (
    // Satu-satunya panel beraksen di halaman: tepi biru + cincin lembut.
    <section
      className="rounded-card border border-brand/40 bg-surface p-5 shadow-[0_0_0_4px_var(--brand-soft)]"
      aria-labelledby="action-title"
    >
      <h2 id="action-title" className="text-base font-semibold">
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
              setNote("");
              setAssisted(null);
            }}
            className={buttonClass(
              ACTIONS[key].variant,
              "min-h-9 px-3.5",
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
          {action === "complete" && checklist.length > 0 && (
            <fieldset aria-describedby={errors.checked ? "checked-error" : undefined}>
              <legend className="mb-1.5 text-sm font-medium">
                Syarat selesai{" "}
                <span className="font-normal text-muted">
                  ({checked.length}/{checklist.length}, tercatat di audit log)
                </span>
              </legend>
              <ul className="space-y-1">
                {checklist.map((item) => (
                  <li key={item}>
                    <label className="flex cursor-pointer gap-2.5 rounded-lg p-1.5 text-sm hover:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={checked.includes(item)}
                        onChange={() =>
                          setChecked((list) =>
                            list.includes(item) ? list.filter((x) => x !== item) : [...list, item],
                          )
                        }
                        className="mt-0.5 size-4.5 shrink-0 accent-[var(--brand)]"
                      />
                      {item}
                    </label>
                  </li>
                ))}
              </ul>
              {errors.checked && (
                <p id="checked-error" className="mt-1 text-sm text-late">
                  {errors.checked}
                </p>
              )}
            </fieldset>
          )}
          {action === "complete" && evidenceLabel && (
            <Field
              label={evidenceLabel}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              maxLength={120}
              hint="Wajib diisi sebagai bukti tahap ini, tampil di timeline petugas."
              error={errors.evidence}
            />
          )}
          {action === "complete" && (
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
              {next ? (
                <>
                  Setelah ini berkas diteruskan ke <span className="font-semibold">{next}</span>. Anda tidak
                  bisa membatalkannya.
                </>
              ) : (
                "Ini tahap terakhir: permohonan akan berstatus Selesai."
              )}
            </p>
          )}
          {spec.publicLabel && (
            <div>
              <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
                <label htmlFor="publicNote" className="block text-sm font-medium">
                  {spec.publicLabel}
                </label>
                {ASSISTED.includes(action!) && (
                  <button
                    type="button"
                    onClick={assist}
                    disabled={assisting}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs font-medium text-brand transition-colors hover:border-brand/40 hover:bg-brand-soft disabled:opacity-60"
                  >
                    <Sparkles
                      aria-hidden
                      className={cn("size-3.5", assisting && "motion-safe:animate-pulse")}
                    />
                    {assisting ? "Merapikan…" : "Rapikan untuk warga"}
                  </button>
                )}
              </div>
              <textarea
                id="publicNote"
                name="publicNote"
                rows={assisted ? 5 : 3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                readOnly={assisting}
                aria-busy={assisting}
                aria-invalid={Boolean(errors.publicNote)}
                aria-describedby={
                  cn(errors.publicNote && "publicNote-error", assisted && "publicNote-assist") || undefined
                }
                className={cn(
                  "w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand aria-invalid:border-late",
                  assisting && "skeleton-shimmer text-muted",
                )}
              />
              {assisted && !assisting && (
                <p
                  id="publicNote-assist"
                  className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted"
                >
                  <Sparkles aria-hidden className="size-3.5 text-brand" />
                  {assisted.source === "ai"
                    ? "Draf dari asisten AI. Periksa & sesuaikan sebelum mengirim."
                    : "Templat demo (asisten AI belum diatur). Periksa sebelum mengirim."}
                  <button
                    type="button"
                    onClick={() => {
                      setNote(assisted.before);
                      setAssisted(null);
                    }}
                    className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                  >
                    <Undo2 aria-hidden className="size-3.5" />
                    Kembalikan tulisan saya
                  </button>
                </p>
              )}
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
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
            />
          </div>
          {action === "reject" && (
            <div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="confirmFinal" className="mt-0.5 size-4 accent-late" />
                Saya paham penolakan bersifat final dan warga harus mengajukan ulang dari awal.
              </label>
              {errors.confirmFinal && <p className="mt-1 text-sm text-late">{errors.confirmFinal}</p>}
            </div>
          )}
          <Alert>{errors.form}</Alert>
          <button
            type="submit"
            disabled={pending || (action === "complete" && !ready)}
            className={buttonClass(spec.variant)}
          >
            {pending ? "Menyimpan…" : spec.confirm}
          </button>
        </form>
      )}
    </section>
  );
}
