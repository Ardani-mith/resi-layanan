"use client";

import {
  AlertTriangle,
  ArrowRight,
  Baby,
  BadgeAlert,
  BadgeCheck,
  BadgeX,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  HeartHandshake,
  IdCard,
  Lock,
  type LucideIcon,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { startNavProgress } from "@/components/layout/NavProgress";
import Select from "@/components/Select";
import { Alert, buttonClass, Field, FieldMessage, inputClass, SubmitButton } from "@/components/ui";
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
import { DocumentArtFor, KtpArt } from "./DocumentArt";

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

// Pilihan pekerjaan mengikuti isian umum KTP-el (SIAK); "LAINNYA" untuk yang tidak ada di daftar.
const JOBS = [
  "BELUM/TIDAK BEKERJA",
  "MENGURUS RUMAH TANGGA",
  "PELAJAR/MAHASISWA",
  "PENSIUNAN",
  "PEGAWAI NEGERI SIPIL",
  "TENTARA NASIONAL INDONESIA",
  "KEPOLISIAN RI",
  "KARYAWAN SWASTA",
  "KARYAWAN BUMN",
  "KARYAWAN BUMD",
  "KARYAWAN HONORER",
  "WIRASWASTA",
  "PERDAGANGAN",
  "PEDAGANG",
  "PETANI/PEKEBUN",
  "PETERNAK",
  "NELAYAN/PERIKANAN",
  "BURUH HARIAN LEPAS",
  "BURUH TANI/PERKEBUNAN",
  "PEMBANTU RUMAH TANGGA",
  "TUKANG",
  "SOPIR",
  "GURU",
  "DOSEN",
  "DOKTER",
  "BIDAN",
  "PERAWAT",
  "LAINNYA",
];

/**
 * Pratinjau KTP-el yang ikut berubah saat warga mengetik. Tanggal lahir & jenis kelamin
 * dibaca dari NIK, jadi salah ketik NIK langsung terlihat.
 */
function KtpPreview({
  person,
  className,
  onDark = false,
}: {
  person: Person;
  className?: string;
  /** Di atas panel navy: keterangan putih. */
  onDark?: boolean;
}) {
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
      <figcaption className={cn("text-xs", onDark ? "text-white/65" : "text-muted")}>
        {badNik ? (
          <span className={cn("font-medium", onDark ? "text-[#ffb4ab]" : "text-late")}>
            Digit tanggal lahir di NIK (digit 7–12) tidak valid. Periksa kembali NIK Anda.
          </span>
        ) : (
          "Pratinjau KTP-el dari isian Anda. Tanggal lahir & jenis kelamin dibaca dari NIK: pastikan sesuai."
        )}
      </figcaption>
    </figure>
  );
}

/** "KEPERCAYAAN TERHADAP TUHAN YME" → "Kepercayaan terhadap Tuhan YME" (label pilihan). */
const choiceLabel = (value: string) =>
  value
    .toLowerCase()
    .replace(/^\p{L}/u, (c) => c.toUpperCase())
    .replace("tuhan yme", "Tuhan YME");

/** "KARYAWAN BUMN" → "Karyawan BUMN", "PETANI/PEKEBUN" → "Petani/Pekebun" (label pilihan pekerjaan). */
const jobLabel = (value: string) =>
  value
    .toLowerCase()
    .replace(/\p{L}+/gu, (word) =>
      ["ri", "bumn", "bumd"].includes(word) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1),
    );

const digits = (value: string) => value.replace(/\D/g, "").slice(0, 3);
const pad3 = (value: string) => (value ? value.padStart(3, "0") : "");

/**
 * RT/RW sebagai dua kotak angka (warga tidak perlu tahu format "003/005"): maks. 3 digit,
 * pindah otomatis ke RW setelah 3 digit, nol di depan ditambahkan saat kotak ditinggalkan,
 * Backspace di RW yang kosong kembali ke RT. Nilai gabungan dikirim lewat input tersembunyi
 * `rtRw`, dan dilaporkan ke `onValue` untuk pratinjau KTP.
 */
