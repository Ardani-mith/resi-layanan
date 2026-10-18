// Dipakai oleh proxy.js, jadi jangan impor apa pun yang khusus Node/database.

export const ROLES = ["petugas_loket", "petugas_teknis", "pimpinan", "admin"];

export const ROLE_LABELS = {
  petugas_loket: "Petugas Loket",
  petugas_teknis: "Petugas Teknis",
  pimpinan: "Pimpinan",
  admin: "Admin",
};

export const STAFF_ROLES = ["petugas_loket", "petugas_teknis", "pimpinan", "admin"];

/** Prefix halaman → peran yang boleh membuka. Urutan: paling spesifik dulu. */
export const ROUTE_ROLES = [
  ["/admin", ["admin"]],
  ["/pantau", ["pimpinan", "admin"]],
  ["/kerja", ["petugas_loket", "petugas_teknis", "pimpinan", "admin"]],
];

export function rolesForPath(pathname) {
  const match = ROUTE_ROLES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return match ? match[1] : null;
}

/** Halaman awal setelah login. */
export function homeFor(role) {
  if (role === "pimpinan") return "/pantau";
  if (role === "admin") return "/admin/demo";
  return "/kerja";
}
