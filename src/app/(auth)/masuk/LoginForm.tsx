"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { Alert, buttonClass, Field } from "@/components/ui";
import { useResetOnHide } from "@/lib/hooks";
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
  const formRef = useRef<HTMLFormElement>(null);
  // Halaman login disembunyikan (bukan dibuang) setelah masuk: kosongkan kata sandi & tombol
  // "Memeriksa…", supaya setelah keluar form bersih dan pengguna berikutnya di komputer yang
  // sama tidak bisa masuk dengan isian orang sebelumnya.
  useResetOnHide(() => {
    formRef.current?.reset();
    setPending(false);
    setErrors({});
  });

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
    <form ref={formRef} method="post" onSubmit={submit} noValidate className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="username" required error={errors.email} />
      <Field
        label="Kata sandi"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={errors.password}
      />
      {/* Alasan keluar otomatis (IdleGuard), supaya petugas tahu kenapa harus masuk lagi. */}
      {!errors.form && params.get("alasan") && (
        <Alert tone="warning">
          {params.get("alasan") === "diam"
            ? "Anda keluar otomatis karena tidak ada aktivitas selama 30 menit."
            : "Sesi berakhir (maksimal 12 jam sejak masuk). Silakan masuk lagi."}
        </Alert>
      )}
      <Alert>{errors.form}</Alert>
      <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
        {pending ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
