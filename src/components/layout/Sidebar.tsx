"use client";

import { ChevronsLeft, LogOut, type LucideIcon, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useDrawer } from "@/components/layout/StaffShell";
import { site } from "@/config/site";
import { activeHref, FOOTER_LINKS, navFor, type NavItem } from "@/config/staff-nav";
import { cn } from "@/lib/cn";
import { postJson } from "@/lib/http";
import { homeFor, ROLE_LABELS } from "@/lib/roles";
import type { SessionUser } from "@/lib/users";

type SidebarUser = Pick<SessionUser, "name" | "role" | "mustChangePassword">;

// md di Tailwind: di atas lebar ini sidebar tampil tetap, di bawahnya jadi laci.
const DESKTOP = "(min-width: 48rem)";

function itemClass(collapsed: boolean, active = false): string {
  return cn(
    "group relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text",
    active && "bg-surface-2 text-text",
    collapsed && "justify-center px-0",
  );
}

function ItemContent({
  icon: Icon,
  label,
  collapsed,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  active?: boolean;
}) {
  return (
    <>
      <Icon
        aria-hidden
        className={cn("size-4.5 shrink-0", active ? "text-brand" : "text-muted group-hover:text-text")}
      />
      <span className={cn("flex-1 truncate text-left", collapsed && "sr-only")}>{label}</span>
    </>
  );
}

function NavLink({
  item,
  collapsed,
  active,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={itemClass(collapsed, active)}
    >
      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />}
      <ItemContent icon={item.icon} label={item.label} collapsed={collapsed} active={active} />
    </Link>
  );
}

function UserCard({ user, collapsed }: { user: SidebarUser; collapsed: boolean }) {
  const initials = user.name
    .split(/\s+/)
    .filter((part) => /^\p{L}/u.test(part)) // lewati gelar seperti "Drs."
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      title={collapsed ? `${user.name} · ${ROLE_LABELS[user.role]}` : undefined}
      className={cn(
        "mt-2 flex items-center gap-2.5 rounded-lg bg-surface-2 p-1.5",
        collapsed && "justify-center",
      )}
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-xs font-bold text-brand"
      >
        {initials}
      </span>
      <div className={cn("min-w-0 leading-tight", collapsed && "sr-only")}>
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="truncate text-xs text-muted">{ROLE_LABELS[user.role]}</p>
      </div>
    </div>
  );
}

/** Tombol keluar: hapus sesi lalu kembali ke beranda warga. */
function LogoutButton({ className, children }: { className: string; children: ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await postJson("/api/auth/logout");
    router.replace("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={pending} aria-busy={pending} className={className}>
      {children}
    </button>
  );
}

/** Isi sidebar; dipakai bersama oleh sidebar tetap (desktop) dan laci (HP). */
function SidebarContent({
  user,
  collapsed = false,
  onToggle,
  onClose,
}: {
  user: SidebarUser;
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  // Kata sandi sementara: menu kerja disembunyikan sampai kata sandi diganti.
  const sections = user.mustChangePassword ? [] : navFor(user.role);
  const current = activeHref(pathname, [
    ...sections.flatMap((section) => section.items.map((item) => item.href)),
    ...FOOTER_LINKS.map((link) => link.href),
  ]);

  return (
    <>
      <div className={cn("flex items-center justify-between gap-2 px-1 pt-1 pb-3", collapsed && "flex-col")}>
        <Link
          href={homeFor(user.role)}
          onClick={onClose}
          className="flex min-w-0 items-center gap-2 rounded-lg font-bold tracking-tight"
        >
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-sm text-on-brand"
          >
            RL
          </span>
          <span className={cn("truncate", collapsed && "sr-only")}>{site.name}</span>
        </Link>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
            aria-expanded={!collapsed}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
          >
            <ChevronsLeft
              aria-hidden
              className={cn("size-4 transition-transform", collapsed && "rotate-180")}
            />
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>

      <nav aria-label="Menu utama" className="-mx-3 flex-1 overflow-y-auto border-t border-line px-3">
        {sections.map((section, i) => (
          <section key={section.title} aria-label={section.title}>
            {collapsed ? (
              // Bagian pertama sudah dibatasi garis atas <nav>.
              <hr className={cn("mx-2 mb-2 border-line", i === 0 ? "mt-2 border-transparent" : "mt-4")} />
            ) : (
              <h2 className="px-3 pt-4 pb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
                {section.title}
              </h2>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    collapsed={collapsed}
                    active={item.href === current}
                    onNavigate={onClose}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <ul className="mt-3 space-y-0.5 border-t border-line pt-3">
        {FOOTER_LINKS.map((link) => (
          <li key={link.href}>
            <NavLink item={link} collapsed={collapsed} active={link.href === current} onNavigate={onClose} />
          </li>
        ))}
        <li>
          <LogoutButton className={itemClass(collapsed)}>
            <ItemContent icon={LogOut} label="Keluar" collapsed={collapsed} />
          </LogoutButton>
        </li>
      </ul>

      <UserCard user={user} collapsed={collapsed} />
    </>
  );
}

/**
 * Sidebar area petugas. Desktop: tetap di kiri dan bisa diciutkan jadi ikon saja.
 * HP: laci dari <dialog> modal (fokus terkunci di dalam, Esc/klik luar menutup).
 */
export default function Sidebar({ user }: { user: SidebarUser }) {
  const [collapsed, setCollapsed] = useState(false);
  const { open, setOpen } = useDrawer();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Layar melebar saat laci terbuka (mis. HP diputar): tutup, sidebar tetap sudah tampil.
  useEffect(() => {
    const media = window.matchMedia(DESKTOP);
    const onChange = () => media.matches && setOpen(false);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [setOpen]);

  const close = () => setOpen(false);

  return (
    <>
      <aside
        aria-label="Sidebar petugas"
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col p-3 transition-[width] duration-200 md:flex",
          collapsed ? "w-19" : "w-64",
        )}
      >
        <SidebarContent user={user} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </aside>

      <dialog
        ref={dialogRef}
        aria-label="Menu petugas"
        onClose={close}
        // Klik di backdrop (di luar panel) mengenai elemen <dialog> itu sendiri.
        onClick={(event) => event.target === event.currentTarget && close()}
        className="m-0 h-dvh max-h-dvh w-72 max-w-[85vw] bg-surface p-0 text-text shadow-xl backdrop:bg-black/40 open:flex md:hidden"
      >
        <div className="flex w-full flex-col p-3">
          {open && <SidebarContent user={user} onClose={close} />}
        </div>
      </dialog>
    </>
  );
}