function RtRwField({ error, onValue }: { error?: string | null; onValue: (value: string) => void }) {
  const id = useId();
  const messageId = `${id}-message`;
  const [rt, setRt] = useState("");
  const [rw, setRw] = useState("");
  const rwInput = useRef<HTMLInputElement>(null);
  const rtInput = useRef<HTMLInputElement>(null);
  const value = rt || rw ? `${rt}/${rw}` : "";

  const update = (nextRt: string, nextRw: string) => {
    setRt(nextRt);
    setRw(nextRw);
    onValue(nextRt || nextRw ? `${nextRt}/${nextRw}` : "");
  };
  const box = (label: "RT" | "RW") =>
    cn(inputClass, "pl-11 font-mono tracking-wider tabular-nums", label === "RW" && "pl-12");

  return (
    <fieldset aria-describedby={error ? messageId : undefined}>
      <legend className="mb-1.5 text-sm font-medium">RT/RW</legend>
      <input type="hidden" name="rtRw" value={value} />
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-semibold text-muted">
            RT
          </span>
          <input
            ref={rtInput}
            value={rt}
            onChange={(e) => {
              const next = digits(e.target.value);
              update(next, rw);
              if (next.length === 3) rwInput.current?.focus();
            }}
            onBlur={() => update(pad3(rt), rw)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="003"
            aria-label="RT"
            aria-invalid={Boolean(error)}
            className={box("RT")}
          />
        </label>
        <span aria-hidden className="text-lg text-muted">
          /
        </span>
        <label className="relative flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-semibold text-muted">
            RW
          </span>
          <input
            ref={rwInput}
            value={rw}
            onChange={(e) => update(rt, digits(e.target.value))}
            onBlur={() => update(rt, pad3(rw))}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Backspace" && !rw) rtInput.current?.focus();
            }}
            inputMode="numeric"
            autoComplete="off"
            placeholder="005"
            aria-label="RW"
            aria-invalid={Boolean(error)}
            className={box("RW")}
          />
        </label>
      </div>
      <FieldMessage id={messageId} error={error} />
    </fieldset>
  );
}

/** Isian khusus KTP-el (dicetak di kartu). */
function KtpFields({
  person,
  errors,
  marriedOnly,
  onValue,
}: {
  person: Person;
  errors: FormErrors;
  /** Pemohon di bawah 17 tahun yang sudah menjawab "sudah/pernah kawin". */
  marriedOnly: boolean;
  /** Isian kustom (dropdown, RT/RW) tidak memicu onChange form, jadi dilaporkan lewat sini. */
  onValue: (name: keyof Person, value: string) => void;
}) {
  const info = nikInfo(person.nik ?? "");
  const tooYoung = info && person.marital && !ktpAgeAllowed(info.birthDate, person.marital);
  const err = (key: string) => errors[`applicant.ktp.${key}`];
  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-4">
      <Field label="Tempat lahir" name="birthPlace" required error={err("birthPlace")} />
      <Select
        label="Golongan darah"
        name="bloodType"
        options={BLOOD_TYPES.map((b) => ({ value: b, label: b === "-" ? "Tidak tahu" : b }))}
        error={err("bloodType")}
        onValueChange={(v) => onValue("bloodType", v)}
      />
      <Field
        className="sm:col-span-2"
        label="Alamat"
        name="address"
        autoComplete="street-address"
        placeholder="JL. SUDIRMAN NO. 12"
        required
        error={err("address")}
      />
      <RtRwField error={err("rtRw")} onValue={(v) => onValue("rtRw", v)} />
      <Field label="Kelurahan/Desa" name="village" required error={err("village")} />
      <Field label="Kecamatan" name="district" required error={err("district")} />
      <Select
        label="Pekerjaan"
        name="job"
        options={JOBS.map((j) => ({ value: j, label: jobLabel(j) }))}
        error={err("job")}
        onValueChange={(v) => onValue("job", v)}
      />
      <Select
        label="Agama/Kepercayaan"
        name="religion"
        options={RELIGIONS.map((r) => ({ value: r, label: choiceLabel(r) }))}
        error={err("religion")}
        onValueChange={(v) => onValue("religion", v)}
      />
      <Select
        label="Status perkawinan"
        name="marital"
        options={MARITAL_STATUSES.filter((m) => !marriedOnly || m !== "BELUM KAWIN").map((m) => ({
          value: m,
          label: choiceLabel(m),
        }))}
        onValueChange={(v) => onValue("marital", v)}
        error={
          err("marital") ??
          (tooYoung ? `Menurut NIK, pemohon belum ${KTP_MIN_AGE} tahun dan belum kawin.` : null)
        }
      />
    </div>
  );
}

