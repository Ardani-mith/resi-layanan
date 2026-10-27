"use client";

import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { Alert, buttonClass, Field } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ActiveService } from "@/lib/dal";
import { formatDate, formatWorkHours } from "@/lib/format";
import { useResetOnHide } from "@/lib/hooks";
import { type FormErrors, postJson } from "@/lib/http";
import {
  APPLICANT_MIN_AGE,
  BLOOD_TYPES,
  checkNik,
  KTP_MIN_AGE,
  ktpAgeAllowed,
  MARITAL_STATUSES,
  needsKtpData,
  type NikCheck,
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
function KtpFields({
  person,
  errors,
  marriedOnly,
}: {
  person: Person;
  errors: FormErrors;
  /** Pemohon di bawah 17 tahun yang sudah menjawab "sudah/pernah kawin". */
  marriedOnly: boolean;
}) {
  const info = nikInfo(person.nik ?? "");
  const tooYoung = info && person.marital && !ktpAgeAllowed(info.birthDate, person.marital);
  const err = (key: string) => errors[`applicant.ktp.${key}`];
  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
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
        {MARITAL_STATUSES.filter((m) => !marriedOnly || m !== "BELUM KAWIN").map((m) => (
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

const genderText = (g: string) => (g === "PEREMPUAN" ? "perempuan" : "laki-laki");

/** Ulang tahun ke-17 dari "DD-MM-YYYY" → tanggal paling awal bisa membuat KTP-el (jika belum kawin). */
function eligibleFrom(birthDate: string): Date {
  const [day, month, year] = birthDate.split("-").map(Number);
  return new Date(Date.UTC(year + KTP_MIN_AGE, month - 1, day));
}

/**
 * KTP-el untuk pemohon di bawah 17 tahun: satu pertanyaan langsung di langkah NIK, bukan
 * kejutan di langkah 4. "Belum kawin" = berhenti di sini dengan jawaban kapan bisa mengajukan.
 */
function MinorKtpQuestion({
  check,
  married,
  onAnswer,
}: {
  check: Extract<NikCheck, { ok: true }>;
  married: boolean | null;
  onAnswer: (married: boolean) => void;
}) {
  const options: [boolean, string][] = [
    [true, "Sudah/pernah kawin"],
    [false, "Belum kawin"],
  ];
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-warn/40 bg-warn-soft p-4 text-sm">
      <p className="flex gap-2">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
        <span>
          <span className="font-semibold">
            Lahir {check.birthDate} · {genderText(check.gender)} · {check.age} tahun.
          </span>{" "}
          KTP-el diberikan kepada warga berusia {KTP_MIN_AGE} tahun, atau yang sudah/pernah kawin walau belum{" "}
          {KTP_MIN_AGE} tahun.
        </span>
      </p>
      <fieldset>
        <legend className="mb-2 font-semibold">Apakah pemohon sudah atau pernah kawin?</legend>
        <div className="flex flex-wrap gap-2">
          {options.map(([value, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={married === value}
              onClick={() => onAnswer(value)}
              className={cn(
                "rounded-full border px-4 py-1.5 font-semibold transition-colors",
                married === value
                  ? "border-brand bg-brand text-on-brand"
                  : "border-line bg-surface hover:bg-surface-2",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      {married === true && (
        <p role="status" className="flex gap-2 text-ok">
          <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
          Bisa dilanjutkan. Siapkan buku nikah atau akta perkawinan untuk diperiksa petugas.
        </p>
      )}
      {married === false && (
        <p role="status" className="rounded-lg bg-surface px-3 py-2">
          Pemohon bisa mengajukan KTP-el mulai{" "}
          <span className="font-semibold">{formatDate(eligibleFrom(check.birthDate))}</span>. Sampai saat itu,
          identitas anak tercatat di Kartu Keluarga dan Kartu Identitas Anak (KIA).
        </p>
      )}
    </div>
  );
}

/** Kode OTP yang sedang menunggu diisi (pengajuan online). */
type OtpChallenge = { id: string; phoneMasked: string; demoCode?: string };

type ApplyFormProps = { services: ActiveService[]; initialSlug?: string; channel?: Channel };

/**
 * Form pengajuan permohonan. channel="online" untuk warga, "loket" untuk petugas
 * yang menginput warga walk-in (server memeriksa perannya).
 *
 * Setelah berhasil, halaman form hanya disembunyikan (Activity), jadi isiannya dibuang saat itu:
 * di loket komputer dipakai bergantian, warga berikutnya tidak boleh melihat NIK/HP warga
 * sebelumnya. Draf yang belum dikirim tetap tersimpan bila warga berpindah halaman sebentar.
 */
export default function ApplyForm(props: ApplyFormProps) {
  const [generation, setGeneration] = useState(0);
  const submitted = useRef(false);
  useResetOnHide(() => {
    if (!submitted.current) return;
    submitted.current = false;
    setGeneration((g) => g + 1);
  });
  return (
    <ApplyFormBody
      key={generation}
      {...props}
      onSubmitted={() => {
        submitted.current = true;
      }}
    />
  );
}

function ApplyFormBody({
  services,
  initialSlug,
  channel = "online",
  onSubmitted,
}: ApplyFormProps & { onSubmitted: () => void }) {
  const router = useRouter();
  const [slug, setSlug] = useState(
    services.some((s) => s.slug === initialSlug) ? initialSlug : services[0]?.slug,
  );
  const [checked, setChecked] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [person, setPerson] = useState<Person>({});
  // Hasil cek NIK (null = belum 16 digit). Bagian lain form terkunci sampai NIK valid.
  const [nikCheck, setNikCheck] = useState<NikCheck | null>(null);
  // Jawaban "sudah/pernah kawin?" untuk pemohon KTP-el di bawah 17 tahun (null = belum dijawab).
  const [married, setMarried] = useState<boolean | null>(null);
  const [otp, setOtp] = useState<OtpChallenge | null>(null);

  const service = services.find((s) => s.slug === slug);
  const isLoket = channel === "loket";
  // Pratinjau dokumen hanya untuk layanan KTP-el (isi kartunya = data pemohon sendiri).
  const showKtp = Boolean(service && needsKtpData(service.slug));

  const nikOk = Boolean(nikCheck?.ok && (!nikCheck.needsMarried || married === true));
  const checkFor = (nik: string, serviceSlug = slug ?? "") =>
    nik.length === 16 || /\D/.test(nik) ? checkNik(nik, serviceSlug) : null;

  function chooseService(next: string) {
    setSlug(next);
    setChecked([]);
    setErrors({});
    setOtp(null);
    // Aturan umur bergantung layanan (KTP-el boleh di bawah 17 jika sudah kawin).
    setNikCheck(checkFor(person.nik ?? "", next));
    setMarried(null);
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
    if (!nikOk) {
      local["applicant.nik"] =
        nikCheck?.ok === false
          ? nikCheck.message
          : nikCheck?.needsMarried
            ? "Jawab pertanyaan status perkawinan di bawah."
            : "Isi NIK pemohon dulu.";
    }
    if (!isLoket && !form.get("consent")) local.consent = "Centang pernyataan ini untuk melanjutkan.";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    // "Kirim ulang kode" = kirim tanpa kode, server membuat kode baru.
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const code = String(form.get("otpCode") ?? "").trim();
    if (otp && submitter?.value !== "resend" && !/^\d{6}$/.test(code)) {
      setErrors({ otp: "Masukkan 6 digit kode." });
      return;
    }

    setPending(true);
    setErrors({});
    const res = await postJson<
      | ({ otpRequired: true } & Omit<OtpChallenge, "id"> & { otpId: string })
      | { otpRequired: false; resi: string }
    >("/api/applications", {
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
      consent: Boolean(form.get("consent")),
      ...(otp && submitter?.value !== "resend" && { otp: { id: otp.id, code } }),
    });
    if (!res.ok) {
      const { fields, message } = res.error;
      // Kesalahan kode tetap di panel verifikasi; kesalahan lain = kembali ke isian.
      if (!fields.otp) setOtp(null);
      setErrors({ ...fields, form: fields.otp ? null : message });
      setPending(false);
      return;
    }
    if (res.data.otpRequired) {
      const { otpId, phoneMasked, demoCode } = res.data;
      setOtp({ id: otpId, phoneMasked, demoCode });
      setPending(false);
      return;
    }
    // pending tetap true sampai halaman sukses terbuka, mencegah pengajuan ganda.
    onSubmitted();
    router.push(`/ajukan/sukses?resi=${res.data.resi}${isLoket ? "&loket=1" : ""}`, {
      transitionTypes: ["nav-forward"],
    });
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
        if (name === "nik") {
          setNikCheck(checkFor(value.trim()));
          setMarried(null);
          setErrors((e) => ({ ...e, "applicant.nik": null })); // hasil cek terbaru menggantikan pesan lama
        }
        // Isian berubah setelah kode dikirim: kode lama terikat ke NIK & HP lama.
        if (otp && (name === "nik" || name === "phone")) setOtp(null);
      }}
      noValidate
      className={cn(
        "grid gap-6 lg:items-start",
        showKtp ? "lg:grid-cols-[1fr_24rem]" : "lg:grid-cols-[1fr_20rem]",
      )}
    >
      <div className="space-y-6">
        {/* 1. NIK lebih dulu: pemohon fiktif/di bawah umur tertolak sebelum mengisi apa pun. */}
        <section aria-labelledby="nik-title" className="rounded-card border border-line bg-surface p-5">
          <h2 id="nik-title" className="text-lg font-bold">
            1. NIK pemohon
          </h2>
          <p className="mt-1 text-sm text-muted">
            Pemohon adalah orang yang mengajukan dan bertanggung jawab atas data, minimal {APPLICANT_MIN_AGE}{" "}
            tahun (KTP-el: atau sudah/pernah kawin). Untuk dokumen anak, gunakan NIK orang tua atau wali.
          </p>
          <Field
            className="mt-3 sm:max-w-sm"
            label="NIK"
            name="nik"
            inputMode="numeric"
            autoComplete="off"
            maxLength={16}
            required
            hint="16 digit sesuai KTP-el/KK. Tidak pernah ditampilkan di halaman lacak."
            error={errors["applicant.nik"] ?? (nikCheck?.ok === false ? nikCheck.message : null)}
          />
          {nikCheck?.ok && !nikCheck.needsMarried && (
            <p role="status" className="mt-3 flex gap-2 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                NIK valid · lahir {nikCheck.birthDate} · {genderText(nikCheck.gender)} · {nikCheck.age} tahun
              </span>
            </p>
          )}
          {nikCheck?.ok && nikCheck.needsMarried && (
            <MinorKtpQuestion check={nikCheck} married={married} onAnswer={setMarried} />
          )}
        </section>

        {/* Terkunci (inert) sampai NIK valid; nilainya tetap ikut terkirim. */}
        <div
          inert={!nikOk}
          className={cn("space-y-6 transition-opacity", !nikOk && "opacity-50")}
          aria-describedby={nikOk ? undefined : "nik-title"}
        >
          {/* 2. Layanan */}
          <fieldset className="rounded-card border border-line bg-surface p-5">
            <legend className="float-left w-full text-lg font-bold">2. Pilih layanan</legend>
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
                      Verifikasi ≤ {formatWorkHours(s.steps[0]?.slaHours)} · terbit ≤{" "}
                      {formatWorkHours(s.issueSlaHours)} setelah berkas lengkap
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
            <legend className="float-left w-full text-lg font-bold">3. Persyaratan</legend>
            <p className="clear-both pt-1 text-sm text-muted">
              {isLoket
                ? "Centang dokumen yang sudah diperiksa di loket."
                : service.requiresVisit
                  ? "Layanan ini wajib datang ke loket (perekaman biometrik). Centang dokumen yang sudah Anda siapkan dan bawa aslinya saat datang."
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

          {/* 4. Data pemohon (HP: pratinjau KTP di atas isian agar terlihat sambil mengetik) */}
          {showKtp && <KtpPreview person={person} className="lg:hidden" />}
          <fieldset className="rounded-card border border-line bg-surface p-5">
            <legend className="float-left w-full text-lg font-bold">4. Data pemohon</legend>
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
                label="Nomor HP"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                hint={
                  isLoket
                    ? "4 digit terakhir dipakai untuk membuka detail resi."
                    : "Kode verifikasi dikirim ke nomor ini. 4 digit terakhirnya untuk membuka detail resi."
                }
                error={errors["applicant.phone"]}
              />
              {showKtp && <KtpFields person={person} errors={errors} marriedOnly={married === true} />}
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
                  Saya menyatakan data dan dokumen yang saya ajukan benar dan sah, serta bersedia dihubungi
                  petugas. Saya memahami bahwa memalsukan data dalam permohonan dokumen kependudukan dapat
                  dipidana{" "}
                  <span className="text-muted">
                    (Pasal 93 UU No. 23 Tahun 2006 tentang Administrasi Kependudukan)
                  </span>
                  .
                </span>
              </label>
              {errors.consent && <p className="mt-1 text-sm text-late">{errors.consent}</p>}
            </div>
          )}
        </div>
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
                <span className="shrink-0 text-muted">
                  {step.slaHours ? formatWorkHours(step.slaHours, { short: true }) : "—"}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-line pt-3 text-sm">
            Setelah berkas lengkap, dokumen terbit paling lama{" "}
            <span className="font-semibold">{formatWorkHours(service.issueSlaHours)}</span> (Permendagri
            19/2018: maks. 24 jam). Jam kerja Senin–Jumat 08.00–16.00 WIB; setiap tahap punya tenggat yang
            bisa Anda pantau.
          </p>
          {service.requiresVisit && !isLoket && (
            <p className="mt-3 rounded-xl border-l-4 border-warn bg-warn-soft/60 px-3 py-2 text-sm">
              <span className="font-semibold">Wajib datang ke loket.</span> Pengajuan online ini mendaftarkan
              data Anda lebih dulu; hitung mundur dimulai saat Anda hadir dengan dokumen asli.
            </p>
          )}
        </div>
        <Alert>{errors.form}</Alert>
        {otp ? (
          <section
            aria-labelledby="otp-title"
            className="space-y-3 rounded-card border-2 border-brand bg-surface p-5"
          >
            <h2 id="otp-title" className="flex items-center gap-2 font-bold">
              <ShieldCheck aria-hidden className="size-5 text-brand" /> Verifikasi nomor HP
            </h2>
            <p className="text-sm text-muted">
              Kode 6 digit dikirim ke{" "}
              <span className="font-mono font-semibold text-text">{otp.phoneMasked}</span>. Berlaku 5 menit.
            </p>
            {otp.demoCode && (
              <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
                Mode demo (SMS/WhatsApp belum tersambung). Kode Anda:{" "}
                <span className="font-mono font-bold tracking-widest">{otp.demoCode}</span>
              </p>
            )}
            <Field
              label="Kode verifikasi"
              name="otpCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              error={errors.otp}
            />
            <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
              {pending ? "Memeriksa…" : "Verifikasi & ajukan"}
            </button>
            <div className="flex justify-between gap-2 text-sm">
              <button
                type="submit"
                value="resend"
                disabled={pending}
                className="font-semibold text-brand hover:underline"
              >
                Kirim ulang kode
              </button>
              <button type="button" onClick={() => setOtp(null)} className="text-muted hover:underline">
                Ubah data
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Terkunci selama langkah NIK belum lolos, sama seperti isian di bawahnya. */}
            <button
              type="submit"
              disabled={pending || !nikOk}
              aria-describedby="submit-hint"
              className={buttonClass("primary", "w-full")}
            >
              {pending ? "Memeriksa…" : isLoket ? "Daftarkan & cetak resi" : "Ajukan & dapatkan resi"}
            </button>
            <p id="submit-hint" className="text-center text-xs text-muted">
              {!nikOk
                ? "Lengkapi langkah 1 (NIK pemohon) untuk melanjutkan."
                : isLoket
                  ? "Resi langsung terbit setelah data tersimpan."
                  : "Setelah menekan tombol, kode verifikasi dikirim ke nomor HP Anda."}
            </p>
          </>
        )}
      </aside>
    </form>
  );
}
