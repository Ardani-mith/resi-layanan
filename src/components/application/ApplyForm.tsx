"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert, buttonClass, Field } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ActiveService } from "@/lib/dal";
import { type FormErrors, postJson } from "@/lib/http";
import {
  BLOOD_TYPES,
  KTP_MIN_AGE,
  ktpAgeAllowed,
  MARITAL_STATUSES,
  needsKtpData,
  nikInfo,
  RELIGIONS,
} from "@/lib/present";
import type { Channel } from "@/lib/workflow";
import { KtpArt } from "./DocumentArt";

/** Nama input yang ikut ditampilkan di pratinjau KTP (sama dengan nama field form). */
const PREVIEW_FIELDS = [
  "name",
  "nik",
  "birthPlace",
  "bloodType",
  "address",
  "rtRw",
  "village",
  "district",
  "religion",
  "marital",
  "job",
] as const;
type Person = Partial<Record<(typeof PREVIEW_FIELDS)[number], string>>;

const JOBS = [
  "PELAJAR/MAHASISWA",
  "BELUM/TIDAK BEKERJA",
  "MENGURUS RUMAH TANGGA",
  "KARYAWAN SWASTA",
  "WIRASWASTA",
  "PEGAWAI NEGERI SIPIL",
  "PETANI/PEKEBUN",
  "BURUH HARIAN LEPAS",
];

/**
 * Pratinjau KTP-el yang ikut berubah saat warga mengetik. Tanggal lahir & jenis kelamin
 * dibaca dari NIK, jadi salah ketik NIK langsung terlihat.
 */
function KtpPreview({ person, className }: { person: Person; className?: string }) {
  const up = (key: keyof Person) => (person[key] ?? "").trim().toUpperCase();
  const nik = person.nik ?? "";
  const info = nikInfo(nik);
  const badNik = nik.length >= 12 && !info;
  return (
    <figure className={cn("space-y-2", className)}>
      <KtpArt
        data={{
          nik,
          name: up("name"),
          birth: [up("birthPlace"), info?.birthDate].filter(Boolean).join(", "),
          gender: info?.gender ?? "",
          bloodType: person.bloodType ?? "",
          address: up("address"),
          rtrw: up("rtRw"),
          village: up("village"),
          district: up("district"),
          religion: up("religion"),
          marital: up("marital"),
          job: up("job"),
          citizenship: "WNI",
          validUntil: "SEUMUR HIDUP",
        }}
      />
      <figcaption className="text-xs text-muted">
        {badNik ? (
          <span className="font-medium text-late">
            Digit tanggal lahir di NIK (digit 7–12) tidak valid. Periksa kembali NIK Anda.
          </span>
        ) : (
          "Pratinjau KTP-el dari isian Anda. Tanggal lahir & jenis kelamin dibaca dari NIK: pastikan sesuai."
        )}
      </figcaption>
    </figure>
  );
}

