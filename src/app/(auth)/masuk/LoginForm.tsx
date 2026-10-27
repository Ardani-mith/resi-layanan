"use client";

import { ChevronLeft, Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ComponentPropsWithoutRef, type FormEvent, useId, useRef, useState } from "react";
import { Alert } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useResetOnHide } from "@/lib/hooks";
import { type FormErrors, formErrors, postJson } from "@/lib/http";

/** Hanya izinkan redirect ke path internal, bukan URL luar (open redirect). */
function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

/** Kolom besar berbentuk pil dengan ikon info (petunjuk muncul saat hover/fokus, juga dibaca pembaca layar). */
function PillField({
  label,
  info,
  error,
  ...props
}: { label: string; info: string; error?: string | null } & ComponentPropsWithoutRef<"input">) {
  const id = useId();
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm text-muted">
          {label}
        </label>
        <span className="group relative inline-flex">
          <button
            type="button"
            aria-describedby={`${id}-info`}
            className="rounded-full text-muted hover:text-text"
          >
            <Info aria-hidden className="size-4" />
            <span className="sr-only">Info {label}</span>
          </button>
          <span
            id={`${id}-info`}
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-60 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-text opacity-0 shadow-card transition group-focus-within:opacity-100 group-hover:opacity-100"
          >
            {info}
          </span>
        </span>
      </div>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-14 w-full rounded-2xl border border-line bg-surface px-5 text-base transition outline-none placeholder:text-muted/60 focus:border-text/40 focus:shadow-[0_0_0_4px_var(--brand-soft),0_8px_24px_-8px_rgb(15_27_45/0.18)] aria-invalid:border-late"
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-late">
          {error}
        </p>
      )}
    </div>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  // Isian untuk tiga bar progres: email valid → kata sandi terisi → sedang masuk.
  const [filled, setFilled] = useState({ email: false, password: false });
  const formRef = useRef<HTMLFormElement>(null);
  // Halaman login disembunyikan (bukan dibuang) setelah masuk: kosongkan kata sandi & tombol
  // "Memeriksa…", supaya setelah keluar form bersih dan pengguna berikutnya di komputer yang
  // sama tidak bisa masuk dengan isian orang sebelumnya.
  useResetOnHide(() => {
    formRef.current?.reset();
    setPending(false);
    setErrors({});
    setFilled({ email: false, password: false });
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

  const steps = [filled.email, filled.password, pending];

  // method="post": jika dikirim sebelum JavaScript aktif, kata sandi tidak masuk ke URL.
  return (
    <form
      ref={formRef}
      method="post"
      onSubmit={submit}
      onChange={(e) => {
        const input: EventTarget = e.target;
        if (!(input instanceof HTMLInputElement)) return;
        if (input.name === "email") setFilled((f) => ({ ...f, email: /^\S+@\S+\.\S+$/.test(input.value) }));
        if (input.name === "password") setFilled((f) => ({ ...f, password: input.value.length > 0 }));
      }}
      noValidate
      className="space-y-6"
    >
      <div aria-hidden className="grid grid-cols-3 gap-3">
        {steps.map((done, i) => (
          <span
            key={i}
            className={cn("h-1 rounded-full transition-colors duration-300", done ? "bg-ok" : "bg-line")}
          />
        ))}
      </div>

      <PillField
        label="Email"
        info="Email dinas yang didaftarkan admin. Belum punya akun? Minta admin menambahkan Anda."
        name="email"
        type="email"
        autoComplete="username"
        placeholder="nama@instansi.go.id"
        required
        error={errors.email}
      />
      <PillField
        label="Kata sandi"
        info="5 kali salah berturut-turut mengunci akun 15 menit. Lupa? Minta admin me-reset kata sandi."
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Masukkan kata sandi"
        required
        error={errors.password}
      />

      {/* Alasan keluar otomatis (IdleGuard), supaya petugas tau kenapa harus masuk lagi. */}
      {!errors.form && params.get("alasan") && (
        <Alert tone="warning">
          {params.get("alasan") === "diam"
            ? "Anda keluar otomatis karena tidak ada aktivitas selama 30 menit."
            : "Sesi berakhir (maksimal 12 jam sejak masuk). Silakan masuk lagi."}
        </Alert>
      )}
      <Alert>{errors.form}</Alert>

      <div className="flex gap-3 pt-2">
        <Link
          href="/"
          aria-label="Kembali ke beranda"
          className="grid h-14 w-20 shrink-0 place-items-center rounded-full border border-line hover:bg-surface-2"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="h-14 flex-1 rounded-full bg-text font-semibold text-surface transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Memeriksa…" : "Masuk"}
        </button>
      </div>
    </form>
  );
}
