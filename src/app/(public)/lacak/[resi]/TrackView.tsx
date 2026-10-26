"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileWarning,
  type LucideIcon,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { StatusBadge } from "@/components/application/Badges";
import OfficeMap from "@/components/application/OfficeMap";
import ReceiptCard from "@/components/application/ReceiptCard";
import Timeline from "@/components/application/Timeline";
import { Alert, Button, buttonClass, DemoClockBanner } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Tracking } from "@/lib/dal";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useAutoRefresh } from "@/lib/hooks";
import { type FormErrors, postJson } from "@/lib/http";
import type { VerifiedView } from "@/lib/present";
import type { Receipt } from "@/lib/qr";
import { OPEN_STATUSES } from "@/lib/workflow";

const REFRESH_MS = 20_000;

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
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft"
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
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        4 digit terakhir nomor HP pemohon
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        autoComplete="off"
        placeholder="••••"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="min-h-11 w-32 rounded-xl border border-line bg-surface px-3 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-brand aria-invalid:border-late"
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-late">
          {error}
        </p>
      )}
    </div>
  );
}

/** Error dari server hanya tampil di bawah form yang mengirimnya. */
type CitizenAction = "verify" | "resubmit" | "rate";

function FormError({ errors, action }: { errors: FormErrors; action: CitizenAction }) {
  return <Alert className="w-full">{errors.formAction === action && errors.form}</Alert>;
}

const TONES = {
  brand: { box: "border-brand/40", icon: "bg-brand-soft text-brand" },
  late: { box: "border-late/50", icon: "bg-late-soft text-late" },
  pause: { box: "border-pause/50", icon: "bg-pause-soft text-pause" },
  ok: { box: "border-ok/50", icon: "bg-ok-soft text-ok" },
};

