"use client";

// Kerangka area petugas. Layar lebar: sidebar kiri (instansi, cari resi ⌘K, menu per bagian,
// kartu pengguna di bawah) dan konten sebagai panel "inset" di sampingnya. Layar kecil: top bar
// ringkas + tab bar bawah seperti aplikasi.

import { Building2, ChevronsUpDown, Clock, LogOut, MoreHorizontal, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { startNavProgress } from "@/components/layout/NavProgress";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { LogoMark, Wordmark } from "@/components/Logo";
import { buttonClass } from "@/components/ui";
import { site } from "@/config/site";
import { ACCOUNT_LINKS, activeHref, navFor } from "@/config/staff-nav";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import { useResetOnHide } from "@/lib/hooks";
import { postJson } from "@/lib/http";
import { isValidResi, normalizeResi } from "@/lib/resi";
import { homeFor, ROLE_LABELS, SESSION_IDLE_SECONDS, SESSION_WARN_SECONDS } from "@/lib/roles";
import type { SessionUser } from "@/lib/users";

export type StaffUser = Pick<SessionUser, "name" | "role" | "mustChangePassword">;

/** Bagian menu untuk `user` (kosong jika masih memakai kata sandi sementara) + daftar datarnya. */
function menuFor(user: StaffUser) {
  const sections = user.mustChangePassword ? [] : navFor(user.role);
  return { sections, all: sections.flatMap((s) => s.items) };
}

/** Tutup popover saat klik di luar `ref` atau menekan Escape. */
function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  // Menu tidak boleh tetap terbuka saat area petugas disembunyikan (mis. setelah klik Keluar).
  useResetOnHide(close);
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
  "absolute z-40 min-w-56 rounded-lg border border-line bg-surface p-1 shadow-[0_12px_32px_-12px_rgb(15_27_45/0.25)]";
const menuItem =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-text hover:bg-surface-2";

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
    startNavProgress();
    router.push(isValidResi(resi) ? `/kerja/${resi}` : `/kerja?cari=${encodeURIComponent(text)}`);
    setValue("");
    input.current?.blur();
  }

  return (
    <form role="search" onSubmit={submit} className="relative">
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
        className="h-8 w-full rounded-md border border-line bg-surface pr-11 pl-8 text-sm outline-none placeholder:text-muted focus:border-brand"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 rounded border border-line bg-surface-2 px-1.5 font-sans text-[11px] text-muted">
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
    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-warn/40 bg-warn-soft px-2 text-xs font-semibold text-warn";
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
  // Area petugas disembunyikan (bukan dibuang) setelah keluar: tombol harus aktif lagi saat login berikutnya.
  useResetOnHide(() => setPending(false));
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

/** Isi menu akun: identitas, tautan akun, tema, keluar. */
function AccountItems({ user, close }: { user: StaffUser; close: () => void }) {
  return (
    <>
      <div className="px-2.5 pt-1.5 pb-2">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
      </div>
      <ul className="border-t border-line pt-1">
        {ACCOUNT_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} onClick={close} className={menuItem}>
              <link.icon aria-hidden className="size-4 text-muted" />
              {link.label}
            </Link>
          </li>
        ))}
        <li className="flex items-center justify-between gap-2 px-2.5 py-0.5 text-sm font-medium">
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
    </>
  );
}

function Avatar({ user, className }: { user: StaffUser; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md bg-brand text-xs font-semibold text-on-brand",
        className,
      )}
    >
      {initials(user.name)}
    </span>
  );
}

/**
 * Menu akun. "card" = kartu pengguna di dasar sidebar (menu membuka ke atas);
 * "avatar" = tombol avatar di top bar HP (menu membuka ke bawah).
 */
