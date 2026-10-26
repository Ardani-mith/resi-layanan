"use client";

import { ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { StatusBadge } from "@/components/application/Badges";
import { Alert, buttonClass, Field } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { type FormErrors, postJson } from "@/lib/http";
import type { Status } from "@/lib/workflow";

type Found = { resi: string; serviceName: string; status: Status; createdAt: string };
type Response =
  | { otpRequired: true; otpId: string; phoneMasked: string; demoCode?: string }
  | { otpRequired: false; applications: Found[] };

/** Lupa resi dalam dua langkah: NIK + HP → kode OTP → daftar resi. */
export default function RecoverForm() {
  const [identity, setIdentity] = useState({ nik: "", phone: "" });
  const [otp, setOtp] = useState<{ id: string; phoneMasked: string; demoCode?: string } | null>(null);
  const [found, setFound] = useState<Found[] | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);

  async function send(body: Record<string, unknown>) {
    setPending(true);
    setErrors({});
    const res = await postJson<Response>("/api/track/recover", { ...identity, ...body });
    setPending(false);
    if (!res.ok) {
      setErrors({ ...res.error.fields, form: res.error.fields.otp ? null : res.error.message });
      return;
    }
    if (res.data.otpRequired) {
      const { otpId, phoneMasked, demoCode } = res.data;
      setOtp({ id: otpId, phoneMasked, demoCode });
    } else setFound(res.data.applications);
  }

  function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const local: FormErrors = {};
    if (!/^\d{16}$/.test(identity.nik)) local.nik = "NIK harus 16 digit angka.";
    if (!identity.phone.trim()) local.phone = "Isi nomor HP yang didaftarkan.";
    if (Object.keys(local).length) return setErrors(local);
    send({});
  }

  function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    if (!/^\d{6}$/.test(code)) return setErrors({ otp: "Masukkan 6 digit kode." });
    send({ otp: { id: otp?.id, code } });
  }

  function restart() {
    setOtp(null);
    setFound(null);
    setErrors({});
  }

  if (found) {
    return (
      <section
        aria-labelledby="found-title"
        className="rounded-card border border-line bg-surface p-5 shadow-card"
      >
        <h2 id="found-title" className="text-lg font-bold">
          {found.length ? `${found.length} permohonan ditemukan` : "Tidak ada permohonan"}
        </h2>
        {found.length ? (
          <ul className="mt-3 divide-y divide-line">
            {found.map((app) => (
              <li key={app.resi}>
                <Link
                  href={`/lacak/${app.resi}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono font-bold tracking-wider">{app.resi}</span>
                    <span className="block text-sm text-muted">
                      {app.serviceName} · {formatDateTime(app.createdAt)}
                    </span>
                  </span>
                  <StatusBadge status={app.status} />
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Tidak ada permohonan dengan NIK dan nomor HP ini. Pastikan nomor HP sama dengan yang didaftarkan
            saat mengajukan.
          </p>
        )}
        <button type="button" onClick={restart} className={buttonClass("secondary", "mt-4")}>
          Cari dengan data lain
        </button>
      </section>
    );
  }

  if (otp) {
    return (
      <form
        method="post"
        onSubmit={verify}
        noValidate
        aria-labelledby="otp-title"
        className="space-y-4 rounded-card border-2 border-brand bg-surface p-5"
      >
        <h2 id="otp-title" className="flex items-center gap-2 font-bold">
          <ShieldCheck aria-hidden className="size-5 text-brand" /> Verifikasi nomor HP
        </h2>
        <p className="text-sm text-muted">
          Kode 6 digit dikirim ke <span className="font-mono font-semibold text-text">{otp.phoneMasked}</span>
          . Berlaku 5 menit.
        </p>
        {otp.demoCode && (
          <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
            Mode demo (SMS/WhatsApp belum tersambung). Kode Anda:{" "}
            <span className="font-mono font-bold tracking-widest">{otp.demoCode}</span>
          </p>
        )}
        <Field
          label="Kode verifikasi"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          error={errors.otp}
        />
        <Alert>{errors.form}</Alert>
        <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
          {pending ? "Memeriksa…" : "Tampilkan resi saya"}
        </button>
        <div className="flex justify-between gap-2 text-sm">
          <button
            type="button"
            disabled={pending}
            onClick={() => send({})}
            className="font-semibold text-brand hover:underline"
          >
            Kirim ulang kode
          </button>
          <button type="button" onClick={restart} className="text-muted hover:underline">
            Ubah NIK/nomor HP
          </button>
        </div>
      </form>
    );
  }

  // method="post": jika terkirim sebelum JavaScript aktif, NIK & HP tidak masuk ke URL.
  return (
    <form
      method="post"
      onSubmit={requestCode}
      noValidate
      className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-card"
    >
      <Field
        label="NIK pemohon"
        name="nik"
        inputMode="numeric"
        autoComplete="off"
        maxLength={16}
        value={identity.nik}
        onChange={(e) => setIdentity((v) => ({ ...v, nik: e.target.value.replace(/\D/g, "") }))}
        error={errors.nik}
      />
      <Field
        label="Nomor HP yang didaftarkan"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={identity.phone}
        onChange={(e) => setIdentity((v) => ({ ...v, phone: e.target.value }))}
        error={errors.phone}
      />
      <Alert>{errors.form}</Alert>
      <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
        {pending ? "Mengirim kode…" : "Kirim kode verifikasi"}
      </button>
    </form>
  );
}
