"use client";

// Kelola layanan: baris ringkas per layanan + editor (nama, persyaratan, tahapan & SLA).

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert, buttonClass, Field } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { AdminService } from "@/lib/dal";
import { type FormErrors, formErrors, postJson } from "@/lib/http";
import { type Role, ROLE_LABELS, ROLES } from "@/lib/roles";

type StepDraft = { name: string; role: Role | ""; slaDays: string };

const toDraft = (service?: AdminService): StepDraft[] =>
  service?.steps.map((s) => ({
    name: s.name,
    role: s.role,
    slaDays: s.slaDays ? String(s.slaDays) : "",
  })) ?? [
    { name: "Verifikasi berkas", role: "petugas_loket", slaDays: "1" },
    { name: "Siap diambil di loket", role: "petugas_loket", slaDays: "" },
  ];

const small = buttonClass("secondary", "min-h-9 px-3");
const iconButton =
  "grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30";

function ServiceForm({ service, onDone }: { service?: AdminService; onDone: () => void }) {
  const router = useRouter();
  const [steps, setSteps] = useState(() => toDraft(service));
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);

  const update = (i: number, patch: Partial<StepDraft>) =>
    setSteps((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, by: -1 | 1) =>
    setSteps((list) => {
      const next = [...list];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setErrors({});
    const res = await postJson(service ? `/api/admin/services/${service.id}` : "/api/admin/services", {
      name: form.get("name"),
      slug: service?.slug ?? form.get("slug"),
      description: form.get("description"),
      output: form.get("output"),
      requirements: String(form.get("requirements") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      steps: steps.map((s) => ({
        name: s.name,
        role: s.role,
        slaDays: s.slaDays ? Number(s.slaDays) : null,
      })),
      isActive: form.get("isActive") === "on",
      order: Number(form.get("order") || 0),
    });
    setPending(false);
    if (!res.ok) {
      setErrors(formErrors(res.error));
      return;
    }
    router.refresh();
    onDone();
  }

  const totalSla = steps.reduce((sum, s) => sum + (Number(s.slaDays) || 0), 0);

  return (
    <form method="post" onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama layanan" name="name" required defaultValue={service?.name} error={errors.name} />
        <Field
          label="Slug (alamat /layanan/…)"
          name="slug"
          required
          defaultValue={service?.slug}
          disabled={Boolean(service)}
          hint={
            service ? "Tidak bisa diubah setelah dibuat." : "Huruf kecil & tanda hubung, mis. surat-pindah."
          }
          error={errors.slug}
        />
        <Field
          as="textarea"
          label="Deskripsi"
          name="description"
          defaultValue={service?.description}
          error={errors.description}
          className="sm:col-span-2"
        />
        <Field label="Hasil layanan" name="output" defaultValue={service?.output} error={errors.output} />
        <Field
          label="Urutan tampil"
          name="order"
          type="number"
          min={0}
          defaultValue={service?.order ?? 0}
          error={errors.order}
        />
        <Field
          as="textarea"
          label="Persyaratan (satu per baris)"
          name="requirements"
          defaultValue={service?.requirements.join("\n")}
          error={errors.requirements}
          className="sm:col-span-2"
        />
      </div>

      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">
          Tahapan <span className="font-normal text-muted">· total target {totalSla} hari kerja</span>
        </legend>
        <p className="text-sm text-muted">
          Kosongkan SLA untuk tahap tanpa tenggat (mis. menunggu warga mengambil dokumen). Perubahan hanya
          berlaku untuk permohonan baru.
        </p>
        <ol className="mt-3 space-y-3">
          {steps.map((step, i) => (
            <li
              key={i}
              className="grid gap-2 rounded-xl bg-surface-2 p-3 sm:grid-cols-[2rem_1fr_11rem_7rem_auto]"
            >
              <span className="grid size-8 place-items-center rounded-full bg-surface text-sm font-bold">
                {i + 1}
              </span>
              <Field
                label="Nama tahap"
                value={step.name}
                onChange={(e) => update(i, { name: e.target.value })}
                error={errors[`steps.${i}.name`]}
              />
              <Field
                as="select"
                label="Peran"
                value={step.role}
                onChange={(e) => update(i, { role: e.target.value as Role })}
                error={errors[`steps.${i}.role`]}
              >
                <option value="" disabled>
                  Pilih peran
                </option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </Field>
              <Field
                label="SLA (hari kerja)"
                type="number"
                min={1}
                max={60}
                value={step.slaDays}
                onChange={(e) => update(i, { slaDays: e.target.value })}
                error={errors[`steps.${i}.slaDays`]}
              />
              <div className="flex items-end gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Naikkan tahap ${i + 1}`}
                  className={iconButton}
                >
                  <ArrowUp aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === steps.length - 1}
                  aria-label={`Turunkan tahap ${i + 1}`}
                  className={iconButton}
                >
                  <ArrowDown aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSteps((list) => list.filter((_, j) => j !== i))}
                  disabled={steps.length <= 2}
                  aria-label={`Hapus tahap ${i + 1}`}
                  className={cn(iconButton, "hover:text-late")}
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
        {errors.steps && <p className="mt-2 text-sm text-late">{errors.steps}</p>}
        <button
          type="button"
          onClick={() => setSteps((list) => [...list, { name: "", role: "", slaDays: "" }])}
          className={cn(small, "mt-3")}
        >
          <Plus aria-hidden className="size-4" /> Tambah tahap
        </button>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={service?.isActive ?? true}
          className="size-4"
        />
        Layanan dibuka (tampil di /layanan dan form pengajuan)
      </label>

      <Alert>{errors.form}</Alert>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Menyimpan…" : service ? "Simpan perubahan" : "Buat layanan"}
        </button>
        <button type="button" onClick={onDone} className={buttonClass("secondary")}>
          Batal
        </button>
      </div>
    </form>
  );
}

/** Tombol + editor layanan baru. */
export function NewService() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("primary")}>
        <Plus aria-hidden className="size-4" /> Tambah layanan
      </button>
    );
  }
  return (
    <section className="rounded-card border border-line bg-surface p-5" aria-label="Layanan baru">
      <h2 className="mb-4 text-lg font-bold">Layanan baru</h2>
      <ServiceForm onDone={() => setOpen(false)} />
    </section>
  );
}

/** Satu layanan di daftar: ringkasan + editor saat "Ubah". */
export function ServiceRow({ service }: { service: AdminService }) {
  const [editing, setEditing] = useState(false);
  const totalSla = service.steps.reduce((sum, s) => sum + (s.slaDays || 0), 0);
  return (
    <li className={cn("space-y-4 px-5 py-4", !service.isActive && "bg-surface-2/60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {service.name}
            {!service.isActive && (
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
                Ditutup
              </span>
            )}
          </p>
          <p className="text-sm text-muted">
            <Link href={`/layanan/${service.slug}`} className="font-mono hover:text-brand">
              /layanan/{service.slug}
            </Link>{" "}
            · {service.steps.length} tahap · target {totalSla} hari kerja · {service.requirements.length}{" "}
            persyaratan
          </p>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className={small}>
            Ubah
          </button>
        )}
      </div>
      {editing && <ServiceForm service={service} onDone={() => setEditing(false)} />}
    </li>
  );
}
