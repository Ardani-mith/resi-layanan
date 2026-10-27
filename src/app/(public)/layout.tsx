// Kerangka halaman warga: navbar atas, konten, footer.

import Image from "next/image";
import Link from "next/link";
import { type ComponentType, type ReactNode, Suspense } from "react";
import SlideLink from "@/components/layout/SlideLink";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { LogoMark, Wordmark } from "@/components/Logo";
import { buttonClass } from "@/components/ui";
import { site } from "@/config/site";
import { getCurrentUser } from "@/lib/dal";
import { homeFor, PASSWORD_PATH } from "@/lib/roles";

const linkClass =
  "shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:text-text sm:px-3";

/** Label pendek di HP, lengkap di layar lebar. */
function Label({ short, full }: { short: string; full: string }) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </>
  );
}

type NavItem = ComponentType<{ href: string; className: string; children: ReactNode }>;

/**
 * Menu warga, sama untuk semua pengunjung. `SlideLink` membaca alamat sekarang untuk arah geser
 * halaman; di rute dinamis (mis. /lacak/[resi]) alamat baru diketahui saat request, jadi kerangka
 * prerender memakai `Link` biasa lewat <Suspense>.
 */
function PublicLinks({ Item = SlideLink }: { Item?: NavItem }) {
  return (
    <>
      <Item href="/layanan" className={linkClass}>
        Layanan
      </Item>
      <Item href="/rapor" className={linkClass}>
        <Label short="Rapor" full="Rapor SLA" />
      </Item>
      <Item href="/ajukan" className={linkClass}>
        Ajukan
      </Item>
    </>
  );
}

/** Satu-satunya tombol di navbar: jalan masuk petugas (menu warga tetap tautan biasa). */
const sessionButton = buttonClass("primary", "ml-1.5 min-h-9 shrink-0 px-3.5 whitespace-nowrap sm:ml-2");

const loginLink = (
  <Link href="/masuk" className={sessionButton}>
    <Label short="Masuk" full="Masuk petugas" />
  </Link>
);

// Membaca cookie = data saat request; di Cache Components harus di dalam <Suspense>
// supaya kerangka navbar tetap bisa di-prerender. Menu kerja petugas ada di top bar
// area petugas; di halaman warga cukup satu jalan kembali ke sana.
async function SessionLink() {
  const user = await getCurrentUser();
  if (!user) return loginLink;
  return (
    <Link href={user.mustChangePassword ? PASSWORD_PATH : homeFor(user.role)} className={sessionButton}>
      <Label short="Dasbor" full="Dasbor petugas" />
    </Link>
  );
}

function Navbar() {
  return (
    // viewTransitionName: navbar tidak ikut bergeser saat pindah halaman (titik acuan tetap).
    <header className="site-header sticky top-0 z-20 border-b" style={{ viewTransitionName: "site-header" }}>
      {/* Tinggi tetap h-16: hero beranda ditarik ke bawahnya (-mt-16) agar gradien menyatu. */}
      <nav className="flex h-16 items-center gap-2 px-4 lg:px-20">
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          aria-label={`${site.name}, beranda`}
          className="mr-auto flex shrink-0 items-center rounded-lg"
        >
          {/* HP sempit: ikon saja agar menu & tombol tema muat. */}
          <LogoMark className="min-[430px]:hidden" />
          <Wordmark className="text-[1.6rem] max-[429px]:hidden" />
        </Link>
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
          <Suspense fallback={<PublicLinks Item={Link} />}>
            <PublicLinks />
          </Suspense>
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
      <div className="space-y-3 px-4 py-6 text-sm text-muted lg:px-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-2">
            <span>
              <span className="font-semibold text-text">{site.name}</span> · {site.agency}
            </span>
            <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold">
              {site.demo.badge}
            </span>
          </p>
          <a
            href={site.event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg hover:text-text"
          >
            <Image src={site.event.logo} alt="" width={29} height={32} className="h-8 w-auto" />
            <span className="leading-tight">
              <span className="block text-xs">Karya untuk {site.event.competition}</span>
              <span className="block font-semibold text-text">{site.event.name}</span>
            </span>
          </a>
        </div>
        <p className="max-w-3xl text-xs">
          {site.demoNotice} {site.demo.note}
        </p>
      </div>
    </footer>
  );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
