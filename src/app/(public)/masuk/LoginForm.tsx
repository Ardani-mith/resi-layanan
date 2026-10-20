"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert, buttonClass, Field } from "@/components/ui";
import { type FormErrors, formErrors, postJson } from "@/lib/http";

/** Hanya izinkan redirect ke path internal, bukan URL luar (open redirect). */
function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setErrors({});

    const res = await postJson<{ home: string; mustChangePassword: boolean }>("/api/auth/login", {
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!res.ok) {
      setErrors(formErrors(res.error));
      setPending(false);
      return;
    }
    // pending dibiarkan true sampai halaman tujuan terbuka, supaya tombol tidak bisa diklik ulang.
    // Kata sandi sementara: selalu ke halaman ganti kata sandi dulu, abaikan ?next=.
    const { home, mustChangePassword } = res.data;
    router.replace(mustChangePassword ? home : (safeNext(params.get("next")) ?? home));
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
