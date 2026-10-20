"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { postJson } from "@/lib/http";

/**
 * Form pengajuan permohonan. channel="online" untuk warga, "loket" untuk petugas
 * yang menginput warga walk-in (server memeriksa perannya).
 */
export default function ApplyForm({ services, initialSlug, channel = "online" }) {
  const router = useRouter();
  const [slug, setSlug] = useState(
    services.some((s) => s.slug === initialSlug) ? initialSlug : services[0]?.slug,
  );
  const [checked, setChecked] = useState([]);
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);

  const service = services.find((s) => s.slug === slug);
  const isLoket = channel === "loket";

  function chooseService(next) {
    setSlug(next);
    setChecked([]);
    setErrors({});
  }

  function toggle(requirement) {
    setChecked((list) =>
      list.includes(requirement) ? list.filter((r) => r !== requirement) : [...list, requirement],
    );
  }

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const local = {};
    if (checked.length !== service.requirements.length) {
      local.requirementsChecked = isLoket
        ? "Centang semua persyaratan yang sudah diperiksa di loket."
        : "Pastikan semua persyaratan sudah Anda siapkan.";
    }
    if (!isLoket && !form.get("consent")) local.consent = "Centang pernyataan ini untuk melanjutkan.";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    setPending(true);
    setErrors({});
    const res = await postJson("/api/applications", {
      serviceSlug: slug,
      channel,
      applicant: {
        name: form.get("name"),
        nik: form.get("nik"),
        phone: form.get("phone"),
        email: form.get("email"),
      },
      requirementsChecked: checked,
    });
    if (!res.ok) {
      setErrors({ ...res.error.fields, form: res.error.message });
      setPending(false);
      return;
    }
    // pending tetap true sampai halaman sukses terbuka, mencegah pengajuan ganda.
    router.push(`/ajukan/sukses?resi=${res.data.resi}${isLoket ? "&loket=1" : ""}`);
  }

  if (!service) {
    return <p className="rounded-card bg-surface p-6 text-muted">Belum ada layanan yang dibuka.</p>;
  }

  // method="post": jika dikirim sebelum JavaScript aktif, NIK & nomor HP tidak masuk ke URL.
  return (
    <form
      method="post"
      onSubmit={submit}
      noValidate
      className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start"
    >
      <div className="space-y-6">
        {/* 1. Layanan */}
        <fieldset className="rounded-card border border-line bg-surface p-5">
          <legend className="float-left w-full text-lg font-bold">1. Pilih layanan</legend>
          <div className="clear-both grid gap-3 pt-3">
            {services.map((s) => (
              <label
                key={s.slug}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-4 transition",
                  s.slug === slug ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2",
                )}
              >
                <input
                  type="radio"
                  name="service"
                  value={s.slug}
                  checked={s.slug === slug}
                  onChange={() => chooseService(s.slug)}
                  className="mt-1 size-4 accent-[var(--brand)]"
                />
                <span>
                  <span className="block font-semibold">{s.name}</span>
                  <span className="block text-sm text-muted">{s.description}</span>
                  <span className="mt-1 block text-xs font-semibold text-brand">
                    Target {s.totalSlaDays} hari kerja
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 2. Persyaratan */}
        <fieldset
          className="rounded-card border border-line bg-surface p-5"
          aria-describedby={errors.requirementsChecked ? "req-error" : undefined}
        >
          <legend className="float-left w-full text-lg font-bold">2. Persyaratan</legend>
          <p className="clear-both pt-1 text-sm text-muted">
            {isLoket
              ? "Centang dokumen yang sudah diperiksa di loket."
              : "Versi ini belum menerima unggahan berkas. Centang dokumen yang sudah Anda siapkan; petugas akan memverifikasinya."}
          </p>
          <ul className="mt-3 space-y-2">
            {service.requirements.map((r) => (
              <li key={r}>
                <label className="flex cursor-pointer gap-3 rounded-xl p-2 hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={checked.includes(r)}
                    onChange={() => toggle(r)}
                    className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                  />
                  <span>{r}</span>
                </label>
              </li>
            ))}
          </ul>
          {errors.requirementsChecked && (
            <p id="req-error" className="mt-2 text-sm text-late">
              {errors.requirementsChecked}
            </p>
          )}
        </fieldset>

        {/* 3. Data pemohon */}
        <fieldset className="rounded-card border border-line bg-surface p-5">
          <legend className="float-left w-full text-lg font-bold">3. Data pemohon</legend>
          <div className="clear-both grid gap-4 pt-3 sm:grid-cols-2">
            <Field
              className="sm:col-span-2"
              label="Nama lengkap sesuai KTP/KK"
              name="name"
              autoComplete="name"
              required
              error={errors["applicant.name"]}
            />
            <Field
              label="NIK"
              name="nik"
              inputMode="numeric"
              maxLength={16}
              required
              hint="16 digit. Tidak pernah ditampilkan di halaman lacak."
              error={errors["applicant.nik"]}
            />
            <Field
              label="Nomor HP"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              hint="4 digit terakhir dipakai untuk membuka detail resi."
              error={errors["applicant.phone"]}
            />
            <Field
              className="sm:col-span-2"
              label="Email (opsional)"
              name="email"
              type="email"
              autoComplete="email"
              hint="Untuk notifikasi perubahan status."
              error={errors["applicant.email"]}
            />
          </div>
        </fieldset>

        {!isLoket && (
          <div>
            <label className="flex cursor-pointer gap-3 text-sm">
              <input
                type="checkbox"
                name="consent"
                className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
              />
              <span>
                Saya menyatakan data di atas benar dan bersedia dihubungi petugas terkait permohonan ini.
              </span>
            </label>
            {errors.consent && <p className="mt-1 text-sm text-late">{errors.consent}</p>}
          </div>
        )}
      </div>

      {/* Ringkasan */}
      <aside className="space-y-4 lg:sticky lg:top-24">
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="font-bold">Alur {service.name}</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {service.steps.map((step, i) => (
              <li key={step.key} className="flex justify-between gap-3">
                <span>
                  <span className="text-muted">{i + 1}.</span> {step.name}
                </span>
                <span className="shrink-0 text-muted">{step.slaDays ? `${step.slaDays} hari` : "—"}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-line pt-3 text-sm">
            Target selesai <span className="font-semibold">{service.totalSlaDays} hari kerja</span>. Setiap
            tahap punya tenggat sendiri yang bisa Anda pantau.
          </p>
        </div>
        <Alert>{errors.form}</Alert>
        <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
          {pending ? "Mengirim…" : isLoket ? "Daftarkan & cetak resi" : "Ajukan & dapatkan resi"}
        </button>
      </aside>
    </form>
  );
}
