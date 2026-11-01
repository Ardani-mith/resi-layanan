// Komponen UI dasar yang dipakai di banyak halaman. Semuanya aman untuk Server
// Component (tanpa state); form client cukup mengimpornya.

import Link from "next/link";
import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ReactNode,
  Suspense,
  useId,
  ViewTransition,
} from "react";
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
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
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

/** Isi halaman 404; kerangkanya (navbar atau top bar) berasal dari layout group. */
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

// --- Kepala halaman & label bagian (identitas "dokumen" halaman warga) ----------------

/** Label bagian: pil kecil berisi nomor mono + nama, senada dengan badge di hero beranda. */
export function SectionLabel({
  index,
  className,
  children,
}: {
  index: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs tracking-[0.12em] text-muted uppercase shadow-card",
        className,
      )}
    >
      <span className="text-brand">{index}</span>
      <span aria-hidden className="h-3 w-px bg-line" />
      <span>{children}</span>
    </p>
  );
}

/** Kepala halaman warga: label kop + judul besar + pengantar, selaras dengan beranda. */
export function PageHeader({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header>
      <SectionLabel index="§">{label}</SectionLabel>
      <h1 className="mt-5 text-[clamp(2rem,5vw,2.9rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance">
        {title}
      </h1>
      {children && <p className="mt-3 max-w-2xl text-lg text-muted">{children}</p>}
    </header>
  );
}

// --- Transisi halaman -----------------------------------------------------------------

const SLIDE = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

/**
 * Konten halaman yang bergeser berarah saat navigasi bertipe "nav-forward" (masuk lebih dalam /
 * maju di menu: geser ke kiri) atau "nav-back" (kembali: geser ke kanan). Navigasi lain (tombol
 * back browser, refresh) tanpa animasi. Taruh di page.tsx, bukan layout (layout tidak berganti).
 */
export function PageSlide({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ViewTransition enter={SLIDE} exit={SLIDE} default="none">
      <div className={className}>{children}</div>
    </ViewTransition>
  );
}

/** `<Suspense>` dengan reveal: saat data tiba, kerangka turun & memudar, isi naik masuk. */
export function SuspenseReveal({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="slide-down" default="none">
          {fallback}
        </ViewTransition>
      }
    >
      <ViewTransition enter="slide-up" default="none">
        {children}
      </ViewTransition>
    </Suspense>
  );
}
