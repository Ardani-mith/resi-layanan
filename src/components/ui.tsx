// Komponen UI dasar yang dipakai di banyak halaman. Semuanya aman untuk Server
// Component (tanpa state); form client cukup mengimpornya.

import Link from "next/link";
import { type ComponentProps, type ComponentPropsWithoutRef, type ReactNode, useId } from "react";
import { cn } from "@/lib/cn";
import { DAY_MS } from "@/lib/sla";

// --- Tombol -------------------------------------------------------------------------

const BUTTON_VARIANTS = {
  primary: "bg-brand text-on-brand hover:bg-brand-strong",
  secondary: "border border-line bg-surface text-text hover:bg-surface-2",
  danger: "bg-late text-surface hover:opacity-90",
  ghost: "text-brand hover:bg-brand-soft",
  // Tombol garis di atas latar hero & penutup landing page.
  hero: "border border-hero-line-strong text-hero-fg hover:bg-hero-soft",
};
export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

/** Class tombol; `extra` boleh kondisional dan menimpa bawaan bila bentrok (mis. "w-full", "px-6"). */
export function buttonClass(variant: ButtonVariant = "primary", ...extra: Parameters<typeof cn>): string {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    BUTTON_VARIANTS[variant],
    ...extra,
  );
}

type ButtonProps = { variant?: ButtonVariant; className?: string } & (
  | ({ href: string } & Omit<ComponentProps<typeof Link>, "href" | "className">)
  | ({ href?: undefined } & Omit<ComponentProps<"button">, "className">)
);

/** Tombol, atau tautan bergaya tombol jika diberi `href`. */
export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  if (props.href !== undefined) return <Link {...props} className={buttonClass(variant, className)} />;
  return <button type="button" {...props} className={buttonClass(variant, className)} />;
}

// --- Pesan --------------------------------------------------------------------------

const ALERT_TONES = {
  error: "bg-late-soft text-late",
  success: "bg-ok-soft font-medium text-ok",
  warning: "border border-warn bg-warn-soft font-medium text-warn",
};

/**
 * Pesan singkat di dalam form/halaman. Error diumumkan segera ke pembaca layar
 * (role="alert"); sukses & peringatan diumumkan sopan (role="status").
 * Tidak merender apa pun jika `children` kosong.
 */
export function Alert({
  tone = "error",
  className,
  children,
}: {
  tone?: keyof typeof ALERT_TONES;
  className?: string;
  children?: ReactNode;
}) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-xl px-3 py-2 text-sm", ALERT_TONES[tone], className)}
    >
      {children}
    </p>
  );
}

/** Penanda jelas bahwa jam sistem sedang digeser (mode demo), agar tidak dikira data asli. */
export function DemoClockBanner({ offsetMs }: { offsetMs: number }) {
  if (!offsetMs) return null;
  const days = Math.round((offsetMs / DAY_MS) * 10) / 10;
  return (
    <p
      role="status"
      className="rounded-xl border border-warn bg-warn-soft px-4 py-2 text-sm font-medium text-warn"
    >
      Mode demo: jam sistem dimajukan {days > 0 ? "+" : ""}
      {days.toLocaleString("id-ID")} hari dari waktu nyata.
    </p>
  );
}

// --- Isian form ---------------------------------------------------------------------

type FieldProps = {
  label: string;
  error?: string | null;
  hint?: string;
  className?: string;
  /** "select" untuk pilihan (isi `<option>` lewat children), "textarea" untuk teks panjang. */
  as?: "input" | "select" | "textarea";
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"input">, "className" | "children">;

/** Input berlabel dengan pesan error yang terhubung lewat aria-describedby. */
export function Field({ label, error, hint, className = "", as = "input", ...props }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const control = {
    id,
    "aria-invalid": Boolean(error),
    "aria-describedby": error || hint ? messageId : undefined,
    className:
      "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-brand aria-invalid:border-late",
  };
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {as === "select" ? (
        <select {...control} {...(props as ComponentPropsWithoutRef<"select">)} />
      ) : as === "textarea" ? (
        <textarea
          {...control}
          className={cn(control.className, "min-h-24 py-2")}
          {...(props as ComponentPropsWithoutRef<"textarea">)}
        />
      ) : (
        <input {...control} {...props} />
      )}
      {(error || hint) && (
        <p id={messageId} className={cn("mt-1 text-sm", error ? "text-late" : "text-muted")}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

// --- Keadaan halaman ----------------------------------------------------------------

/** Placeholder fallback <Suspense> selama data request-time di-stream. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-96 animate-pulse rounded-card bg-surface", className)}
      aria-busy="true"
      aria-label="Memuat"
    />
  );
}

/** Isi halaman 404; kerangkanya (navbar atau sidebar) berasal dari layout group. */
export function NotFoundView({
  title = "Halaman tidak ditemukan",
  body = "Alamat yang Anda buka tidak ada atau sudah dipindahkan.",
  href = "/",
  action = "Kembali ke beranda",
}: {
  title?: string;
  body?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-2 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">{body}</p>
      <Button href={href} className="mt-6">
        {action}
      </Button>
    </div>
  );
}
