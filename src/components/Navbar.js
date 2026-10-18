import Link from "next/link";
import { Suspense } from "react";
import LogoutButton from "@/components/LogoutButton";
import { site } from "@/config/site";
import { ROLE_LABELS } from "@/lib/roles";
import { getSession } from "@/lib/session";

const STAFF_LINKS = {
  petugas_loket: [["/kerja", "Antrean"], ["/kerja/baru", "Input loket"]],
  petugas_teknis: [["/kerja", "Antrean"]],
  pimpinan: [["/pantau", "Pantau"], ["/kerja", "Antrean"]],
  admin: [["/admin/demo", "Mode demo"], ["/pantau", "Pantau"], ["/kerja", "Antrean"]],
};

const linkClass =
  "shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-muted hover:bg-surface-2 hover:text-text sm:px-3";

/** Label pendek di HP, lengkap di layar lebar. */
function Label({ short, full }) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </>
  );
}

function GuestLinks() {
  return (
    <>
      <Link href="/rapor" className={linkClass}><Label short="Rapor" full="Rapor SLA" /></Link>
      <Link href="/ajukan" className={linkClass}>Ajukan</Link>
      <Link href="/masuk" className={linkClass}><Label short="Masuk" full="Masuk petugas" /></Link>
    </>
  );
}

// Membaca cookie = data saat request; di Cache Components harus di dalam <Suspense>
// supaya kerangka navbar tetap bisa di-prerender.
async function SessionLinks() {
  const user = await getSession();
  if (!user) return <GuestLinks />;
  return (
    <>
      {(STAFF_LINKS[user.role] ?? []).map(([href, label]) => (
        <Link key={href} href={href} className={linkClass}>{label}</Link>
      ))}
      <span className="hidden px-2 text-xs text-muted sm:inline">
        {user.name} · {ROLE_LABELS[user.role]}
      </span>
      <LogoutButton className={linkClass} />
    </>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/" className="mr-auto flex shrink-0 items-center gap-2 font-bold tracking-tight whitespace-nowrap">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand text-sm text-on-brand">RL</span>
          <span className="hidden min-[360px]:inline">{site.name}</span>
        </Link>
        <div className="-mr-2 flex min-w-0 items-center gap-0.5 overflow-x-auto">
          <Suspense fallback={<GuestLinks />}>
            <SessionLinks />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}
