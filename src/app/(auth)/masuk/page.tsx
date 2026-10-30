import { ArrowLeft, BadgeCheck, ListChecks } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { LogoMark } from "@/components/Logo";
import LoginForm from "./LoginForm";

// Grup (auth): tanpa navbar & footer warga, fokus ke formulir. Jalan kembali = "← Beranda" di
// pojok kiri atas (dan tombol ← di formulir).
export const metadata = { title: "Masuk petugas" };

/** Pratinjau yang menunggu setelah masuk: antrean sesuai peran (ilustrasi, aria-hidden). */
function QueuePreview() {
  const rows = [
    { resi: "RL-HJ26-AKTA", tone: "bg-late-soft text-late", left: "Lewat 2 jam" },
    { resi: "RL-7KQ2-MPXD", tone: "bg-warn-soft text-warn", left: "Sisa 1 jam" },
    { resi: "RL-3WZT-RB8N", tone: "bg-run-soft text-run", left: "Sisa 6 jam" },
  ];
  return (
    <div aria-hidden className="relative w-full max-w-sm">
      {/* Tooltip menempel di atas kartu, seperti referensi. */}
      <p className="relative z-10 mx-auto -mb-4 w-max max-w-[18rem] rounded-xl border border-line bg-surface px-4 py-2.5 text-center text-sm shadow-card">
        Setelah masuk, antrean sesuai peran Anda langsung terbuka.
      </p>
      <div className="rounded-[1.75rem] border border-line bg-surface/70 px-6 pt-10 pb-6 shadow-card backdrop-blur">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-surface-2 text-muted">
          <ListChecks className="size-7" />
        </span>
        <p className="mt-4 flex items-center justify-center gap-1.5 font-semibold">
          Antrean petugas loket <BadgeCheck className="size-5 text-warn" />
        </p>
        <ul className="mt-5 space-y-2">
          {rows.map((row) => (
            <li
              key={row.resi}
              className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"
            >
              <span className="font-mono text-xs tracking-wide text-muted">{row.resi}</span>
              <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${row.tone}`}>{row.left}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center justify-center gap-2">
          <span className="size-2.5 rounded-full bg-line" />
          <span className="h-1.5 w-24 rounded-full bg-line" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg px-4 py-4 sm:p-6">
      {/* <div className="mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg py-2 text-sm font-medium text-muted transition-colors hover:text-text"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Beranda
        </Link>
        <ThemeToggle />
      </div> */}
      <div className="grid flex-1 overflow-hidden rounded-[2rem] border border-line bg-surface shadow-card lg:grid-cols-2">
        {/* Kiri: formulir di tengah. */}
        <div className="flex items-center justify-center px-6 py-14 sm:px-10">
          <div className="w-full max-w-md">
            <div className="text-center">
              <LogoMark className="mx-auto" />
              <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Masuk petugas</h1>
              <p className="mt-3 text-muted">Untuk petugas loket, petugas teknis, pimpinan, dan admin.</p>
            </div>
            <div className="mt-10">
              {/* useSearchParams (?next=) adalah data saat request → wajib di dalam Suspense. */}
              <Suspense>
                <LoginForm />
              </Suspense>
            </div>
            <p className="mt-8 text-center text-sm text-muted">
              Warga tidak perlu akun: cukup lacak dengan nomor resi.
            </p>
          </div>
        </div>

        {/* Kanan (layar lebar): pratinjau antrean + keterangan, cahaya lembut di tengah. */}
        <div className="relative hidden flex-col items-center justify-center border-l border-line bg-surface-2 px-10 py-14 lg:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_40%_at_50%_45%,var(--brand-soft),transparent_70%)]"
          />
          <div className="relative flex flex-1 items-center">
            <QueuePreview />
          </div>
          <p className="relative max-w-md text-center text-sm text-muted">
            Pantas memisahkan tugas per peran: petugas hanya menindak tahap miliknya, pimpinan memantau
            eskalasi, dan setiap tindakan tercatat di audit log yang tidak bisa diubah.
          </p>
        </div>
      </div>
    </main>
  );
}
