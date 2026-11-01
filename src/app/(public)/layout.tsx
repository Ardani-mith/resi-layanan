// Kerangka halaman warga: navbar atas, konten, footer.

import Image from "next/image";
import Link from "next/link";
import { type ComponentType, type ReactNode, Suspense } from "react";
import FooterWordmark from "@/components/layout/FooterWordmark";
import HeaderTone from "@/components/layout/HeaderTone";
import SlideLink from "@/components/layout/SlideLink";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { LogoMark, Wordmark } from "@/components/Logo";
import { buttonClass } from "@/components/ui";
import { site } from "@/config/site";
import { getCurrentUser } from "@/lib/dal";
import { homeFor, PASSWORD_PATH } from "@/lib/roles";

const linkClass =
  "shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-nav-muted transition-colors hover:text-nav-fg sm:px-3";

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
      <nav className="flex h-16 items-center gap-2 px-page">
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          aria-label={`${site.name}, beranda`}
          className="mr-auto flex shrink-0 items-center rounded-lg text-nav-fg"
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
        <ThemeToggle className="-mr-2 text-nav-muted hover:text-nav-fg" />
      </nav>
      {/* usePathname = data saat request: di dalam <Suspense> agar kerangka tetap di-prerender. */}
      <Suspense>
        <HeaderTone />
      </Suspense>
    </header>
  );
}

const footerLink = "rounded text-hero-muted transition-colors hover:text-hero-fg";

/**
 * Footer gelap selebar layar, senada dengan hero. Di beranda menyambung tanpa garis dengan CTA
 * penutup: warna dasar sama, dan pendar birunya meneruskan pendar di dasar CTA (glow-seam-*).
 * Dasar footer: wordmark "Pantas" raksasa yang sedikit terpotong.
 */
function Footer() {
  return (
    <footer
      data-header-dark
      className="relative isolate overflow-hidden bg-(--hero-g1) text-sm text-hero-muted"
    >
      <div aria-hidden className="absolute inset-0 -z-10 glow-seam-top" />
      {/* Pendar biru lembut di dasar halaman, di belakang wordmark raksasa. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-3/5 bg-[radial-gradient(ellipse_75%_100%_at_50%_100%,color-mix(in_srgb,var(--hero-g3)_38%,transparent),transparent_75%)]"
      />
      <div className="grid gap-10 px-page pt-14 pb-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div className="space-y-4">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-hero-fg">
            {site.agency}
            <span className="rounded-full border border-hero-line-strong px-2 py-0.5 text-xs font-semibold text-hero-fg">
              {site.demo.badge}
            </span>
          </p>
          <p className="max-w-md">{site.description}</p>
        </div>
        <nav aria-label="Tautan footer">
          <p className="font-mono text-xs tracking-[0.12em] text-hero-fg uppercase">Untuk warga</p>
          <ul className="mt-4 space-y-2.5">
            {[
              ["/layanan", "Layanan & syarat"],
              ["/ajukan", "Ajukan permohonan"],
              ["/lacak", "Lacak resi"],
              ["/rapor", "Rapor SLA"],
              ["/masuk", "Masuk petugas"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={footerLink}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="font-mono text-xs tracking-[0.12em] text-hero-fg uppercase">Karya untuk</p>
          <a
            href={site.event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3 rounded-lg text-hero-muted hover:text-hero-fg"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white p-1.5">
              <Image src={site.event.logo} alt="" width={29} height={32} className="h-8 w-auto" />
            </span>
            <span className="leading-tight">
              <span className="block text-xs">{site.event.competition}</span>
              <span className="block font-semibold text-hero-fg">{site.event.name}</span>
            </span>
          </a>
        </div>
      </div>
      {/* <p className="px-page pb-8 text-xs text-hero-muted/80">
        {site.demoNotice} {site.demo.note}
      </p> */}
      {/* -mb: dasar huruf sedikit terpotong tepi halaman. */}
      {/* <div className="-mb-[3.5%] px-page">
        <FooterWordmark />
      </div> */}
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
