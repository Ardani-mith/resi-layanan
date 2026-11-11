"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock,
  Copy,
  ExternalLink,
  FileWarning,
  Flag,
  Lock,
  type LucideIcon,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";
import { StatusBadge } from "@/components/application/Badges";
import OfficeMap from "@/components/application/OfficeMap";
import ReceiptCard from "@/components/application/ReceiptCard";
import Timeline, { FollowUpNote } from "@/components/application/Timeline";
import TrackHero from "@/components/application/TrackHero";
import CtaButton from "@/components/CtaButton";
import Select from "@/components/Select";
import {
  Alert,
  Button,
  buttonClass,
  DemoClockBanner,
  Field,
  inputClass,
  SubmitButton,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Tracking } from "@/lib/dal";
import { formatDate, formatDateTime, formatDuration } from "@/lib/format";
import { useAutoRefresh } from "@/lib/hooks";
import { type FormErrors, postJson } from "@/lib/http";
import type { VerifiedView } from "@/lib/present";
import type { Receipt } from "@/lib/qr";
import type { QuestionId } from "@/lib/validators";
import { OPEN_STATUSES, URGENCY_MAX_DAYS, URGENCY_REASONS, WAIT_WINDOW_WORKDAYS } from "@/lib/workflow";
import Assistant from "./Assistant";
import PushToggle from "./PushToggle";

const REFRESH_MS = 20_000;

const REASON_OPTIONS = Object.entries(URGENCY_REASONS).map(([value, label]) => ({ value, label }));

/** Tanggal WIB (YYYY-MM-DD) untuk batas isian tanggal, dari jam server (ikut mode demo). */
function wibDate(ms: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(ms));
}

function CopyResi({ resi }: { resi: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(resi);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard bisa ditolak browser (mis. bukan HTTPS); resi tetap terlihat untuk disalin manual.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-sans text-xs font-medium tracking-normal text-hero-accent transition-colors hover:bg-hero-soft hover:text-hero-fg"
    >
      {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
      {copied ? "Tersalin" : "Salin"}
    </button>
  );
}

/** Input 4 digit terakhir HP, dipakai ulang oleh semua aksi warga. */
function Last4Field({
  value,
  onChange,
  error,
  id,
  show = true,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  id: string;
  /** false = sudah terverifikasi: hanya tombol aksinya yang tampil. */
  show?: boolean;
  /** Tombol kirim, sebaris dengan kotak isian. */
  children: ReactNode;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  if (!show) return <div>{children}</div>;

  /** Ketik/tempel di kotak ke-i: angka mengisi dari kotak itu ke kanan, kursor ikut maju. */
  function type(i: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    const next = (value.slice(0, i) + digits).slice(0, 4);
    onChange(next);
    boxes.current[Math.min(next.length, 3)]?.focus();
  }

  // Satu aturan di semua tempat: kotak di atas, tombol di bawahnya (selebar penuh bila wadahnya
  // sempit: kolom samping, HP).
  return (
    <div className="@container">
      <label htmlFor={id} id={`${id}-label`} className="mb-1.5 block text-sm font-medium">
        4 digit terakhir nomor HP pemohon
      </label>
      <div className="flex flex-col items-start gap-3">
        <div role="group" aria-labelledby={`${id}-label`} className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              id={i === 0 ? id : undefined}
              aria-label={i === 0 ? undefined : `Digit ke-${i + 1}`}
              value={value[i] ?? ""}
              onChange={(e) => type(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !value[i] && i > 0) {
                  e.preventDefault();
                  onChange(value.slice(0, i - 1));
                  boxes.current[i - 1]?.focus();
                }
              }}
              onFocus={(e) => e.currentTarget.select()}
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
              className={cn(
                "size-11 rounded-card border bg-surface text-center font-mono text-lg font-semibold transition-colors outline-none focus:border-brand focus:ring-3 focus:ring-brand/15",
                error ? "border-late" : value[i] ? "border-muted/50" : "border-line hover:border-muted/40",
              )}
            />
          ))}
        </div>
        <div className="w-full *:w-full @sm:w-auto @sm:*:w-auto">{children}</div>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-late">
          {error}
        </p>
      )}
    </div>
  );
}

/** Error dari server hanya tampil di bawah form yang mengirimnya. */
type CitizenAction = "verify" | "resubmit" | "rate" | "urgent";

function FormError({ errors, action }: { errors: FormErrors; action: CitizenAction }) {
  return <Alert className="w-full">{errors.formAction === action && errors.form}</Alert>;
}