function AccountMenu({ user, variant }: { user: StaffUser; variant: "card" | "avatar" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useDismiss(ref, open, close);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Menu akun ${user.name}`}
        onClick={() => setOpen((o) => !o)}
        className={
          variant === "card"
            ? "flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-surface"
            : "rounded-md"
        }
      >
        <Avatar user={user} />
        {variant === "card" && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold">{user.name}</span>
              <span className="block truncate text-xs text-muted">{ROLE_LABELS[user.role]}</span>
            </span>
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted" />
          </>
        )}
      </button>
      {open && (
        <div
          className={cn(
            menuPanel,
            variant === "card" ? "inset-x-0 bottom-full mb-2" : "top-full right-0 mt-2",
          )}
        >
          <AccountItems user={user} close={close} />
        </div>
      )}
    </div>
  );
}

/** Sidebar area petugas (layar lebar). Wajib di dalam <Suspense>: usePathname pada route dinamis. */
export function StaffSidebar({ user, offsetMs }: { user: StaffUser; offsetMs: number }) {
  const pathname = usePathname();
  const { sections, all } = menuFor(user);
  const current = activeHref(
    pathname,
    all.map((item) => item.href),
  );
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-4 px-3 py-4 lg:flex">
      {/* Kepala situs di layar lebar (di layar kecil: StaffMobileBar). */}
      <header className="space-y-4">
        <Link href={homeFor(user.role)} aria-label={site.name} className="block px-2 pt-1">
          <Wordmark className="text-[1.3rem]" />
        </Link>
        {/* Instansi tempat Pantas dipasang (satu instalasi = satu Disdukcapil). */}
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-2 text-muted">
            <Building2 aria-hidden className="size-4" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[13px] leading-snug font-semibold">{site.agency}</span>
            <span className="block text-xs text-muted">{site.demo.badge}</span>
          </span>
        </div>
      </header>
      {!user.mustChangePassword && <ResiJump />}

      <nav aria-label="Menu utama" className="-mx-1 flex-1 space-y-5 overflow-y-auto px-1">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-2 pb-1.5 text-xs font-medium text-muted">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.href === current;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-surface text-text shadow-[0_1px_2px_rgb(15_27_45/0.06)] ring-1 ring-line"
                          : "text-muted hover:bg-surface/70 hover:text-text",
                      )}
                    >
                      <item.icon aria-hidden className={cn("size-4", active && "text-brand")} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-2">
        <DemoChip offsetMs={offsetMs} isAdmin={user.role === "admin"} />
        <AccountMenu user={user} variant="card" />
      </div>
    </aside>
  );
}

/** Top bar ringkas (layar kecil): logo, jam demo, avatar. Menu ada di tab bar bawah. */
export function StaffMobileBar({ user, offsetMs }: { user: StaffUser; offsetMs: number }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
      <Link href={homeFor(user.role)} aria-label={site.name} className="mr-auto shrink-0">
        <LogoMark className="sm:hidden" />
        <Wordmark className="hidden text-[1.3rem] sm:inline-block" />
      </Link>
      <DemoChip offsetMs={offsetMs} isAdmin={user.role === "admin"} />
      <AccountMenu user={user} variant="avatar" />
    </header>
  );
}

/** Tab bar bawah (layar kecil): maksimal 4 menu; sisanya di "Lainnya". Wajib di dalam <Suspense>. */
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
  const tab =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-center text-xs leading-tight font-medium";

  return (
    <nav
      aria-label="Menu bawah"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
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

// --- Batas diam sesi ------------------------------------------------------------------

const LAST_ACTIVE_KEY = "staff-last-active";
const IDLE_MS = SESSION_IDLE_SECONDS * 1000;
const WARN_MS = SESSION_WARN_SECONDS * 1000;
const RENEW_EVERY_MS = 60_000;

/** Aktivitas terakhir di tab mana pun (localStorage), supaya tab yang diam tidak mengeluarkan tab yang aktif. */
function readLastActive(fallback: number) {
  try {
    return Math.max(fallback, Number(localStorage.getItem(LAST_ACTIVE_KEY)) || 0);
  } catch {
    return fallback;
  }
}

/**
 * Keluar otomatis setelah 30 menit tanpa interaksi (komputer loket dipakai bergantian).
 * Interaksi nyata memperpanjang sesi di server (maks. ~1x/menit); refresh otomatis antrean
 * tidak, jadi tab yang ditinggalkan tetap kedaluwarsa walau terus memuat data.
 */
export function IdleGuard() {
  const lastActive = useRef(0);
  const lastRenew = useRef(0);
  const [warnLeft, setWarnLeft] = useState<number | null>(null);

  useEffect(() => {
    let ended = false;
    const end = async (reason: "diam" | "habis") => {
      if (ended) return;
      ended = true;
      await postJson("/api/auth/logout");
      // Muat ulang penuh: semua state halaman petugas (Activity) ikut dibuang.
      window.location.replace(`/masuk?alasan=${reason}`);
    };
    const renew = async () => {
      lastRenew.current = Date.now();
      const res = await postJson("/api/auth/activity");
      if (!res.ok && res.status === 401) void end("habis");
    };
    const onActivity = () => {
      const now = Date.now();
      lastActive.current = now;
      try {
        localStorage.setItem(LAST_ACTIVE_KEY, String(now));
      } catch {}
      setWarnLeft(null);
      if (now - lastRenew.current > RENEW_EVERY_MS) void renew();
    };
    const tick = () => {
      const idle = Date.now() - readLastActive(lastActive.current);
      if (idle >= IDLE_MS) void end("diam");
      else setWarnLeft(idle >= IDLE_MS - WARN_MS ? IDLE_MS - idle : null);
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const name of events) window.addEventListener(name, onActivity, { passive: true });
    onActivity();
    const timer = window.setInterval(tick, 1000);
    return () => {
      for (const name of events) window.removeEventListener(name, onActivity);
      window.clearInterval(timer);
    };
  }, []);

  if (warnLeft === null) return null;
  const seconds = Math.ceil(warnLeft / 1000);
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-warn/50 bg-surface p-4 shadow-[0_12px_32px_-12px_rgb(15_27_45/0.3)] lg:bottom-6"
    >
      <Clock aria-hidden className="size-5 shrink-0 text-warn" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">
          Sesi berakhir dalam {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>{" "}
        karena tidak ada aktivitas.
      </p>
      {/* Klik apa pun sudah dihitung aktivitas; tombol ini hanya memperjelas. */}
      <button type="button" className={buttonClass("primary", "min-h-9 px-3")}>
        Tetap masuk
      </button>
    </div>
  );
}
