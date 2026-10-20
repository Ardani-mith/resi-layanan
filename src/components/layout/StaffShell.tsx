"use client";

// Kerangka area petugas: sidebar di kiri (Sidebar.tsx), header konten + konten di kanan.

import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, Fragment, type ReactNode, Suspense, use, useState } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { crumbsFor } from "@/config/staff-nav";

type Drawer = { open: boolean; setOpen: (open: boolean) => void };
const DrawerContext = createContext<Drawer>({ open: false, setOpen: () => {} });

/** Status laci menu (HP): dibuka tombol di header, dirender oleh sidebar. */
export function useDrawer(): Drawer {
  return use(DrawerContext);
}

export default function StaffShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <DrawerContext value={{ open, setOpen }}>
      <div className="flex min-h-dvh bg-surface">{children}</div>
    </DrawerContext>
  );
}

// --- Header konten ------------------------------------------------------------------

const iconButton =
  "grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text";

function Breadcrumbs() {
  const crumbs = crumbsFor(usePathname());
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => {
          const isCurrent = i === crumbs.length - 1;
          return (
            <Fragment key={crumb.href}>
              {i > 0 && (
                <li aria-hidden>
                  <ChevronRight className="size-3.5 text-muted" />
                </li>
              )}
              <li className={isCurrent ? "min-w-0 truncate" : "hidden shrink-0 sm:block"}>
                {isCurrent ? (
                  <span aria-current="page" className="font-semibold">
                    {crumb.label}
                  </span>
                ) : crumb.link ? (
                  <Link href={crumb.href} className="font-medium text-muted hover:text-text">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-muted">{crumb.label}</span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/** Header konten area petugas: menu (HP), maju/mundur riwayat, breadcrumb, tombol tema. */
export function ContentHeader() {
  const router = useRouter();
  const { open, setOpen } = useDrawer();
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-4 md:px-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
        aria-expanded={open}
        className={`${iconButton} -ml-1.5 md:hidden`}
      >
        <Menu aria-hidden className="size-5" />
      </button>
      <div className="hidden sm:flex">
        <button type="button" onClick={() => router.back()} aria-label="Kembali" className={iconButton}>
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <button type="button" onClick={() => router.forward()} aria-label="Maju" className={iconButton}>
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
      <span aria-hidden className="mx-1 hidden h-5 w-px bg-line sm:block" />
      {/* usePathname pada route dinamis (/kerja/[resi]) wajib di dalam Suspense (Cache Components). */}
      <Suspense>
        <Breadcrumbs />
      </Suspense>
      <ThemeToggle className="ml-auto" />
    </header>
  );
}
