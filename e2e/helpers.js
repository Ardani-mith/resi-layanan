// Dipakai bersama oleh spec dan scripts/e2e-server.mjs, jadi jangan impor @playwright/test di sini.

/** Kata sandi semua akun demo di database e2e (in-memory, dibuat ulang tiap run). */
export const E2E_PASSWORD = "e2e-demo-password";
export const E2E_PORT = 3100;

export const MOBILE = { width: 390, height: 844 };

/**
 * Buka halaman dan tunggu sampai interaktif. Tanpa ini, klik yang terlalu cepat bisa
 * terjadi sebelum React selesai hydration, dan state form (mis. checkbox) direset.
 */
export async function gotoReady(page, path) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** Login petugas lewat form /masuk. `next` = halaman tujuan setelah login. */
export async function login(page, email, next) {
  await gotoReady(page, next ? `/masuk?next=${encodeURIComponent(next)}` : "/masuk");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
}

/** Halaman tidak boleh lebih lebar dari layar (cek wajib tampilan HP). */
export function hasHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}
