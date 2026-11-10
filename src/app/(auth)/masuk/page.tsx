import { ArrowRight, Hourglass, LockKeyhole, Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/Logo";
import { site } from "@/config/site";
import LoginFlow from "./LoginFlow";
import LoginForm from "./LoginForm";

// Grup (auth): tanpa navbar & footer warga, fokus ke formulir. Jalan kembali = "← Beranda" di
// pojok kiri atas (dan tombol ← di formulir).
export const metadata = { title: "Masuk petugas" };

/** Hanya aturan yang relevan saat masuk; peran & tenggat sudah dijelaskan oleh diagram alur. */
const FACTS = [
  { icon: Hourglass, label: "Sesi", value: "30 menit diam", note: "keluar otomatis; maks. 12 jam" },
  {
    icon: LockKeyhole,
    label: "Salah kata sandi",
    value: "5× → kunci 15 menit",
    note: "melindungi akun dari tebakan",
  },
];

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg p-4 sm:p-6">
      {/* Pola "checkout terbelah" seperti form pengajuan: kiri panel navy, kanan formulir. */}
      <div className="grid flex-1 overflow-clip rounded-3xl border border-line bg-surface shadow-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <aside
          data-header-dark
          className="relative isolate flex flex-col gap-8 overflow-clip bg-[linear-gradient(160deg,var(--hero-g1)_0%,var(--hero-g2)_55%,var(--hero-g3)_100%)] p-6 text-white sm:p-10"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_80%_10%,rgb(143_176_255/0.25),transparent_70%)]"
          />
          <Link
            href="/"
            className="flex w-max items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-white"
          >
            <LogoMark className="size-10 bg-white text-[#0c1f5c]" />
            <span className="text-sm text-white/70">
              <span className="block font-semibold text-white">{site.name}</span>
              {site.agency}
            </span>
          </Link>

          <div>
            <p className="text-xs font-medium tracking-wider text-white/60 uppercase">Area petugas</p>
            <p className="mt-2 max-w-md text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
              Kerjakan antrean dengan tenggat yang jelas.
            </p>
            <p className="mt-3 max-w-md text-sm text-white/70">
              Setiap tindakan tercatat di audit log yang tidak bisa diubah.
            </p>
          </div>

          {/* Diagram alur di tengah sisa ruang; keamanan akun di dasar panel. */}
          <div className="my-auto hidden lg:block">
            <LoginFlow />
          </div>

          <div className="hidden lg:block">
            <p className="text-xs font-medium tracking-wider text-white/60 uppercase">Keamanan akun</p>
            <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#e2e7f0] shadow-[0_18px_40px_-20px_rgb(4_10_26/0.6)]">
              {FACTS.map(({ icon: Icon, label, value, note }) => (
                <div key={label} className="bg-white p-4 text-[#0f1b2d]">
                  <dt className="flex items-center gap-2 text-xs text-[#5d6779]">
                    <Icon aria-hidden className="size-3.5 text-[#2156d9]" />
                    {label}
                  </dt>
                  <dd className="mt-1 font-semibold">{value}</dd>
                  <dd className="text-xs text-[#5d6779]">{note}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-white/60">
              Lupa kata sandi atau akun terkunci? Minta admin me-reset; kata sandi sementara wajib diganti
              saat pertama masuk.
            </p>
          </div>
        </aside>

        {/* Kanan: formulir di tengah. */}
        <div className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-lg">
            <h1 className="text-3xl font-semibold tracking-tight">Masuk petugas</h1>
            <p className="mt-2 text-muted">Untuk petugas loket, petugas teknis, pimpinan, dan admin.</p>
            <div className="mt-8">
              {/* useSearchParams (?next=) adalah data saat request → wajib di dalam Suspense. */}
              <Suspense>
                <LoginForm />
              </Suspense>
            </div>
            <Link
              href="/lacak"
              className="group mt-8 flex items-center gap-3 rounded-xl border border-line p-3 text-sm transition-colors hover:bg-surface-2"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                <Search aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Anda warga?</span>
                <span className="block text-muted">Tidak perlu akun: lacak dengan nomor resi.</span>
              </span>
              <ArrowRight
                aria-hidden
                className="size-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
