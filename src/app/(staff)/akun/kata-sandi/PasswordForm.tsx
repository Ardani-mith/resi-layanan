"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert, buttonClass, Field } from "@/components/ui";
import { type FormErrors, formErrors, postJson } from "@/lib/http";
import { PASSWORD_MIN } from "@/lib/roles";

export default function PasswordForm({ temporary }: { temporary: boolean }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setPending(true);
    setErrors({});
    setDone(false);

    const res = await postJson<{ home: string }>("/api/auth/password", {
      currentPassword: form.get("currentPassword"),
      newPassword: form.get("newPassword"),
      confirmPassword: form.get("confirmPassword"),
    });
    if (!res.ok) {
      setErrors(formErrors(res.error));
      setPending(false);
      return;
    }
    if (temporary) {
      // Kata sandi sementara sudah diganti: lanjut ke halaman kerja sesuai peran. Navigasi penuh,
      // bukan router.replace: cache router masih menyimpan pengalihan /kerja → kata sandi dari
      // sesi lama, dan top bar perlu dirender ulang dengan menu lengkap.
      window.location.replace(res.data.home);
      return;
    }
    formEl.reset();
    setPending(false);
    setDone(true);
  }

  // method="post": jika dikirim sebelum JavaScript aktif, kata sandi tidak masuk ke URL.
  return (
    <form method="post" onSubmit={submit} noValidate className="space-y-4">
      <Field
        label={temporary ? "Kata sandi sementara" : "Kata sandi saat ini"}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        error={errors.currentPassword}
      />
      <Field
        label="Kata sandi baru"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        required
        hint={`Minimal ${PASSWORD_MIN} karakter. Frasa beberapa kata mudah diingat & sulit ditebak.`}
        error={errors.newPassword}
      />
      <Field
        label="Ulangi kata sandi baru"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />
      <Alert>{errors.form}</Alert>
      {done && <Alert tone="success">Kata sandi berhasil diganti.</Alert>}
      <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
        {pending ? "Menyimpan…" : "Simpan kata sandi baru"}
      </button>
    </form>
  );
}