/**
 * Kartu "Langkah Anda berikutnya": satu jawaban jelas untuk "lalu saya harus apa?" sesuai status.
 * Semua pesan status (terlambat, perbaikan, siap diambil, ditolak, penilaian) ada di sini, tidak
 * tersebar menjadi banner terpisah.
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
    <section
      aria-labelledby="next-title"
      className={cn("rounded-card border-2 bg-surface p-5 shadow-card", TONES[tone].box)}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn("grid size-10 shrink-0 place-items-center rounded-xl", TONES[tone].icon)}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Langkah Anda berikutnya</p>
          <h2 id="next-title" className="text-lg leading-snug font-bold">
            {title}
          </h2>
          <div className="mt-2 space-y-3 text-sm">{children}</div>
        </div>
      </div>
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

/** Tahap ke berapa dari berapa, sebagai bar bersegmen. */
function Progress({ data }: { data: Tracking }) {
  const total = data.steps.length;
  const done = data.status === "selesai" ? total : data.steps.filter((s) => s.state === "selesai").length;
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-muted">
        <span>
          {data.status === "selesai" ? "Semua tahap selesai" : `Tahap ${data.currentStep + 1} dari ${total}`}
        </span>
        <span className="tabular-nums">{Math.round((done / total) * 100)}%</span>
      </div>
      <div aria-hidden className="mt-1.5 flex gap-1">
        {data.steps.map((s, i) => (
          <span
            key={s.key}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              data.status === "selesai" || s.state === "selesai"
                ? "bg-ok"
                : i === data.currentStep
                  ? s.state === "terlambat" || s.state === "ditolak"
                    ? "bg-late"
                    : s.state === "dijeda"
                      ? "bg-pause"
                      : "bg-brand"
                  : "bg-surface-2",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Janji Permendagri 19/2018 (dokumen terbit ≤ 24 jam setelah berkas lengkap), dihitung dalam
 * jam kerja: belum dimulai, berjalan (dengan batas waktunya), ditepati, atau terlewati.
 */
function PromiseLine({ promise }: { promise: Tracking["issuePromise"] }) {
  const base = "mt-4 flex gap-2 rounded-xl px-3 py-2 text-sm";
  if (!promise) {
    return (
      <p className={cn(base, "bg-surface-2 text-muted")}>
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        Setelah berkas dinyatakan lengkap, dokumen terbit paling lama 24 jam (1 hari kerja), sesuai
        Permendagri 19/2018.
      </p>
    );
  }
  const took = formatDuration(promise.workMs);
  if (promise.issuedAt) {
    return (
      <p className={cn(base, promise.kept ? "bg-ok-soft text-ok" : "bg-late-soft text-late")}>
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        {promise.kept
          ? `Dokumen terbit ${took} kerja setelah berkas lengkap: sesuai janji ≤ 24 jam.`
          : `Dokumen terbit ${took} kerja setelah berkas lengkap: melewati janji 24 jam.`}
      </p>
    );
  }
  return (
    <p className={cn(base, promise.kept ? "bg-brand-soft text-text" : "bg-late-soft text-late")}>
      <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        {promise.kept ? "Janji terbit: paling lambat " : "Janji terbit ≤ 24 jam terlewati sejak "}
        <span className="font-semibold">{formatDateTime(promise.dueAt)}</span>
        <span className="text-muted"> · berkas lengkap {formatDateTime(promise.verifiedAt)}</span>
      </span>
    </p>
  );
}

export default function TrackView({
  data,
  serverNow,
  offsetMs,
  receipt,
}: {
  data: Tracking;
  serverNow: string;
  offsetMs: number;
  receipt: Receipt;
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
      setErrors({ phoneLast4: "Masukkan 4 digit terakhir nomor HP." });
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
  const current = data.steps[data.currentStep];
  const bring = ["Bukti resi (QR di halaman ini)", "KTP-el atau KK asli pemohon", ...data.requirements];

  function nextStep() {
    switch (data.status) {
      case "menunggu_kedatangan":
        return (
          <NextStep tone="brand" icon={MapPin} title="Datang ke loket untuk memulai proses">
            {data.arrivalDeadline && (
              <p className="rounded-xl bg-brand-soft px-3 py-2 font-medium">
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
      case "perlu_perbaikan":
        return (
          <NextStep tone="pause" icon={FileWarning} title="Berkas perlu diperbaiki">
            <blockquote className="rounded-xl bg-pause-soft px-3 py-2 font-medium">{data.fixNote}</blockquote>
            <p className="text-muted">
              Hitung mundur instansi dihentikan sementara dan tidak merugikan Anda. Lengkapi berkas langsung
              di lokasi layanan terdekat (peta di bawah), lalu konfirmasi di sini agar proses berlanjut.
            </p>
            <form
              method="post"
              className="flex flex-wrap items-end gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await send("resubmit"))
                  setNotice("Terima kasih. Proses dilanjutkan dan hitung mundur berjalan kembali.");
              }}
            >
              {!verified && (
                <Last4Field id="fix-last4" value={last4} onChange={setLast4} error={errors.phoneLast4} />
              )}
              <button type="submit" disabled={pending === "resubmit"} className={buttonClass("primary")}>
                {pending === "resubmit" ? "Mengirim…" : "Saya sudah melengkapi berkas"}
              </button>
              <FormError errors={errors} action="resubmit" />
            </form>
          </NextStep>
        );
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
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                {!verified && (
                  <Last4Field id="rate-last4" value={last4} onChange={setLast4} error={errors.phoneLast4} />
                )}
                <button type="submit" disabled={pending === "rate"} className={buttonClass("primary")}>
                  {pending === "rate" ? "Mengirim…" : "Kirim penilaian"}
                </button>
              </div>
              <FormError errors={errors} action="rate" />
            </form>
          </NextStep>
        );
      case "ditolak":
        return (
          <NextStep tone="late" icon={XCircle} title="Permohonan ditolak">
            <blockquote className="rounded-xl bg-late-soft px-3 py-2 font-medium">
              {data.rejectionReason}
            </blockquote>
            <p className="text-muted">
              Perbaiki hal di atas lalu ajukan lagi. Jika alasan ini keliru, tanyakan ke lokasi layanan dengan
              membawa nomor resi.
            </p>
            <Button href={`/ajukan?layanan=${data.serviceSlug}`}>Ajukan ulang {data.serviceName}</Button>
          </NextStep>
        );
      default:
        return data.isLate ? (
          <NextStep tone="late" icon={AlertTriangle} title={`Tahap "${current?.name}" melewati tenggat`}>
            <p>
              Keterlambatan ini tercatat dan{" "}
              {data.isEscalated ? "sudah diteruskan otomatis" : "akan diteruskan"} ke atasan petugas. Anda
              tidak perlu melapor ulang atau datang ke kantor.
            </p>
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
              . Halaman ini akan memberi tahu jika berkas perlu dilengkapi dan saat dokumen siap diambil.
            </p>
            <details className="group rounded-xl bg-surface-2 px-3 py-2">
              <summary className="cursor-pointer font-semibold">
                Siapkan dari sekarang: berkas asli yang dibawa saat pengambilan
              </summary>
              <div className="mt-2">
                <Checklist items={bring} />
              </div>
            </details>
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

  return (
    <div className="space-y-5">
      <DemoClockBanner offsetMs={offsetMs} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          {/* Ringkasan */}
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm tracking-wider text-muted">{data.resi}</p>
                  <CopyResi resi={data.resi} />
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">{data.serviceName}</h1>
              </div>
              <StatusBadge status={data.status} late={data.isLate} size="lg" />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted">
                  {data.status === "selesai"
                    ? "Selesai"
                    : data.status === "ditolak"
                      ? "Ditolak"
                      : "Perkiraan selesai"}
                </dt>
                <dd className="font-semibold">
                  {data.completedAt
                    ? formatDateTime(data.completedAt)
                    : data.estimatedCompletion
                      ? formatDateTime(data.estimatedCompletion)
                      : "Menunggu perbaikan berkas"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Tahap saat ini</dt>
                <dd className="font-semibold">
                  {data.status === "selesai" ? "Semua tahap selesai" : data.currentStepName}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Pemohon</dt>
                <dd className="font-medium">{detail?.applicant.name ?? data.applicantMasked}</dd>
              </div>
              <div>
                <dt className="text-muted">Diajukan</dt>
                <dd className="font-medium">{formatDateTime(data.createdAt)}</dd>
                <dd className="text-xs text-muted">{data.channel === "loket" ? "Lewat loket" : "Online"}</dd>
              </div>
            </dl>
            {data.status !== "ditolak" && <Progress data={data} />}
            {data.status !== "ditolak" && <PromiseLine promise={data.issuePromise} />}
          </section>

          {nextStep()}

          <Alert tone="success" className="rounded-card px-4 py-3">
            {notice}
          </Alert>

          {data.status !== "selesai" && (
            <OfficeMap
              key={data.status}
              defaultOpen={mustVisit}
              title={mapTitle ?? "Lokasi pengambilan dokumen nanti"}
            />
          )}

          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-5 text-lg font-bold">Perjalanan permohonan</h2>
            <Timeline steps={data.steps} serverNow={serverNow} offsetMs={offsetMs} />
          </section>
        </div>

        {/* Kolom samping: bukti & data pribadi, tetap terlihat saat menggulir di layar lebar. */}
        <aside className="space-y-5 lg:sticky lg:top-24">
          <ReceiptCard {...receipt} />

          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-bold">Detail pemohon</h2>
            {detail ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-muted">Nama</dt>
                  <dd className="font-medium">{detail.applicant.name}</dd>
                </div>
                <div>
                  <dt className="text-muted">Nomor HP</dt>
                  <dd className="font-mono">{detail.applicant.phoneMasked}</dd>
                </div>
                {detail.applicant.email && (
                  <div>
                    <dt className="text-muted">Email</dt>
                    <dd className="break-all">{detail.applicant.email}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted">Persyaratan yang dinyatakan lengkap</dt>
                  <dd>
                    {detail.requirementsChecked.length ? (
                      <ul className="mt-1 list-inside list-disc">
                        {detail.requirementsChecked.map((r) => (
                          <li key={r}>{r}</li>
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
                  className="mt-4 flex flex-wrap items-end gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send("verify");
                  }}
                >
                  <Last4Field id="verify-last4" value={last4} onChange={setLast4} error={errors.phoneLast4} />
                  <button type="submit" disabled={pending === "verify"} className={buttonClass("secondary")}>
                    {pending === "verify" ? "Memeriksa…" : "Tampilkan detail"}
                  </button>
                  <FormError errors={errors} action="verify" />
                </form>
              </>
            )}
          </section>

          <p className="text-center text-xs text-muted">
            {isOpen
              ? "Status diperbarui otomatis setiap 20 detik, tidak perlu memuat ulang."
              : "Simpan tautan halaman ini sebagai bukti."}
          </p>
        </aside>
      </div>
    </div>
  );
}