/** Isian khusus KTP-el (dicetak di kartu). */
function KtpFields({ person, errors }: { person: Person; errors: FormErrors }) {
  const info = nikInfo(person.nik ?? "");
  const tooYoung = info && person.marital && !ktpAgeAllowed(info.birthDate, person.marital);
  const err = (key: string) => errors[`applicant.ktp.${key}`];
  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm sm:col-span-2">
        Tanggal lahir & jenis kelamin:{" "}
        <span className="font-semibold">
          {info ? `${info.birthDate} · ${info.gender === "PEREMPUAN" ? "Perempuan" : "Laki-laki"}` : "—"}
        </span>{" "}
        <span className="text-muted">(otomatis dari NIK)</span>
      </p>
      <Field label="Tempat lahir" name="birthPlace" required error={err("birthPlace")} />
      <Field
        as="select"
        label="Golongan darah"
        name="bloodType"
        defaultValue=""
        required
        error={err("bloodType")}
      >
        <option value="" disabled>
          Pilih
        </option>
        {BLOOD_TYPES.map((b) => (
          <option key={b} value={b}>
            {b === "-" ? "Tidak tahu" : b}
          </option>
        ))}
      </Field>
      <Field
        className="sm:col-span-2"
        label="Alamat"
        name="address"
        autoComplete="street-address"
        placeholder="JL. MELATI NO. 12"
        required
        error={err("address")}
      />
      <Field
        label="RT/RW"
        name="rtRw"
        placeholder="003/005"
        inputMode="numeric"
        required
        error={err("rtRw")}
      />
      <Field label="Kelurahan/Desa" name="village" required error={err("village")} />
      <Field label="Kecamatan" name="district" required error={err("district")} />
      <Field
        as="select"
        label="Agama/Kepercayaan"
        name="religion"
        defaultValue=""
        required
        error={err("religion")}
      >
        <option value="" disabled>
          Pilih
        </option>
        {RELIGIONS.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0) + r.slice(1).toLowerCase()}
          </option>
        ))}
      </Field>
      <Field
        as="select"
        label="Status perkawinan"
        name="marital"
        defaultValue=""
        required
        error={
          err("marital") ??
          (tooYoung ? `Menurut NIK, pemohon belum ${KTP_MIN_AGE} tahun dan belum kawin.` : null)
        }
      >
        <option value="" disabled>
          Pilih
        </option>
        {MARITAL_STATUSES.map((m) => (
          <option key={m} value={m}>
            {m.charAt(0) + m.slice(1).toLowerCase()}
          </option>
        ))}
      </Field>
      <Field label="Pekerjaan" name="job" list="ktp-jobs" required error={err("job")} />
      <datalist id="ktp-jobs">
        {JOBS.map((j) => (
          <option key={j} value={j} />
        ))}
      </datalist>
    </div>
  );
}

/**
 * Form pengajuan permohonan. channel="online" untuk warga, "loket" untuk petugas
 * yang menginput warga walk-in (server memeriksa perannya).
 */
export default function ApplyForm({
  services,
  initialSlug,
  channel = "online",
}: {
  services: ActiveService[];
  initialSlug?: string;
  channel?: Channel;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(
    services.some((s) => s.slug === initialSlug) ? initialSlug : services[0]?.slug,
  );
  const [checked, setChecked] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [person, setPerson] = useState<Person>({});

  const service = services.find((s) => s.slug === slug);
  const isLoket = channel === "loket";
  // Pratinjau dokumen hanya untuk layanan KTP-el (isi kartunya = data pemohon sendiri).
  const showKtp = Boolean(service && needsKtpData(service.slug));

  function chooseService(next: string) {
    setSlug(next);
    setChecked([]);
    setErrors({});
  }

  function toggle(requirement: string) {
    setChecked((list) =>
      list.includes(requirement) ? list.filter((r) => r !== requirement) : [...list, requirement],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service) return;
    const form = new FormData(event.currentTarget);
    const local: FormErrors = {};
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
    const res = await postJson<{ resi: string }>("/api/applications", {
      serviceSlug: slug,
      channel,
      applicant: {
        name: form.get("name"),
        nik: form.get("nik"),
        phone: form.get("phone"),
        email: form.get("email"),
        ...(showKtp && {
          ktp: Object.fromEntries(
            [
              "birthPlace",
              "bloodType",
              "address",
              "rtRw",
              "village",
              "district",
              "religion",
              "marital",
              "job",
            ].map((key) => [key, form.get(key) ?? ""]),
          ),
        }),
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
      onChange={(event) => {
        // Event isian naik ke form; pantau field yang tampil di pratinjau KTP.
        const input: EventTarget = event.target;
        if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
        const { name, value } = input;
        if ((PREVIEW_FIELDS as readonly string[]).includes(name)) setPerson((p) => ({ ...p, [name]: value }));
      }}
      noValidate
      className={cn(
        "grid gap-6 lg:items-start",
        showKtp ? "lg:grid-cols-[1fr_24rem]" : "lg:grid-cols-[1fr_20rem]",
      )}
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

        {/* 3. Data pemohon (HP: pratinjau KTP di atas isian agar terlihat sambil mengetik) */}
        {showKtp && <KtpPreview person={person} className="lg:hidden" />}
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
            {showKtp && <KtpFields person={person} errors={errors} />}
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
        {showKtp && <KtpPreview person={person} className="hidden lg:block" />}
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
