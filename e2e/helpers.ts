// Dipakai bersama oleh spec dan scripts/e2e-server.ts, jadi jangan impor nilai dari
// @playwright/test di sini (impor tipe saja, terhapus saat dijalankan).
import type { Page } from "@playwright/test";

/** Kata sandi semua akun demo di database e2e (in-memory, dibuat ulang tiap run). */
export const E2E_PASSWORD = "e2e-demo-password";
export const E2E_PORT = 3100;

export const MOBILE = { width: 390, height: 844 };

/**
 * Buka halaman dan tunggu sampai interaktif. Tanpa ini, klik yang terlalu cepat bisa
 * terjadi sebelum React selesai hydration, dan state form (mis. checkbox) direset.
 */
export async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** Login petugas lewat form /masuk. `next` = halaman tujuan setelah login. */
export async function login(page: Page, email: string, next?: string) {
  await gotoReady(page, next ? `/masuk?next=${encodeURIComponent(next)}` : "/masuk");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
}

/** Halaman tidak boleh lebih lebar dari layar (cek wajib tampilan HP). */
export function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}
