// Menu sidebar area petugas & label breadcrumb. Tambah/ubah menu cukup di sini;
// komponen di components/layout/ hanya merender. `roles` = peran yang melihat menu itu.
import type { LucideIcon } from "lucide-react";
import { FilePlus2, Gauge, Globe, Inbox, KeyRound, LineChart, TimerReset, Users } from "lucide-react";
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
      { href: "/admin/demo", label: "Mode demo", icon: TimerReset, roles: ["admin"] },
    ],
  },
];

/** Menu bawah: untuk semua peran (juga saat masih memakai kata sandi sementara). */
export const FOOTER_LINKS: NavItem[] = [
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

/**
 * Menu yang aktif untuk `pathname`: href terpanjang yang cocok, supaya /kerja/baru
 * mengaktifkan "Input loket", sedangkan /kerja/RL-XXXX-XXXX tetap "Antrean".
 */
export function activeHref(pathname: string, hrefs: string[]): string | undefined {
  return hrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

// Label breadcrumb per path. `link: false` = tidak ada halamannya (hanya pengelompokan).
const CRUMBS: Record<string, { label: string; link?: boolean }> = {
  "/kerja": { label: "Antrean" },
  "/kerja/baru": { label: "Input loket" },
  "/pantau": { label: "Dashboard pimpinan" },
  "/admin": { label: "Admin", link: false },
  "/admin/petugas": { label: "Petugas" },
  "/admin/demo": { label: "Mode demo" },
  "/akun": { label: "Akun", link: false },
  [PASSWORD_PATH]: { label: "Ganti kata sandi" },
};

/** Jejak breadcrumb dari pathname, mis. /kerja/RL-AB3K-7XQ9 → Antrean › RL-AB3K-7XQ9. */
export function crumbsFor(pathname: string): { href: string; label: string; link: boolean }[] {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, i) => {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    const crumb = CRUMBS[href];
    return { href, label: crumb?.label ?? decodeURIComponent(segment), link: crumb?.link ?? true };
  });
}
