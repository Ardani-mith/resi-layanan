"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { postJson } from "@/lib/http";

/** Hanya izinkan redirect ke path internal, bukan URL luar (open redirect). */
function safeNext(value) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setErrors({});

    const res = await postJson("/api/auth/login", {
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!res.ok) {
      const { fields, message } = res.error;
      setErrors({ ...fields, form: Object.keys(fields).length ? null : message });
      setPending(false);
      return;
    }
    // pending dibiarkan true sampai halaman tujuan terbuka, supaya tombol tidak bisa diklik ulang.
    router.replace(safeNext(params.get("next")) ?? res.data.home);
    router.refresh();
  }

  // method="post": jika dikirim sebelum JavaScript aktif, kata sandi tidak masuk ke URL.
  return (
    <form method="post" onSubmit={submit} noValidate className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="username" required error={errors.email} />
      <Field
        label="Kata sandi"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={errors.password}
      />
      <Alert>{errors.form}</Alert>
      <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
        {pending ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
