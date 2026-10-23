// Menu area petugas (top bar desktop + tab bar bawah di HP). Tambah/ubah menu cukup di sini;
// components/layout/StaffShell.tsx hanya merender. `roles` = peran yang melihat menu itu.
// Bagian "Admin" dirender sebagai satu dropdown agar top bar tetap ringkas.
import type { LucideIcon } from "lucide-react";
import {
  CalendarOff,
  FilePlus2,
  Gauge,
  Globe,
  Inbox,
  KeyRound,
  LayoutList,
  LineChart,
  TimerReset,
  Users,
} from "lucide-react";
import { PASSWORD_PATH, type Role, STAFF_ROLES } from "@/lib/roles";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: (NavItem & { roles: readonly Role[] })[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Pelayanan",
    items: [
      { href: "/kerja", label: "Antrean", icon: Inbox, roles: STAFF_ROLES },
      { href: "/kerja/baru", label: "Input loket", icon: FilePlus2, roles: ["petugas_loket", "admin"] },
    ],
  },
  {
    title: "Pemantauan",
    items: [
      { href: "/pantau", label: "Dashboard pimpinan", icon: Gauge, roles: ["pimpinan", "admin"] },
      { href: "/rapor", label: "Rapor SLA publik", icon: LineChart, roles: ["pimpinan", "admin"] },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/admin/petugas", label: "Petugas", icon: Users, roles: ["admin"] },
      { href: "/admin/layanan", label: "Layanan & SLA", icon: LayoutList, roles: ["admin"] },
      { href: "/admin/libur", label: "Hari libur", icon: CalendarOff, roles: ["admin"] },
      { href: "/admin/demo", label: "Mode demo", icon: TimerReset, roles: ["admin"] },
    ],
  },
];

/** Menu akun (dropdown avatar): untuk semua peran, juga saat masih memakai kata sandi sementara. */
export const ACCOUNT_LINKS: NavItem[] = [
  { href: "/", label: "Halaman warga", icon: Globe },
  { href: PASSWORD_PATH, label: "Ganti kata sandi", icon: KeyRound },
];

/** Bagian menu yang boleh dilihat `role`; bagian tanpa menu tidak ditampilkan. */
export function navFor(role: Role): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}

/** Judul bagian menu yang dirender sebagai dropdown (bukan tab). */
export const ADMIN_SECTION = "Admin";

/**
 * Menu yang aktif untuk `pathname`: href terpanjang yang cocok, supaya /kerja/baru
 * mengaktifkan "Input loket", sedangkan /kerja/RL-XXXX-XXXX tetap "Antrean".
 */
export function activeHref(pathname: string, hrefs: string[]): string | undefined {
  return hrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}
