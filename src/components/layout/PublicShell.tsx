// Kerangka halaman warga: navbar atas, konten, footer.

import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { LogoMark, Wordmark } from "@/components/Logo";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";
import { getCurrentUser } from "@/lib/dal";
import { homeFor, PASSWORD_PATH } from "@/lib/roles";

const linkClass =
  "shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-muted hover:bg-surface-2 hover:text-text sm:px-3";

/** Label pendek di HP, lengkap di layar lebar. */
function Label({ short, full }: { short: string; full: string }) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </>
  );
}

/** Menu warga, sama untuk semua pengunjung (bagian statis navbar). */
function PublicLinks() {
  return (
    <>
      <Link href="/layanan" className={linkClass}>
        Layanan
      </Link>
      <Link href="/rapor" className={linkClass}>
        <Label short="Rapor" full="Rapor SLA" />
      </Link>
      <Link href="/ajukan" className={linkClass}>
        Ajukan
      </Link>
    </>
  );
}

const loginLink = (
  <Link href="/masuk" className={linkClass}>
    <Label short="Masuk" full="Masuk petugas" />
  </Link>
);

// Membaca cookie = data saat request; di Cache Components harus di dalam <Suspense>
// supaya kerangka navbar tetap bisa di-prerender. Menu kerja petugas ada di sidebar
// area petugas; di halaman warga cukup satu jalan kembali ke sana.
async function SessionLink() {
  const user = await getCurrentUser();
  if (!user) return loginLink;
  return (
    <Link
      href={user.mustChangePassword ? PASSWORD_PATH : homeFor(user.role)}
      className={cn(linkClass, "text-brand hover:text-brand")}
    >
      <Label short="Dasbor" full="Dasbor petugas" />
    </Link>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link
          href="/"
          aria-label={`${site.name}, beranda`}
          className="mr-auto flex shrink-0 items-center rounded-lg"
        >
          {/* HP sempit: ikon saja agar menu & tombol tema muat. */}
          <LogoMark className="min-[430px]:hidden" />
          <Wordmark className="text-[1.6rem] max-[429px]:hidden" />
        </Link>
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
          <PublicLinks />
          <Suspense fallback={loginLink}>
            <SessionLink />
          </Suspense>
        </div>
        <ThemeToggle className="-mr-2" />
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted sm:flex-row sm:justify-between">
        <p>
          <span className="font-semibold text-text">{site.name}</span> · {site.agency}
        </p>
        <p>{site.demoNotice}</p>
      </div>
    </footer>
  );
}

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
