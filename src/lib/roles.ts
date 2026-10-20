// Peran, hak akses halaman, dan aturan akun. Dipakai juga oleh proxy.ts dan form di
// browser, jadi jangan impor apa pun yang khusus Node/database.

export const ROLES = ["petugas_loket", "petugas_teknis", "pimpinan", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Pelaku di audit log: petugas, warga (tanpa akun), atau sistem (eskalasi). */
export type ActorRole = Role | "warga" | "sistem";

export const ROLE_LABELS: Record<Role, string> = {
  petugas_loket: "Petugas Loket",
  petugas_teknis: "Petugas Teknis",
  pimpinan: "Pimpinan",
  admin: "Admin",
};

export const STAFF_ROLES: readonly Role[] = ROLES;

/** Halaman ganti kata sandi; satu-satunya halaman petugas yang boleh dibuka dengan kata sandi sementara. */
export const PASSWORD_PATH = "/akun/kata-sandi";

export const PASSWORD_MIN = 10;

/** Prefix halaman → peran yang boleh membuka. Urutan: paling spesifik dulu. */
export const ROUTE_ROLES: [prefix: string, roles: readonly Role[]][] = [
  ["/akun", STAFF_ROLES],
  ["/admin", ["admin"]],
  ["/pantau", ["pimpinan", "admin"]],
  ["/kerja", STAFF_ROLES],
];

export function rolesForPath(pathname: string): readonly Role[] | null {
  const match = ROUTE_ROLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match ? match[1] : null;
}

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

/** Halaman awal setelah login. */
export function homeFor(role: Role): string {
  if (role === "pimpinan") return "/pantau";
  if (role === "admin") return "/admin/demo";
  return "/kerja";
}
