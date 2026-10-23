"use client";

// Kerangka area petugas: top bar (menu sesuai peran, cari resi ⌘K, jam demo, menu akun) dan,
// di HP, tab bar bawah seperti aplikasi. Kebanyakan peran hanya punya 1–3 menu, jadi menu
// tampil sebagai tab, bukan sidebar; bagian Admin dirangkum dalam satu dropdown.

import { ChevronDown, Clock, LogOut, MoreHorizontal, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { Wordmark } from "@/components/Logo";
import { site } from "@/config/site";
import { ACCOUNT_LINKS, activeHref, ADMIN_SECTION, navFor, type NavItem } from "@/config/staff-nav";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import { postJson } from "@/lib/http";
import { isValidResi, normalizeResi } from "@/lib/resi";
import { homeFor, ROLE_LABELS } from "@/lib/roles";
import type { SessionUser } from "@/lib/users";

export type StaffUser = Pick<SessionUser, "name" | "role" | "mustChangePassword">;

/** Menu untuk `user`: tab utama + isi dropdown Admin (kosong jika masih kata sandi sementara). */
function menuFor(user: StaffUser) {
  const sections = user.mustChangePassword ? [] : navFor(user.role);
  const tabs = sections.filter((s) => s.title !== ADMIN_SECTION).flatMap((s) => s.items);
  const admin = sections.find((s) => s.title === ADMIN_SECTION)?.items ?? [];
  return { tabs, admin, all: [...tabs, ...admin] };
}

/** Tutup popover saat klik di luar `ref` atau menekan Escape. */
function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, close]);
}

const menuPanel =
  "absolute z-40 mt-2 min-w-56 rounded-xl border border-line bg-surface p-1.5 shadow-card ring-1 ring-black/5";
const menuItem =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-text hover:bg-surface-2";

function NavTab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-14 items-center px-3 text-sm font-medium transition-colors",
        active ? "text-text" : "text-muted hover:text-text",
      )}
    >
      {item.label}
      {active && <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />}
    </Link>
  );
}