/** Ulang tahun ke-17 dari "DD-MM-YYYY" → tanggal paling awal bisa membuat KTP-el (jika belum kawin). */
function eligibleFrom(birthDate: string): Date {
  const [day, month, year] = birthDate.split("-").map(Number);
  return new Date(Date.UTC(year + KTP_MIN_AGE, month - 1, day));
}

type NikState = "ok" | "error" | "pending" | null;

/** Lencana tanpa teks di kanan kolom NIK (verified biru / X merah / peringatan); teksnya untuk pembaca layar. */
function NikBadge({ state }: { state: NikState }) {
  if (!state) return null;
  const badge = {
    ok: { Icon: BadgeCheck, className: "fill-[#0866ff]", label: "Terverifikasi" },
    error: { Icon: BadgeX, className: "fill-late", label: "NIK tidak dapat dipakai" },
    pending: { Icon: BadgeAlert, className: "fill-warn", label: "Perlu jawaban di bawah" },
  }[state];
  return (
    <span key={state} role="status" className="flex motion-safe:animate-[select-in_.25s_ease-out]">
      <badge.Icon aria-hidden className={cn("size-6 text-white", badge.className)} />
      <span className="sr-only">{badge.label}</span>
    </span>
  );
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
  const options: { value: boolean; label: string; note: string; icon: LucideIcon }[] = [
    {
      value: true,
      label: "Sudah/pernah kawin",
      note: "Bawa buku nikah/akta perkawinan",
      icon: HeartHandshake,
    },
    { value: false, label: "Belum kawin", note: `Tunggu sampai ${KTP_MIN_AGE} tahun`, icon: CalendarClock },
  ];
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-line motion-safe:animate-[select-in_.25s_ease-out]">
      <div className="flex gap-3 bg-warn-soft/70 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warn text-white">
          <AlertTriangle aria-hidden className="size-4.5" />
        </span>
        <div className="text-sm">
          <p className="font-semibold">Anda masih di bawah umur {KTP_MIN_AGE} tahun</p>
          <p className="mt-0.5 text-muted">
            KTP-el untuk warga berusia {KTP_MIN_AGE} tahun, atau yang sudah/pernah kawin walau belum{" "}
            {KTP_MIN_AGE} tahun.
          </p>
        </div>
      </div>

      <fieldset className="p-4">
        <legend className="float-left mb-3 w-full text-sm font-semibold">
          Apakah pemohon sudah atau pernah kawin?
        </legend>
        <div className="clear-both grid gap-2 sm:grid-cols-2">
          {options.map(({ value, label, note, icon: Icon }) => (
            <label
              key={label}
              className="group flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm transition-colors hover:bg-surface-2 has-checked:border-brand/50 has-checked:bg-brand-soft/50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand"
            >
              <input
                type="radio"
                name="minorMarried"
                checked={married === value}
                onChange={() => onAnswer(value)}
                className="sr-only"
              />
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted transition-colors group-has-checked:bg-brand group-has-checked:text-white">
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{label}</span>
                <span className="block text-xs text-muted">{note}</span>
              </span>
            </label>
          ))}
        </div>

        {married === true && (
          <p role="status" className="mt-3 flex items-start gap-2 text-sm text-ok">
            <BadgeCheck aria-hidden className="size-5 shrink-0 fill-ok text-white" />
            Bisa dilanjutkan. Siapkan buku nikah atau akta perkawinan untuk diperiksa petugas.
          </p>
        )}
        {married === false && (
          <p
            role="status"
            className="mt-3 flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm"
          >
            <BadgeX aria-hidden className="size-5 shrink-0 fill-late text-white" />
            <span>
              Pemohon bisa mengajukan KTP-el mulai{" "}
              <span className="font-semibold">{formatDate(eligibleFrom(check.birthDate))}</span>. Sampai saat
              itu, identitas anak tercatat di Kartu Keluarga dan Kartu Identitas Anak (KIA).
            </span>
          </p>
        )}
      </fieldset>
    </div>
  );
}

/** Kode OTP yang sedang menunggu diisi (pengajuan online). */
type OtpChallenge = { id: string; phoneMasked: string; demoCode?: string };

type ApplyFormProps = {
  services: ActiveService[];
  initialSlug?: string;
  channel?: Channel;
};

/**
 * Panel kiri form (navy): layanan yang diajukan + menu ganti layanan (isian tidak diulang), fakta
 * singkat, alur tahap, dan dokumen hasil (KTP-el: pratinjau langsung dari isian).
 */
