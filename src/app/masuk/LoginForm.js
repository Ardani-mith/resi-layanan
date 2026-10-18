"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import Field from "@/components/ui/Field";

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
    setPending(true);
    setErrors({});
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrors({ ...body.error.fields, form: body.error.fields ? null : body.error.message });
        return;
      }
      router.replace(safeNext(params.get("next")) ?? body.data.home);
      router.refresh();
    } catch {
      setErrors({ form: "Tidak bisa terhubung ke server. Periksa koneksi Anda." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="username" required error={errors.email} />
      <Field label="Kata sandi" name="password" type="password" autoComplete="current-password" required error={errors.password} />
      {errors.form && (
        <p role="alert" className="rounded-xl bg-late-soft px-3 py-2 text-sm text-late">{errors.form}</p>
      )}
      <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
        {pending ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