function AdminMenu({ items, current }: { items: NavItem[]; current?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  const active = items.some((item) => item.href === current);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex h-14 items-center gap-1 px-3 text-sm font-medium transition-colors",
          active ? "text-text" : "text-muted hover:text-text",
        )}
      >
        {ADMIN_SECTION}
        <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        {active && <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />}
      </button>
      {open && (
        <ul className={cn(menuPanel, "top-full left-0 -mt-1")}>
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={item.href === current ? "page" : undefined}
                className={cn(menuItem, item.href === current && "bg-surface-2")}
              >
                <item.icon aria-hidden className="size-4 text-muted" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Lompat ke resi: ⌘K / Ctrl+K memfokuskan; resi lengkap → detail, teks lain → cari di antrean. */
function ResiJump() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    const resi = normalizeResi(text);
    router.push(isValidResi(resi) ? `/kerja/${resi}` : `/kerja?cari=${encodeURIComponent(text)}`);
    setValue("");
    input.current?.blur();
  }

  return (
    <form role="search" onSubmit={submit} className="relative hidden w-56 lg:block xl:w-64">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted"
      />
      <input
        ref={input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Cari resi atau nama pemohon"
        placeholder="Cari resi atau nama…"
        className="h-9 w-full rounded-lg border border-line bg-surface-2 pr-12 pl-8 text-sm outline-none placeholder:text-muted focus:border-brand focus:bg-surface"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-line bg-surface px-1.5 font-sans text-[11px] text-muted">
        ⌘K
      </kbd>
    </form>
  );
}

/** Chip jam demo (menggantikan banner): hanya tampil saat jam sistem digeser. */
function DemoChip({ offsetMs, isAdmin }: { offsetMs: number; isAdmin: boolean }) {
  if (!offsetMs) return null;
  const label = `Demo +${formatDuration(offsetMs)}`;
  const className =
    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-warn bg-warn-soft px-2.5 text-xs font-semibold text-warn";
  const title = "Mode demo: jam sistem dimajukan dari waktu nyata";
  return isAdmin ? (
    <Link href="/admin/demo" title={title} className={className}>
      <Clock aria-hidden className="size-3.5" />
      {label}
    </Link>
  ) : (
    <span role="status" title={title} className={className}>
      <Clock aria-hidden className="size-3.5" />
      {label}
    </span>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((part) => /^\p{L}/u.test(part)) // lewati gelar seperti "Drs."
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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

function AccountMenu({ user }: { user: StaffUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Menu akun ${user.name}`}
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand ring-offset-2 ring-offset-surface hover:ring-2 hover:ring-brand/40"
      >
        {initials(user.name)}
      </button>
      {open && (
        <div className={cn(menuPanel, "right-0")}>
          <div className="px-2.5 pt-1.5 pb-2">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
          </div>
          <ul className="border-t border-line pt-1">
            {ACCOUNT_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setOpen(false)} className={menuItem}>
                  <link.icon aria-hidden className="size-4 text-muted" />
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center justify-between gap-2 px-2.5 py-1 text-sm font-medium">
              Tema
              <ThemeToggle className="size-8" />
            </li>
          </ul>
          <div className="mt-1 border-t border-line pt-1">
            <LogoutButton className={cn(menuItem, "text-late hover:bg-late-soft")}>
              <LogOut aria-hidden className="size-4" />
              Keluar
            </LogoutButton>
          </div>
        </div>
      )}
    </div>
  );
}

/** Top bar area petugas. Wajib di dalam <Suspense>: usePathname pada route dinamis. */
export function StaffTopBar({ user, offsetMs }: { user: StaffUser; offsetMs: number }) {
  const pathname = usePathname();
  const { tabs, admin, all } = menuFor(user);
  const current = activeHref(
    pathname,
    all.map((item) => item.href),
  );
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-4 lg:px-6">
        <Link href={homeFor(user.role)} aria-label={site.name} className="mr-3 shrink-0">
          <Wordmark className="text-[1.35rem]" />
        </Link>
        <nav aria-label="Menu utama" className="hidden items-center md:flex">
          {tabs.map((item) => (
            <NavTab key={item.href} item={item} active={item.href === current} />
          ))}
          {admin.length > 0 && <AdminMenu items={admin} current={current} />}
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          {!user.mustChangePassword && <ResiJump />}
          <DemoChip offsetMs={offsetMs} isAdmin={user.role === "admin"} />
          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}

/** Tab bar bawah (HP): maksimal 4 menu; sisanya di "Lainnya". Wajib di dalam <Suspense>. */
export function StaffTabBar({ user }: { user: StaffUser }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, more, () => setMore(false));

  const { all } = menuFor(user);
  if (!all.length) return null;
  const visible = all.length > 4 ? all.slice(0, 3) : all;
  const rest = all.slice(visible.length);
  const current = activeHref(
    pathname,
    all.map((item) => item.href),
  );
  const tab = "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium";

  return (
    <nav
      aria-label="Menu bawah"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div ref={ref} className="relative flex">
        {visible.map((item) => {
          const active = item.href === current;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(tab, active ? "text-brand" : "text-muted")}
            >
              <item.icon aria-hidden className="size-5" />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          );
        })}
        {rest.length > 0 && (
          <>
            <button
              type="button"
              aria-expanded={more}
              onClick={() => setMore((m) => !m)}
              className={cn(tab, rest.some((i) => i.href === current) ? "text-brand" : "text-muted")}
            >
              <MoreHorizontal aria-hidden className="size-5" />
              Lainnya
            </button>
            {more && (
              <ul className={cn(menuPanel, "right-2 bottom-full mb-2")}>
                {rest.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMore(false)}
                      aria-current={item.href === current ? "page" : undefined}
                      className={cn(menuItem, item.href === current && "bg-surface-2")}
                    >
                      <item.icon aria-hidden className="size-4 text-muted" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