function ServicePanel({
  service,
  services,
  onSwitch,
  person,
  showKtp,
  isLoket,
}: {
  service: ActiveService;
  services: ActiveService[];
  onSwitch: (slug: string) => void;
  person: Person;
  showKtp: boolean;
  isLoket: boolean;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const { icon: Icon, blurb } = serviceMeta(service);

  // Tutup menu saat klik di luar atau Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <aside
      data-header-dark
      className="relative isolate overflow-clip bg-[linear-gradient(160deg,var(--hero-g1)_0%,var(--hero-g2)_55%,var(--hero-g3)_100%)] p-6 text-white sm:p-8"
    >
      <div className="space-y-6 lg:sticky lg:top-20">
        <div>
          <p className="text-xs font-medium tracking-wider text-white/60 uppercase">
            {isLoket ? "Didaftarkan di loket" : "Anda mengajukan"}
          </p>
          <div ref={box} className="relative mt-2">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((o) => !o)}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 text-left transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#0c1f5c]">
                <Icon aria-hidden className="size-5" />
              </span>
              <span key={service.slug} className="min-w-0 flex-1 motion-safe:animate-[fade-up_.35s_ease-out]">
                <span className="block font-semibold">{service.name}</span>
                <span className="block text-sm text-white/65">{blurb}</span>
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-white/70">
                Ganti
                <ChevronDown
                  aria-hidden
                  className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
                />
              </span>
            </button>
            <div
              id={menuId}
              role="menu"
              aria-label="Ganti layanan"
              className={cn(
                "absolute inset-x-0 top-full z-20 mt-2 rounded-2xl border border-line bg-surface p-1.5 text-text shadow-[0_24px_50px_-20px_rgb(4_10_26/0.55)] transition duration-200",
                open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1.5 opacity-0",
              )}
            >
              {services.map((s) => {
                const meta = serviceMeta(s);
                const active = s.slug === service.slug;
                return (
                  <button
                    key={s.slug}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    tabIndex={open ? 0 : -1}
                    onClick={() => {
                      onSwitch(s.slug);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
                        active ? "bg-brand text-white" : "bg-surface-2 text-muted",
                      )}
                    >
                      <meta.icon aria-hidden className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{s.name}</span>
                      <span className="block text-xs text-muted">{meta.blurb}</span>
                    </span>
                    {active && <Check aria-hidden className="size-4 text-brand" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <ul className="flex flex-wrap gap-1.5 text-xs font-medium">
          <li className="rounded-full bg-ok-soft px-2.5 py-1 text-ok">Gratis</li>
          <li className="rounded-full bg-white/10 px-2.5 py-1">
            Terbit ± {formatWorkHours(service.issueSlaHours)}
          </li>
          <li className="rounded-full bg-white/10 px-2.5 py-1">
            {service.requiresVisit ? "Wajib datang ke loket" : "Bisa online"}
          </li>
        </ul>

        {/* Alur tahap: titik + garis, waktu di kanan. Desktop terbuka; HP dilipat agar form cepat terlihat. */}
        <ol key={service.slug} className="hidden motion-safe:animate-[fade-up_.35s_ease-out] lg:block">
          {service.steps.map((step, i) => {
            const last = i === service.steps.length - 1;
            return (
              <li key={step.key} className="relative flex gap-3 pb-3 text-sm last:pb-0">
                {!last && (
                  <span aria-hidden className="absolute top-3.5 bottom-0 left-[3.5px] w-px bg-white/20" />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "relative mt-1.5 size-2 shrink-0 rounded-full",
                    i === 0 ? "bg-white/40" : last ? "bg-[#4cc79a]" : "bg-[#8fb0ff]",
                  )}
                />
                <span className="flex min-w-0 flex-1 justify-between gap-3">
                  <span>{step.name}</span>
                  <span className="shrink-0 font-mono text-xs text-white/60 tabular-nums">
                    {step.slaHours ? formatWorkHours(step.slaHours, { short: true }) : "—"}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <details className="group rounded-xl bg-white/10 px-3 py-2.5 text-sm lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
            Lihat alur ({service.steps.length} tahap)
            <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <ol className="mt-3">
            {service.steps.map((step, i) => {
              const last = i === service.steps.length - 1;
              return (
                <li key={step.key} className="relative flex gap-3 pb-3 text-sm last:pb-0">
                  {!last && (
                    <span aria-hidden className="absolute top-3.5 bottom-0 left-[3.5px] w-px bg-white/20" />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      "relative mt-1.5 size-2 shrink-0 rounded-full",
                      i === 0 ? "bg-white/40" : last ? "bg-[#4cc79a]" : "bg-[#8fb0ff]",
                    )}
                  />
                  <span className="flex min-w-0 flex-1 justify-between gap-3">
                    <span>{step.name}</span>
                    <span className="shrink-0 font-mono text-xs text-white/60 tabular-nums">
                      {step.slaHours ? formatWorkHours(step.slaHours, { short: true }) : "—"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </details>

        {service.requiresVisit && !isLoket && (
          <p className="rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white/85">
            <span className="font-semibold text-white">Wajib datang ke loket.</span> Pengajuan online
            mendaftarkan data Anda lebih dulu; hitung mundur dimulai saat Anda hadir dengan dokumen asli.
          </p>
        )}

        {/* KTP-el: pratinjau kartu dari isian; layanan lain: dokumen hasil sebagai ilustrasi (desktop;
            di HP pratinjau KTP pindah ke atas isian data pemohon). */}
        {showKtp ? (
          <KtpPreview person={person} onDark className="hidden lg:block" />
        ) : (
          <div
            aria-hidden
            className="mx-auto hidden w-3/5 max-w-60 drop-shadow-[0_18px_30px_rgb(4_10_26/0.45)] lg:block"
          >
            <DocumentArtFor slug={service.slug} />
          </div>
        )}

        <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 pt-4 text-xs text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <Lock aria-hidden className="size-3.5" /> NIK disimpan terenkripsi
          </span>
          <span>Resi langsung terbit · Jam kerja Senin–Jumat 08.00–16.00 WIB</span>
        </p>
      </div>
    </aside>
  );
}

/** Ikon & deskripsi singkat kartu pilihan layanan (layanan bawaan); layanan baru memakai nama hasilnya. */
function serviceMeta(service: ActiveService): { icon: LucideIcon; blurb: string } {
  const { slug } = service;
  if (slug.includes("ktp")) return { icon: IdCard, blurb: "Rekam data untuk KTP pertama" };
  if (slug.includes("kk") || slug.includes("keluarga"))
    return { icon: Users, blurb: "Ubah susunan anggota keluarga" };
  if (slug.includes("akta")) return { icon: Baby, blurb: "Catat kelahiran anak" };
  return { icon: FileText, blurb: service.output || "Layanan kependudukan" };
}

/**
 * Pemilih layanan untuk loket (petugas). Warga memilih layanan di katalog /layanan, jadi tampilan
 * pilihan layanan warga hanya satu.
 */
function ServicePicker({ services, onPick }: { services: ActiveService[]; onPick: (slug: string) => void }) {
  return (
    <section aria-labelledby="pick-title">
      <h2 id="pick-title" className="text-lg font-bold">
        Pilih layanan
      </h2>
      <p className="mt-1 text-sm text-muted">
        Setiap tahap punya tenggat dalam jam kerja yang bisa Anda pantau lewat nomor resi.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => onPick(s.slug)}
            className="group flex flex-col rounded-card border border-line bg-surface p-5 text-left transition hover:border-brand hover:shadow-card focus-visible:border-brand"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="font-semibold">{s.name}</span>
              <ArrowRight
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand"
              />
            </span>
            <span className="mt-1 line-clamp-2 text-sm text-muted">{s.description}</span>
            <span className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-4 text-xs font-medium text-brand">
              <span>Terbit ± {formatWorkHours(s.issueSlaHours)} setelah berkas lengkap</span>
              {s.requiresVisit && <span className="text-warn">Wajib datang ke loket</span>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

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
  const initial = services.find((s) => s.slug === initialSlug);
  // Tanpa layanan terpilih: tampilkan pemilih layanan dulu (bukan daftar radio di dalam form).
  const [slug, setSlug] = useState<string | undefined>(initial?.slug);
  const [checked, setChecked] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [person, setPerson] = useState<Person>({});
  // Hasil cek NIK (null = belum 16 digit). Bagian lain form terkunci sampai NIK valid.
  const [nikCheck, setNikCheck] = useState<NikCheck | null>(null);
  // Jawaban "sudah/pernah kawin?" untuk pemohon KTP-el di bawah 17 tahun (null = belum dijawab).
  const [married, setMarried] = useState<boolean | null>(null);
  const [otp, setOtp] = useState<OtpChallenge | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const service = services.find((s) => s.slug === slug);
  const isLoket = channel === "loket";
  // Pratinjau dokumen hanya untuk layanan KTP-el (isi kartunya = data pemohon sendiri).
  const showKtp = Boolean(service && needsKtpData(service.slug));

  const nikOk = Boolean(nikCheck?.ok && (!nikCheck.needsMarried || married === true));
  // Lencana di dalam kolom NIK (tanpa teks): benar, salah, atau perlu jawaban (di bawah umur).
  const nikState: NikState = nikOk
    ? "ok"
    : errors["applicant.nik"] || nikCheck?.ok === false || married === false
      ? "error"
      : nikCheck?.ok
        ? "pending"
        : null;
  const checkFor = (nik: string, serviceSlug = slug ?? "") =>
    nik.length === 16 || /\D/.test(nik) ? checkNik(nik, serviceSlug) : null;

  /** Pilih/ganti layanan. Isian form ikut kosong (form dipasang ulang), jadi semua cek direset. */
  function chooseService(next: string | undefined) {
    setSlug(next);
    setChecked([]);
    setErrors({});
    setOtp(null);
    setPerson({});
    setNikCheck(null);
    setMarried(null);
  }

  /**
   * Ganti layanan dari kartu pilihan di atas form tanpa mengulang: NIK & data pemohon tetap,
   * NIK dicek ulang untuk aturan layanan baru; hanya centang persyaratan & kode OTP yang direset.
   */
  function switchService(next: string) {
    if (next === slug) return;
    const nikInput = formRef.current?.elements.namedItem("nik");
    const nik = nikInput instanceof HTMLInputElement ? nikInput.value.trim() : "";
    setSlug(next);
    setChecked([]);
    setErrors({});
    setOtp(null);
    setNikCheck(nik ? checkFor(nik, next) : null);
    setMarried(null);
    // Warga: URL ikut layanan terpilih, supaya muat ulang/berbagi tautan membuka layanan yang sama.
    if (!isLoket) window.history.replaceState(null, "", `/ajukan?layanan=${next}`);
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
    if (!form.get("consent")) {
      local.consent = isLoket
        ? "Konfirmasi pernyataan pemohon untuk melanjutkan."
        : "Centang pernyataan ini untuk melanjutkan.";
    }
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
    startNavProgress();
    router.push(`/ajukan/sukses?resi=${res.data.resi}${isLoket ? "&loket=1" : ""}`, {
      transitionTypes: ["nav-forward"],
    });
  }

  if (!services.length) {
    return <p className="rounded-card bg-surface p-6 text-muted">Belum ada layanan yang dibuka.</p>;
  }
  if (!service) return <ServicePicker services={services} onPick={chooseService} />;

  // method="post": jika dikirim sebelum JavaScript aktif, NIK & nomor HP tidak masuk ke URL.
  // Tata letak "checkout terbelah": kiri panel navy (layanan, alur, dokumen hasil), kanan form.
  return (
    <form
      ref={formRef}
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
      aria-busy={pending}
      className="relative grid overflow-clip rounded-3xl border border-line bg-surface lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[25rem_minmax(0,1fr)]"
    >
      {/* Saat mengirim: bar berjalan di tepi atas form. */}
      {pending && (
        <span aria-hidden className="absolute inset-x-0 top-0 z-30 h-1 overflow-hidden bg-brand/15">
          <span className="block h-full w-1/3 animate-indeterminate rounded-full bg-brand" />
        </span>
      )}
      <ServicePanel
        service={service}
        services={services}
        onSwitch={switchService}
        person={person}
        showKtp={showKtp}
        isLoket={isLoket}
      />

      <div
        className={cn(
          "min-w-0 divide-y divide-line transition-opacity duration-300",
          // Isian dibekukan selama pengiriman (tombol tetap terang).
          pending && "pointer-events-none [&>*:not(:last-child)]:opacity-60",
        )}
      >
        {/* Layar lebar: NIK & persyaratan berdampingan agar form tidak memanjang ke bawah. */}
        <div className="grid divide-y divide-line xl:grid-cols-2 xl:divide-x xl:divide-y-0">
          {/* NIK lebih dulu: pemohon fiktif/di bawah umur tertolak sebelum mengisi apa pun. */}
          <section aria-labelledby="nik-title" className="p-6 sm:p-8">
            <h2 id="nik-title" className="font-semibold">
              NIK pemohon
            </h2>
            <p className="mt-1 text-sm text-muted">
              Pemohon adalah orang yang mengajukan dan bertanggung jawab atas data, minimal{" "}
              {APPLICANT_MIN_AGE} tahun (KTP-el: atau sudah/pernah kawin). Untuk dokumen anak, gunakan NIK
              orang tua atau wali.
            </p>
            <Field
              className="mt-3 w-full"
              label="NIK"
              name="nik"
              // Warga yang datang dengan layanan terpilih langsung mulai mengisi dari NIK.
              autoFocus={!isLoket}
              inputMode="numeric"
              autoComplete="off"
              maxLength={16}
              required
              hint="16 digit sesuai KTP-el/KK. Tidak pernah ditampilkan di halaman lacak."
              error={errors["applicant.nik"] ?? (nikCheck?.ok === false ? nikCheck.message : null)}
              trailing={<NikBadge state={nikState} />}
            />
            {nikCheck?.ok && nikCheck.needsMarried && (
              <MinorKtpQuestion check={nikCheck} married={married} onAnswer={setMarried} />
            )}
          </section>

          {/* Bagian di bawah NIK terkunci (inert) sampai NIK valid; nilainya tetap ikut terkirim. */}
          <fieldset
            inert={!nikOk}
            className={cn("p-6 transition-opacity sm:p-8", !nikOk && "opacity-50")}
            aria-describedby={errors.requirementsChecked ? "req-error" : undefined}
          >
            <legend className="float-left w-full font-semibold">Persyaratan</legend>
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
                  <label className="flex cursor-pointer gap-3 rounded-xl border border-line px-3 py-2.5 text-sm transition-colors hover:bg-surface-2 has-checked:border-brand/40 has-checked:bg-brand-soft/50">
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
        </div>

        <fieldset
          inert={!nikOk}
          className={cn("p-6 transition-opacity sm:p-8", !nikOk && "opacity-50")}
          aria-describedby={nikOk ? undefined : "nik-title"}
        >
          <legend className="float-left w-full font-semibold">Data pemohon</legend>
          {/* HP: pratinjau KTP tepat di atas isian, terlihat sambil mengetik. */}
          {showKtp && <KtpPreview person={person} className="clear-both pt-3 lg:hidden" />}
          {/* Layar lebar: nama, HP, email satu baris. */}
          <div className="clear-both grid gap-4 pt-3 sm:grid-cols-2 xl:grid-cols-4">
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
              // hint={
              //   isLoket
              //     ? "4 digit terakhir untuk membuka detail resi."
              //     : "Untuk kode verifikasi; 4 digit terakhir membuka detail resi."
              // }
              error={errors["applicant.phone"]}
            />
            <Field
              label="Email (opsional)"
              name="email"
              type="email"
              autoComplete="email"
              // hint="Untuk notifikasi status."
              error={errors["applicant.email"]}
            />
            {showKtp && (
              <KtpFields
                person={person}
                errors={errors}
                marriedOnly={married === true}
                onValue={(name, value) => setPerson((p) => ({ ...p, [name]: value }))}
              />
            )}
          </div>
        </fieldset>

        {/* Penutup: pernyataan di kiri, tombol kirim di kanan (layar lebar). Saat OTP: pernyataan di atas,
            panel kode melebar penuh dan mendatar agar tidak ada ruang kosong. */}
        <div
          className={cn(
            "grid gap-6 bg-surface-2/60 p-6 sm:p-8",
            !otp && "xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start",
          )}
        >
          <div inert={!nikOk} className={cn("transition-opacity", !nikOk && "opacity-50")}>
            <label className="flex cursor-pointer gap-3 text-sm">
              <input
                type="checkbox"
                name="consent"
                className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
              />
              {/* Loket: petugas mencentang setelah pemohon menyatakannya secara lisan di depan loket. */}
              <span>
                {isLoket
                  ? "Pemohon telah menyatakan data dan dokumen yang diajukan benar dan sah, serta bersedia dihubungi petugas. Pemohon sudah diberi tahu bahwa memalsukan data dalam permohonan dokumen kependudukan dapat dipidana"
                  : "Saya menyatakan data dan dokumen yang saya ajukan benar dan sah, serta bersedia dihubungi petugas. Saya memahami bahwa memalsukan data dalam permohonan dokumen kependudukan dapat dipidana"}{" "}
                <span className="text-muted">
                  (Pasal 93 UU No. 23 Tahun 2006 tentang Administrasi Kependudukan)
                </span>
                .
              </span>
            </label>
            {errors.consent && <p className="mt-1 text-sm text-late">{errors.consent}</p>}
          </div>

          <div className="space-y-3">
            <Alert>{errors.form}</Alert>
            {otp ? (
              <section
                aria-labelledby="otp-title"
                className="rounded-2xl border border-brand/50 bg-surface p-5 shadow-[0_0_0_4px_var(--brand-soft)] motion-safe:animate-[select-in_.25s_ease-out] sm:p-6"
              >
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start lg:gap-8">
                  {/* HP: ikon + judul sebaris, keterangan & kode demo selebar panel; sm ke atas: ikon di kiri semua baris. */}
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 sm:items-start">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white sm:row-span-3">
                      <ShieldCheck aria-hidden className="size-5" />
                    </span>
                    <h2 id="otp-title" className="font-semibold sm:self-center">
                      Verifikasi nomor HP
                    </h2>
                    <p className="col-span-2 text-sm text-muted sm:col-span-1 sm:col-start-2">
                      Kode 6 digit dikirim ke{" "}
                      <span className="font-mono font-semibold whitespace-nowrap text-text">
                        {otp.phoneMasked}
                      </span>
                      . Berlaku 5 menit.
                    </p>
                    {otp.demoCode && (
                      // HP: kartu kode besar di tengah; sm ke atas: satu baris ringkas.
                      <p className="col-span-2 flex flex-col items-center gap-1 rounded-xl bg-warn-soft px-4 py-3 text-center text-warn sm:col-span-1 sm:col-start-2 sm:flex-row sm:flex-wrap sm:gap-x-2 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-left">
                        <span className="text-xs font-medium sm:text-sm sm:font-normal">
                          Mode demo · SMS/WhatsApp belum tersambung.
                          <span className="hidden sm:inline"> Kode Anda:</span>
                        </span>
                        <span className="pl-[0.4em] font-mono text-3xl font-bold tracking-[0.4em] sm:pl-0 sm:text-sm sm:tracking-widest">
                          <span className="sr-only sm:hidden">Kode Anda: </span>
                          {otp.demoCode}
                        </span>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <Field
                        className="min-w-0 flex-1"
                        label="Kode verifikasi"
                        name="otpCode"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        autoFocus
                        error={errors.otp}
                        placeholder="••••••"
                        inputClassName="h-14 text-center font-mono text-2xl tracking-[0.5em] placeholder:tracking-[0.5em] sm:h-auto sm:text-left sm:text-lg sm:tracking-[0.3em]"
                      />
                      {/* Sejajar dengan kotak isian (di bawah labelnya). */}
                      <SubmitButton
                        pending={pending}
                        pendingLabel="Memeriksa kode…"
                        icon={ShieldCheck}
                        className="min-h-12 w-full shrink-0 sm:mt-6.5 sm:min-h-0 sm:w-auto"
                      >
                        Verifikasi & ajukan
                      </SubmitButton>
                    </div>
                    <div className="mt-2 flex justify-between gap-2 text-sm">
                      <button
                        type="submit"
                        value="resend"
                        disabled={pending}
                        className="font-semibold text-brand hover:underline"
                      >
                        Kirim ulang kode
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtp(null)}
                        className="text-muted hover:underline"
                      >
                        Ubah data
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <>
                {/* Terkunci selama langkah NIK belum lolos, sama seperti isian di bawahnya. */}
                <SubmitButton
                  pending={pending}
                  pendingLabel={isLoket ? "Menyimpan…" : "Mengirim kode…"}
                  disabled={!nikOk}
                  aria-describedby="submit-hint"
                  className="min-h-12 w-full"
                >
                  {isLoket ? "Daftarkan & cetak resi" : "Ajukan & dapatkan resi"}
                </SubmitButton>
                <p id="submit-hint" className="text-center text-xs text-muted">
                  {!nikOk
                    ? "Isi NIK pemohon dulu untuk melanjutkan."
                    : isLoket
                      ? "Resi langsung terbit setelah data tersimpan."
                      : "Setelah menekan tombol, kode verifikasi dikirim ke nomor HP Anda."}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
