"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import Timeline from "@/components/Timeline";
import { buttonClass } from "@/components/ui/Button";
import { formatDate, formatDateTime } from "@/lib/format";

const REFRESH_MS = 20_000;
const OPEN = ["diajukan", "diproses", "siap_diambil", "perlu_perbaikan"];

/** POST ke /api/track/[resi]; mengembalikan { data } atau { error: { message, fields } }. */
async function trackAction(resi, body) {
  try {
    const res = await fetch(`/api/track/${resi}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch {
    return { error: { message: "Tidak bisa terhubung ke server. Periksa koneksi Anda." } };
  }
}

function CopyResi({ resi }) {
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
    <button type="button" onClick={copy} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft">
      {copied ? "Tersalin ✓" : "Salin"}
    </button>
  );
}

/** Input 4 digit terakhir HP, dipakai ulang oleh semua aksi warga. */
function Last4Field({ value, onChange, error, id }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">4 digit terakhir nomor HP pemohon</label>
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
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-late">{error}</p>}
    </div>
  );
}

function Banner({ tone, title, children }) {
  const tones = {
    late: "border-late bg-late-soft",
    pause: "border-pause bg-pause-soft",
    ok: "border-ok bg-ok-soft",
    reject: "border-late bg-late-soft",
  };
  return (
    <section className={`rounded-card border-l-4 p-4 ${tones[tone]}`}>
      <h2 className="font-bold">{title}</h2>
      <div className="mt-1 text-sm">{children}</div>
    </section>
  );
}

function FormError({ errors, action }) {
  if (!errors.form || errors.formAction !== action) return null;
  return <p role="alert" className="w-full rounded-xl bg-late-soft px-3 py-2 text-sm text-late">{errors.form}</p>;
}

export default function TrackView({ data, serverNow, offsetMs }) {
  const router = useRouter();
  const [last4, setLast4] = useState("");
  const [detail, setDetail] = useState(null); // hasil verifikasi HP
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");

  const isOpen = OPEN.includes(data.status);

  // Status diperbarui otomatis selama permohonan masih berjalan (mis. petugas baru menyelesaikan tahap).
  useEffect(() => {
    if (!isOpen) return undefined;
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [isOpen, router]);

  async function send(action, extra = {}) {
    if (!/^\d{4}$/.test(last4)) {
      setErrors({ phoneLast4: "Masukkan 4 digit terakhir nomor HP." });
      return false;
    }
    setPending(action);
    setErrors({});
    const body = await trackAction(data.resi, { action, phoneLast4: last4, ...extra });
    setPending(null);
    if (body.error) {
      const fields = body.error.fields ?? {};
      // Error per-field tampil di field-nya; selebihnya di bawah form yang dikirim.
      setErrors({ ...fields, form: fields.phoneLast4 ? null : body.error.message, formAction: action });
      return false;
    }
    setDetail(body.data);
    if (action !== "verify") router.refresh();
    return true;
  }

  const verified = Boolean(detail);
  const current = data.steps[data.currentStep];

  return (
    <div className="space-y-5">
      {/* Ringkasan */}
      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <p className="font-mono text-sm tracking-wider text-muted">{data.resi}</p>
          <CopyResi resi={data.resi} />
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{data.serviceName}</h1>
        <div className="mt-3">
          <StatusBadge status={data.status} late={data.isLate} size="lg" />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-muted">
              {data.status === "selesai" ? "Selesai" : data.status === "ditolak" ? "Ditolak" : "Perkiraan selesai"}
            </dt>
            <dd className="text-base font-semibold">
              {data.completedAt
                ? formatDate(data.completedAt)
                : data.estimatedCompletion
                  ? formatDate(data.estimatedCompletion)
                  : "Menunggu perbaikan berkas"}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-muted">Tahap saat ini</dt>
            <dd className="font-semibold">{data.status === "selesai" ? "Semua tahap selesai" : data.currentStepName}</dd>
          </div>
          <div>
            <dt className="text-muted">Pemohon</dt>
            <dd className="font-medium">{detail?.applicant.name ?? data.applicantMasked}</dd>
          </div>
          <div>
            <dt className="text-muted">Diajukan</dt>
            <dd className="font-medium">{formatDateTime(data.createdAt)}</dd>
            <dd className="text-muted">{data.channel === "loket" ? "Lewat loket" : "Online"}</dd>
          </div>
        </dl>
      </section>

      {/* Situasi khusus */}
      {data.isLate && (
        <Banner tone="late" title={`Tahap "${current?.name}" melewati tenggat`}>
          Keterlambatan ini tercatat dan {data.isEscalated ? "sudah diteruskan otomatis" : "akan diteruskan"} ke
          atasan petugas. Anda tidak perlu melapor ulang.
        </Banner>
      )}

      {data.status === "ditolak" && (
        <Banner tone="reject" title="Permohonan ditolak">
          <p className="font-medium">{data.rejectionReason}</p>
          <p className="mt-2 text-muted">Jika alasan ini keliru, datangi loket dengan membawa nomor resi.</p>
        </Banner>
      )}

      {data.status === "siap_diambil" && (
        <Banner tone="ok" title="Dokumen siap diambil">
          Datang ke loket Disdukcapil pada jam kerja dengan menunjukkan nomor resi dan KTP-el/KK asli.
        </Banner>
      )}

      {data.status === "perlu_perbaikan" && (
        <section className="rounded-card border-l-4 border-pause bg-pause-soft p-4">
          <h2 className="font-bold">Berkas perlu diperbaiki</h2>
          <p className="mt-1 text-sm">{data.fixNote}</p>
          <p className="mt-2 text-sm text-muted">
            Hitung mundur instansi dihentikan sementara. Setelah berkas dilengkapi (atau dibawa ke loket),
            konfirmasi di bawah agar proses berlanjut.
          </p>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await send("resubmit")) setNotice("Terima kasih. Proses dilanjutkan dan hitung mundur berjalan kembali.");
            }}
          >
            {!verified && <Last4Field id="fix-last4" value={last4} onChange={setLast4} error={errors.phoneLast4} />}
            <button type="submit" disabled={pending === "resubmit"} className={buttonClass("primary")}>
              {pending === "resubmit" ? "Mengirim…" : "Saya sudah melengkapi berkas"}
            </button>
            <FormError errors={errors} action="resubmit" />
          </form>
        </section>
      )}

      {notice && (
        <p role="status" className="rounded-card bg-ok-soft px-4 py-3 text-sm font-medium text-ok">{notice}</p>
      )}

      {/* Timeline */}
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="mb-5 text-lg font-bold">Perjalanan permohonan</h2>
        <Timeline steps={data.steps} serverNow={serverNow} offsetMs={offsetMs} />
      </section>

      {/* Rating */}
      {data.status === "selesai" && !data.rated && (
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-lg font-bold">Bagaimana pelayanan kami?</h2>
          <p className="mt-1 text-sm text-muted">Penilaian Anda tampil di rapor SLA publik.</p>
          <form
            className="mt-4 space-y-4"
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
              <legend className="mb-1.5 text-sm font-medium">Nilai</legend>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScore(n)}
                    aria-label={`${n} bintang`}
                    aria-pressed={score === n}
                    className={`grid size-11 place-items-center rounded-xl text-2xl ${n <= score ? "text-warn" : "text-line"} hover:bg-surface-2`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {errors.score && <p className="mt-1 text-sm text-late">{errors.score}</p>}
            </fieldset>
            <div>
              <label htmlFor="comment" className="mb-1.5 block text-sm font-medium">Komentar (opsional)</label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
              />
            </div>
            {!verified && <Last4Field id="rate-last4" value={last4} onChange={setLast4} error={errors.phoneLast4} />}
            <button type="submit" disabled={pending === "rate"} className={buttonClass("primary")}>
              {pending === "rate" ? "Mengirim…" : "Kirim penilaian"}
            </button>
            <FormError errors={errors} action="rate" />
          </form>
        </section>
      )}

      {/* Detail pemohon (butuh verifikasi) */}
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="text-lg font-bold">Detail pemohon</h2>
        {verified ? (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Nama</dt><dd className="font-medium">{detail.applicant.name}</dd></div>
            <div><dt className="text-muted">Nomor HP</dt><dd className="font-mono">{detail.applicant.phoneMasked}</dd></div>
            {detail.applicant.email && <div><dt className="text-muted">Email</dt><dd>{detail.applicant.email}</dd></div>}
            <div className="sm:col-span-2">
              <dt className="text-muted">Persyaratan yang dinyatakan lengkap</dt>
              <dd>
                {detail.requirementsChecked.length ? (
                  <ul className="mt-1 list-inside list-disc">{detail.requirementsChecked.map((r) => <li key={r}>{r}</li>)}</ul>
                ) : "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              Demi privasi, nama lengkap dan data pemohon hanya tampil setelah memasukkan 4 digit terakhir nomor HP
              yang didaftarkan.
            </p>
            <form
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
        {isOpen ? "Halaman ini memperbarui status secara otomatis." : "Simpan tautan halaman ini sebagai bukti."}
      </p>
    </div>
  );
}