/** Nada status = warna ikon & label kecil di atas judul (tanpa badge/pendar). */
const TONES = { brand: "text-brand", late: "text-late", pause: "text-pause", ok: "text-ok" };

/** Kartu putih yang menumpuk di atas kepala gelap: sudut besar + bayangan lembut. */
const card = "rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-36px_rgb(15_27_45/0.5)]";

/**
 * Kartu "Langkah Anda berikutnya": satu jawaban jelas untuk "lalu saya harus apa?" sesuai status.
 * Semua pesan status (terlambat, perbaikan, siap diambil, ditolak, penilaian) ada di sini, tidak
 * tersebar menjadi banner terpisah. Sengaja polos (tanpa badge ikon/pendar): label kecil berwarna
 * status, judul, lalu isi selebar kartu.
 */
function NextStep({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: keyof typeof TONES;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="next-title" className={cn(card, "p-5 sm:p-6")}>
      <p className={cn("flex items-center gap-1.5 text-xs font-medium", TONES[tone])}>
        <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
        Langkah Anda berikutnya
      </p>
      <h2
        id="next-title"
        className="mt-1.5 text-lg leading-snug font-semibold tracking-[-0.02em] text-balance sm:text-xl"
      >
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

/** Daftar berkas ringkas (dua kolom di layar lebar). */
function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Warna bar tahap di kepala gelap. */
function barTone(data: Tracking, step: Tracking["steps"][number], i: number) {
  if (data.status === "selesai" || step.state === "selesai") return "bg-[#4ade80]";
  if (i !== data.currentStep) return "bg-white/12";
  if (step.state === "terlambat" || step.state === "ditolak") return "bg-hero-alert";
  if (step.state === "dijeda") return "bg-[#fbbf24]";
  return "bg-hero-accent";
}

/** Sisa hari kerja di bawah ini = mendesak (merah); sama dengan pengingat push H-3. */
const FIX_URGENT_DAYS = 3;

/** Satu langkah bernomor di panduan perbaikan berkas: baris dalam satu panel bergaris pemisah. */
function FixStep({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="px-4 py-4 sm:px-5">
      <h3 className="flex items-baseline gap-2.5 font-semibold">
        <span aria-hidden className="font-mono text-xs font-medium text-muted tabular-nums">
          {String(n).padStart(2, "0")}
        </span>
        <span className="sr-only">Langkah {n}: </span>
        <span className="min-w-0 leading-snug">{title}</span>
      </h3>
      <div className="mt-2.5 space-y-3">{children}</div>
    </li>
  );
}

/** Daftar bawaan yang bisa dicentang warga sebagai pengingat pribadi (tidak dikirim ke server). */
function FixChecklist({ items }: { items: string[] }) {
  const [done, setDone] = useState<string[]>([]);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 py-2 text-xs text-muted">
        <span>Bawa juga · centang sebagai pengingat, tidak dikirim</span>
        <span className="shrink-0 font-mono tabular-nums">
          {done.length}/{items.length}
        </span>
      </div>
      {/* Kisi bergaris rambut: gap-px di atas latar garis. */}
      <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
        {items.map((item) => {
          const checked = done.includes(item);
          return (
            <li key={item} className="bg-surface sm:last:odd:col-span-2">
              <label className="flex h-full cursor-pointer items-start gap-2.5 px-3 py-2.5 leading-snug transition-colors hover:bg-surface-2 has-checked:bg-ok-soft/40">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setDone((list) => (checked ? list.filter((x) => x !== item) : [...list, item]))
                  }
                  className="mt-px size-4 shrink-0 accent-[var(--ok)]"
                />
                <span className={cn(checked && "text-muted line-through")}>{item}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Tahap ke berapa dari berapa: bar bersegmen berlabel nama tahap (label disembunyikan di HP). */
function Progress({ data }: { data: Tracking }) {
  const total = data.steps.length;
  const done = data.status === "selesai" ? total : data.steps.filter((s) => s.state === "selesai").length;
  return (
    <div className="border-t border-hero-line px-5 py-4 sm:px-6">
      <div className="flex justify-between text-xs text-hero-muted">
        <span>
          {data.status === "selesai" ? "Semua tahap selesai" : `Tahap ${data.currentStep + 1} dari ${total}`}
        </span>
        <span className="font-mono tabular-nums">{Math.round((done / total) * 100)}%</span>
      </div>
      <ol
        aria-hidden
        className="mt-2.5 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      >
        {data.steps.map((s, i) => {
          const current = i === data.currentStep && data.status !== "selesai";
          return (
            <li key={s.key} className="min-w-0">
              <span className={cn("relative block h-1.5 overflow-hidden rounded-full", barTone(data, s, i))}>
                {current && (
                  <span className="absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-transparent via-white/60 to-transparent motion-safe:animate-indeterminate" />
                )}
              </span>
              <span
                className={cn(
                  "mt-2 hidden truncate text-xs sm:block",
                  current ? "font-medium text-hero-fg" : "text-hero-muted/70",
                )}
              >
                {s.name}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Janji Permendagri 19/2018 (dokumen terbit ± 24 jam setelah berkas lengkap), dihitung dalam
 * jam kerja: belum dimulai, berjalan (dengan batas waktunya), ditepati, atau terlewati.
 */
function PromiseLine({ promise }: { promise: Tracking["issuePromise"] }) {
  const base = "flex gap-2.5 border-t border-hero-line px-5 py-3.5 text-sm text-hero-muted sm:px-6";
  const icon = (tone: string) => <ShieldCheck aria-hidden className={cn("mt-0.5 size-4 shrink-0", tone)} />;
  if (!promise) {
    return (
      <p className={base}>
        {icon("text-hero-accent")}
        Setelah berkas dinyatakan lengkap, dokumen terbit paling lama 24 jam (1 hari kerja), sesuai
        Permendagri 19/2018.
      </p>
    );
  }
  const took = formatDuration(promise.workMs);
  if (promise.issuedAt) {
    return (
      <p className={base}>
        {icon(promise.kept ? "text-[#4ade80]" : "text-hero-alert")}
        <span className={promise.kept ? "text-hero-fg" : "text-hero-alert"}>
          {promise.kept
            ? `Dokumen terbit ${took} kerja setelah berkas lengkap: sesuai janji ± 24 jam.`
            : `Dokumen terbit ${took} kerja setelah berkas lengkap: melewati janji 24 jam.`}
        </span>
      </p>
    );
  }
  return (
    <p className={base}>
      {icon(promise.kept ? "text-hero-accent" : "text-hero-alert")}
      <span>
        <span className={promise.kept ? "text-hero-fg" : "text-hero-alert"}>
          {promise.kept ? "Janji terbit: paling lambat " : "Janji terbit ± 24 jam terlewati sejak "}
          <span className="font-semibold">{formatDateTime(promise.dueAt)}</span>
        </span>
        <span> · berkas lengkap {formatDateTime(promise.verifiedAt)}</span>
      </span>
    </p>
  );
}

export default function TrackView({
  data,
  serverNow,
  offsetMs,
  receipt,
  questions,
  askLimit,
  pushKey,
}: {
  data: Tracking;
  serverNow: string;
  offsetMs: number;
  receipt: Receipt;
  /** Pertanyaan template Asisten Pantas yang relevan dengan status (lib/assist.ts). */
  questions: { id: QuestionId; label: string }[];
  /** Tanya bebas Asisten Pantas: null = tidak tersedia (AI belum diatur), selain itu batas per hari. */
  askLimit: number | null;
  /** Kunci publik VAPID untuk "Kabari saya"; null = notifikasi push tidak diatur. */
  pushKey: string | null;
}) {
  const router = useRouter();
  const [last4, setLast4] = useState("");
  const [detail, setDetail] = useState<VerifiedView | null>(null); // hasil verifikasi HP
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState<CitizenAction | null>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");

  const isOpen = OPEN_STATUSES.includes(data.status);

  // Status diperbarui otomatis selama permohonan masih berjalan (mis. petugas baru menyelesaikan tahap).
  useAutoRefresh(REFRESH_MS, isOpen);

  async function send(action: CitizenAction, extra: Record<string, unknown> = {}) {
    if (!/^\d{4}$/.test(last4)) {
      setErrors({ phoneLast4: "Masukkan 4 digit terakhir nomor HP.", formAction: action });
      return false;
    }
    setPending(action);
    setErrors({});
    const res = await postJson<VerifiedView>(`/api/track/${data.resi}`, {
      action,
      phoneLast4: last4,
      ...extra,
    });
    setPending(null);
    if (!res.ok) {
      const { fields, message } = res.error;
      // Error per-field tampil di field-nya; selebihnya di bawah form yang dikirim.
      setErrors({ ...fields, form: fields.phoneLast4 ? null : message, formAction: action });
      return false;
    }
    setDetail(res.data);
    if (action !== "verify") router.refresh();
    return true;
  }

  const verified = Boolean(detail);
  // Isian 4 digit HP dipakai bersama beberapa form; error-nya hanya tampil di form yang mengirim.
  const phoneError = (action: CitizenAction) => (errors.formAction === action ? errors.phoneLast4 : null);
  const current = data.steps[data.currentStep];
  const bring = ["Bukti resi (QR di halaman ini)", "KTP-el atau KK asli pemohon", ...data.requirements];

  /**
   * Keperluan mendesak (sekali per permohonan): sinyal terstruktur untuk petugas & pimpinan,
   * pengganti "hubungi petugas". Bukan jalur percepatan; tenggat semua warga tetap sama.
   */
  function urgentFlag() {
    if (data.urgentNeededBy) {
      return (
        <p className="flex gap-2 rounded-lg border border-line bg-surface-2/60 px-3 py-2">
          <Flag aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
          <span>
            Keperluan mendesak sudah ditandai: dokumen dibutuhkan{" "}
            <span className="font-semibold">{formatDate(data.urgentNeededBy)}</span>. Petugas dan pimpinan
            melihatnya saat mengatur urutan pengerjaan.
          </span>
        </p>
      );
    }
    const today = new Date(serverNow).getTime();
    return (
      <details className="group rounded-lg border border-line bg-surface-2/60 px-3 py-2">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold">
          <Flag aria-hidden className="size-4 text-warn" />
          Dokumen dibutuhkan segera? Tandai keperluan mendesak
        </summary>
        <form
          method="post"
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const ok = await send("urgent", {
              reason: String(form.get("reason") ?? ""),
              neededBy: String(form.get("neededBy") ?? ""),
            });
            if (ok) setNotice("Keperluan mendesak sudah ditandai dan terlihat oleh petugas.");
          }}
        >
          <p className="text-muted">
            Sekali per permohonan, tanpa perlu menghubungi petugas. Ini bukan jalur percepatan: petugas dan
            pimpinan mempertimbangkannya bersama tenggat semua warga.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Keperluan" name="reason" options={REASON_OPTIONS} error={errors.reason} />
            <Field
              label="Dokumen dibutuhkan tanggal"
              name="neededBy"
              type="date"
              min={wibDate(today)}
              max={wibDate(today + URGENCY_MAX_DAYS * 86_400_000)}
              required
              error={errors.neededBy}
            />
          </div>
          <Last4Field
            id="urgent-last4"
            show={!verified}
            value={last4}
            onChange={setLast4}
            error={phoneError("urgent")}
          >
            <SubmitButton
              variant="secondary"
              icon={null}
              pending={pending === "urgent"}
              pendingLabel="Menyimpan…"
            >
              Tandai mendesak
            </SubmitButton>
          </Last4Field>
          <FormError errors={errors} action="urgent" />
        </form>
      </details>
    );
  }

  function nextStep() {
    switch (data.status) {
      case "menunggu_kedatangan":
        return (
          <NextStep tone="brand" icon={MapPin} title="Datang ke loket untuk memulai proses">
            {data.arrivalDeadline && (
              <p className="rounded-lg bg-brand-soft px-3 py-2 font-medium">
                Datang paling lambat {formatDateTime(data.arrivalDeadline)}. Lewat dari itu pendaftaran
                dibatalkan otomatis dan Anda perlu mendaftar ulang.
              </p>
            )}
            <p>
              Pendaftaran Anda tersimpan. {data.serviceName} wajib datang langsung karena ada perekaman
              biometrik (foto, sidik jari, iris) dan pemeriksaan dokumen asli. Datang pada jam kerja dan bawa:
            </p>
            <Checklist items={bring} />
            <p className="text-muted">
              Hitung mundur layanan dimulai saat Anda hadir dan berkas diperiksa, jadi waktu sebelum Anda
              datang tidak dihitung sebagai keterlambatan siapa pun. Setelah berkas lengkap, dokumen terbit
              paling lambat 1 hari kerja.
            </p>
          </NextStep>
        );
      case "perlu_perbaikan": {
        // Panduan saat dijeda: sisa waktu yang jelas, lalu tiga langkah sampai proses berlanjut.
        const left = data.fixWorkdaysLeft;
        const urgent = left !== null && left <= FIX_URGENT_DAYS;
        return (
          <NextStep tone="pause" icon={FileWarning} title="Berkas perlu diperbaiki">
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {left !== null && data.fixDeadline && (
                <div className="bg-surface-2/60 px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          "font-mono text-2xl leading-none font-semibold tabular-nums",
                          urgent && "text-late",
                        )}
                      >
                        {left}
                      </span>
                      <span className="text-muted">dari {WAIT_WINDOW_WORKDAYS} hari kerja tersisa</span>
                    </p>
                    <p className="text-xs text-muted">
                      Batas <span className="font-medium text-text">{formatDateTime(data.fixDeadline)}</span>
                    </p>
                  </div>
                  <div aria-hidden className="mt-3 flex gap-0.5">
                    {Array.from({ length: WAIT_WINDOW_WORKDAYS }, (_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1 flex-1 first:rounded-l-full last:rounded-r-full",
                          i < left ? (urgent ? "bg-late" : "bg-brand") : "bg-line",
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Lewat batas, permohonan batal otomatis. Hitung mundur instansi dijeda selama menunggu.
                  </p>
                </div>
              )}

              <ol className="divide-y divide-line">
                <FixStep n={1} title="Siapkan yang diminta petugas">
                  {/* Inti permintaan: kartu pesan bergradasi biru brand + foto profil petugas (pixel-art,
                      sama dengan denah kantor). Tetap biru di kedua tema agar selalu paling menonjol. */}
                  <figure className="relative overflow-hidden rounded-xl bg-[linear-gradient(135deg,#3b74f0_0%,#2156d9_45%,#123a9c_100%)] p-4 text-white shadow-[0_18px_36px_-22px_#2156d9] ring-1 ring-white/15 sm:p-5">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-white/15 blur-2xl"
                    />
                    {/* Ikon "penting" besar sebagai watermark latar di sisi kanan. */}
                    <CircleAlert
                      aria-hidden
                      strokeWidth={1.5}
                      className="pointer-events-none absolute top-1/2 -right-8 size-40 -translate-y-1/2 -rotate-12 text-white/10 sm:-right-6 sm:size-48"
                    />
                    <figcaption className="relative flex items-center gap-3">
                      <Image
                        src="/brand/petugas-avatar.png"
                        alt=""
                        width={44}
                        height={44}
                        className="size-11 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/70 [image-rendering:pixelated]"
                      />
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="text-sm font-semibold">Petugas Dukcapil</p>
                        <p className="mt-0.5 text-xs text-white/70">
                          Permintaan perbaikan
                          {data.fixRequestedAt && <> · {formatDateTime(data.fixRequestedAt)}</>}
                        </p>
                      </div>
                      {/* <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium ring-1 ring-white/25">
                        Wajib
                      </span> */}
                    </figcaption>
                    <blockquote className="relative mt-3.5 text-[0.95rem] leading-relaxed font-medium text-pretty sm:text-base">
                      &ldquo;{data.fixNote}&rdquo;
                    </blockquote>
                  </figure>
                  <FixChecklist items={bring} />
                </FixStep>
                <FixStep n={2} title="Lengkapi di lokasi layanan terdekat">
                  <p>
                    Datang pada jam kerja, Senin–Jumat 08.00–16.00 WIB, ke kelurahan, kecamatan, Dukcapil,
                    atau MPP terdekat. Sebutkan nomor resi <span className="font-mono">{data.resi}</span> ke
                    petugas.
                  </p>
                  <a
                    href="#lokasi"
                    className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"
                  >
                    <MapPin aria-hidden className="size-4" />
                    Lihat lokasi terdekat
                  </a>
                </FixStep>
                <FixStep n={3} title="Konfirmasi di sini setelah dilengkapi">
                  <p className="text-muted">Proses berlanjut dan hitung mundur instansi berjalan lagi.</p>
                  <form
                    method="post"
                    className="space-y-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (await send("resubmit"))
                        setNotice("Terima kasih. Proses dilanjutkan dan hitung mundur berjalan kembali.");
                    }}
                  >
                    <Last4Field
                      id="fix-last4"
                      show={!verified}
                      value={last4}
                      onChange={setLast4}
                      error={phoneError("resubmit")}
                    >
                      <SubmitButton pending={pending === "resubmit"} pendingLabel="Mengirim…">
                        Saya sudah melengkapi berkas
                      </SubmitButton>
                    </Last4Field>
                    <FormError errors={errors} action="resubmit" />
                  </form>
                </FixStep>
              </ol>
            </div>

            {pushKey && (
              <p className="flex gap-2 border-t border-line pt-3 text-xs text-muted">
                <Bell aria-hidden className="mt-px size-3.5 shrink-0" />
                Nyalakan &ldquo;Kabari saya&rdquo; di atas untuk pengingat {FIX_URGENT_DAYS} hari dan 1 hari
                kerja sebelum batas.
              </p>
            )}
          </NextStep>
        );
      }
      case "siap_diambil":
        return (
          <NextStep tone="ok" icon={PackageCheck} title="Dokumen siap diambil">
            <p>Datang ke lokasi layanan pada jam kerja dan bawa:</p>
            <Checklist items={bring.slice(0, 2)} />
            <p className="text-muted">
              Berhalangan? Pengambilan bisa diwakilkan dengan surat kuasa dan KTP-el wakil.
            </p>
          </NextStep>
        );
      case "selesai":
        return data.rated ? (
          <NextStep tone="ok" icon={CheckCircle2} title="Permohonan selesai">
            <p>Terima kasih sudah menilai layanan kami. Penilaian Anda tampil di rapor SLA publik.</p>
          </NextStep>
        ) : (
          <NextStep tone="brand" icon={Star} title="Bagaimana pelayanan kami?">
            <p className="text-muted">Permohonan selesai. Penilaian Anda tampil di rapor SLA publik.</p>
            <form
              method="post"
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!score) {
                  setErrors({ score: "Pilih 1–5 bintang." });
                  return;
                }
                if (await send("rate", { score, comment })) setNotice("Terima kasih atas penilaian Anda.");
              }}
            >
              <fieldset>
                <legend className="sr-only">Nilai</legend>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScore(n)}
                      aria-label={`${n} bintang`}
                      aria-pressed={score === n}
                      className="grid size-11 place-items-center rounded-xl hover:bg-surface-2"
                    >
                      <Star
                        aria-hidden
                        className={cn("size-7", n <= score ? "fill-warn text-warn" : "text-line")}
                      />
                    </button>
                  ))}
                </div>
                {errors.score && <p className="mt-1 text-sm text-late">{errors.score}</p>}
              </fieldset>
              <div>
                <label htmlFor="comment" className="mb-1.5 block font-medium">
                  Komentar (opsional)
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className={cn(inputClass, "py-2")}
                />
              </div>
              <Last4Field
                id="rate-last4"
                show={!verified}
                value={last4}
                onChange={setLast4}
                error={phoneError("rate")}
              >
                <SubmitButton pending={pending === "rate"} pendingLabel="Mengirim…">
                  Kirim penilaian
                </SubmitButton>
              </Last4Field>
              <FormError errors={errors} action="rate" />
            </form>
          </NextStep>
        );
      case "ditolak":
        return (
          <NextStep tone="late" icon={XCircle} title="Permohonan ditolak">
            <blockquote className="rounded-lg bg-late-soft px-3 py-2 font-medium">
              {data.rejectionReason}
            </blockquote>
            <p className="text-muted">
              Perbaiki hal di atas lalu ajukan lagi. Jika alasan ini keliru, tanyakan ke lokasi layanan dengan
              membawa nomor resi.
            </p>
            <CtaButton href={`/ajukan?layanan=${data.serviceSlug}`}>
              Ajukan ulang {data.serviceName}
            </CtaButton>
          </NextStep>
        );
      default:
        return data.isLate ? (
          <NextStep tone="late" icon={AlertTriangle} title={`Tahap "${current?.name}" melewati tenggat`}>
            {current?.followUp ? (
              <>
                <p>
                  Keterlambatan ini sudah ditindaklanjuti {current.followUp.target}. Anda tidak perlu melapor
                  ulang atau datang ke kantor.
                </p>
                <FollowUpNote followUp={current.followUp} />
              </>
            ) : (
              <p>
                Keterlambatan ini tercatat dan{" "}
                {data.isEscalated
                  ? "sudah diteruskan otomatis ke atasan petugas, menunggu tanggapannya"
                  : "akan diteruskan ke atasan petugas"}
                . Anda tidak perlu melapor ulang atau datang ke kantor.
              </p>
            )}
            {/* Sudah sampai Kepala Bidang (level 2): aduan resmi diarahkan ke kanal nasional, bukan ke loket. */}
            {data.escalationLevel >= 2 && (
              <p className="text-muted">
                Sudah diteruskan sampai Kepala Bidang tetapi belum juga selesai? Anda dapat mengadu resmi
                lewat{" "}
                <a
                  href="https://www.lapor.go.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                >
                  SP4N-LAPOR!
                  <ExternalLink aria-hidden className="size-3.5" />
                </a>{" "}
                dengan menyertakan nomor resi <span className="font-mono">{data.resi}</span>.
              </p>
            )}
            {urgentFlag()}
          </NextStep>
        ) : (
          <NextStep tone="brand" icon={Clock} title="Tidak ada yang perlu Anda lakukan sekarang">
            <p>
              Petugas sedang mengerjakan tahap <span className="font-semibold">{current?.name}</span>
              {current?.dueAt && (
                <>
                  , paling lambat <span className="font-semibold">{formatDateTime(current.dueAt)}</span>
                </>
              )}
              . Halaman ini akan memberi tau jika berkas perlu dilengkapi dan saat dokumen siap diambil.
            </p>
            <details className="group rounded-lg border border-line bg-surface-2/60 px-3 py-2">
              <summary className="cursor-pointer font-semibold">
                Siapkan dari sekarang: berkas asli yang dibawa saat pengambilan
              </summary>
              <div className="mt-2">
                <Checklist items={bring} />
              </div>
            </details>
            {urgentFlag()}
          </NextStep>
        );
    }
  }

  // Peta terbuka saat warga memang perlu datang; selain itu ringkas (bisa dibuka bila perlu).
  const mustVisit = ["menunggu_kedatangan", "perlu_perbaikan", "siap_diambil"].includes(data.status);
  const mapTitle = {
    menunggu_kedatangan: "Datang ke lokasi layanan",
    perlu_perbaikan: "Lengkapi berkas di lokasi layanan",
    siap_diambil: "Ambil dokumen di lokasi layanan",
    ditolak: "Tanyakan ke lokasi layanan",
  }[data.status as string];

  // Ringkasan di kepala gelap: label + isi per sel.
  const facts = [
    {
      label:
        data.status === "selesai" ? "Selesai" : data.status === "ditolak" ? "Ditolak" : "Perkiraan selesai",
      value: data.completedAt
        ? formatDateTime(data.completedAt)
        : data.estimatedCompletion
          ? formatDateTime(data.estimatedCompletion)
          : "Menunggu perbaikan berkas",
      strong: true,
    },
    {
      label: "Tahap saat ini",
      value: data.status === "selesai" ? "Semua tahap selesai" : data.currentStepName,
      strong: true,
    },
    { label: "Pemohon", value: detail?.applicant.name ?? data.applicantMasked },
    {
      label: "Diajukan",
      value: formatDateTime(data.createdAt),
      note: data.channel === "loket" ? "Lewat loket" : "Online",
    },
  ];

  return (
    <div>
      <TrackHero>
        <DemoClockBanner offsetMs={offsetMs} className="mb-6" />

        {/* Kiri: resi + layanan. Kanan: kembali ke cek resi, di bawahnya status + penanda pembaruan otomatis. */}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <div className="min-w-0">
            <p className="flex items-center gap-1 font-mono text-sm tracking-[0.18em] text-hero-muted">
              {data.resi}
              <CopyResi resi={data.resi} />
            </p>
            <h1 className="mt-1 text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance">
              {data.serviceName}
            </h1>
          </div>
          {/* HP: status langsung di bawah judul, tombol kembali sesudahnya. */}
          <div className="flex flex-col-reverse items-start gap-3 sm:flex-col sm:items-end">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {isOpen && pushKey && <PushToggle resi={data.resi} publicKey={pushKey} />}
              <Link
                href="/lacak"
                transitionTypes={["nav-back"]}
                className="inline-flex items-center gap-1.5 rounded-full border border-hero-line bg-hero-chip py-1.5 pr-3.5 pl-2.5 text-sm text-hero-muted backdrop-blur transition-colors hover:border-hero-line-strong hover:text-hero-fg"
              >
                <ArrowLeft aria-hidden className="size-4" />
                Lacak resi lain
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:justify-end">
              {isOpen && (
                <span className="inline-flex items-center gap-2 text-xs text-hero-muted">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full border-hero-line bg-[#4ade80] motion-safe:animate-pulse"
                  />
                  Diperbarui otomatis
                </span>
              )}
              <StatusBadge status={data.status} late={data.isLate} size="lg" onDark />
            </div>
          </div>
        </div>

        {/* Berganti status/tahap/tindak lanjut = asisten dimuat ulang (ringkasan baru). */}
        <Assistant
          key={[
            data.status,
            data.currentStep,
            data.isLate,
            data.isEscalated,
            data.steps[data.currentStep]?.followUp?.note,
          ].join("|")}
          resi={data.resi}
          questions={questions}
          canAsk={askLimit !== null}
          limit={askLimit ?? 0}
        />

        {/* Kartu kaca ringkasan: fakta utama, bar tahap, janji terbit. */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-hero-line bg-white/[0.04] shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-md">
          <dl className="grid grid-cols-2 lg:grid-cols-4 [&>div]:border-hero-line lg:[&>div:not(:first-child)]:border-l max-lg:[&>div:nth-child(even)]:border-l max-lg:[&>div:nth-child(n+3)]:border-t">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0 px-5 py-4 sm:px-6">
                <dt className="text-xs text-hero-muted">{fact.label}</dt>
                <dd
                  className={cn("mt-1 text-sm", fact.strong ? "font-semibold sm:text-base" : "font-medium")}
                >
                  {fact.value}
                </dd>
                {fact.note && <dd className="text-xs text-hero-muted">{fact.note}</dd>}
              </div>
            ))}
          </dl>
          {data.status !== "ditolak" && <Progress data={data} />}
          {data.status !== "ditolak" && <PromiseLine promise={data.issuePromise} />}
        </div>
      </TrackHero>

      {/* Isi menumpuk ke tepi bawah kepala gelap. */}
      <div className="relative -mt-14 grid gap-5 px-page pb-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          {nextStep()}

          <Alert tone="success" className="rounded-xl px-4 py-3">
            {notice}
          </Alert>

          {data.status !== "selesai" && (
            <div id="lokasi" className="scroll-mt-24">
              <OfficeMap
                key={data.status}
                defaultOpen={mustVisit}
                className={card}
                title={mapTitle ?? "Lokasi pengambilan dokumen nanti"}
              />
            </div>
          )}

          <section aria-labelledby="journey-title" className={card}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4 sm:px-6">
              <h2 id="journey-title" className="font-semibold">
                Perjalanan permohonan
              </h2>
              <p className="text-xs text-muted">
                Tenggat dihitung dalam jam kerja, Senin–Jumat 08.00–16.00 WIB
              </p>
            </div>
            <div className="p-5 sm:p-6">
              <Timeline steps={data.steps} serverNow={serverNow} offsetMs={offsetMs} />
            </div>
          </section>
        </div>

        {/* Kolom samping: bukti & data pribadi, tetap terlihat saat menggulir di layar lebar. */}
        <aside className="space-y-5 lg:sticky lg:top-24">
          <ReceiptCard {...receipt} className={card} />

          <section aria-labelledby="applicant-title" className={cn(card, "p-5")}>
            <h2 id="applicant-title" className="flex items-center gap-2 font-semibold">
              <Lock aria-hidden className="size-4 text-muted" />
              Detail pemohon
            </h2>
            {detail ? (
              <dl className="mt-3 divide-y divide-line text-sm [&>div]:py-2.5 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
                <div>
                  <dt className="text-xs text-muted">Nama</dt>
                  <dd className="font-medium">{detail.applicant.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Nomor HP</dt>
                  <dd className="font-mono">{detail.applicant.phoneMasked}</dd>
                </div>
                {detail.applicant.email && (
                  <div>
                    <dt className="text-xs text-muted">Email</dt>
                    <dd className="break-all">{detail.applicant.email}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted">Persyaratan yang dinyatakan lengkap</dt>
                  <dd>
                    {detail.requirementsChecked.length ? (
                      <ul className="mt-1.5 space-y-1">
                        {detail.requirementsChecked.map((r) => (
                          <li key={r} className="flex gap-2">
                            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">
                  Demi privasi, nama lengkap dan data pemohon tampil setelah memasukkan 4 digit terakhir nomor
                  HP.
                </p>
                <form
                  method="post"
                  className="mt-4 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send("verify");
                  }}
                >
                  <Last4Field
                    id="verify-last4"
                    value={last4}
                    onChange={setLast4}
                    error={phoneError("verify")}
                  >
                    <SubmitButton
                      variant="secondary"
                      icon={null}
                      pending={pending === "verify"}
                      pendingLabel="Memeriksa…"
                    >
                      Tampilkan detail
                    </SubmitButton>
                  </Last4Field>
                  <FormError errors={errors} action="verify" />
                </form>
              </>
            )}
          </section>

          {/* <p className="text-center text-xs text-muted">
            {isOpen
              ? "Status diperbarui otomatis setiap 20 detik, tidak perlu memuat ulang."
              : "Simpan tautan halaman ini sebagai bukti."}
          </p> */}
        </aside>
      </div>
    </div>
  );
}
