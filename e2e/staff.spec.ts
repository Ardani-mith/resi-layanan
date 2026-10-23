import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";
import { gotoReady, login, MOBILE } from "./helpers.ts";

// Alur akun petugas: admin membuat akun → petugas wajib ganti kata sandi sementara →
// admin menonaktifkan → sesi petugas langsung berakhir.

const EMAIL = "petugas.baru@resi.demo";
const NEW_PASSWORD = "frasa sandi petugas baru";

test("admin membuat petugas, petugas mengganti kata sandi sementara, lalu dinonaktifkan", async ({
  openPage,
}) => {
  const admin = await openPage();
  admin.on("dialog", (dialog) => dialog.accept());
  await login(admin, "admin@resi.demo");
  await admin.waitForURL("**/admin/demo");
  await gotoReady(admin, "/admin/petugas");

  await admin.getByLabel("Nama lengkap").fill("Sari Petugas Baru");
  await admin.getByLabel("Peran").selectOption("petugas_teknis");
  await admin.getByLabel("Email").fill(EMAIL);
  await admin.getByRole("button", { name: "Tambah petugas" }).click();
  const tempPassword = (await admin.locator("code").first().textContent()) ?? "";
  expect(tempPassword).toMatch(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){2}$/);
  const row = admin.getByRole("listitem").filter({ hasText: EMAIL });
  await expect(row.getByText("Belum ganti sandi")).toBeVisible();

  // Petugas login dengan kata sandi sementara: hanya boleh membuka halaman ganti kata sandi.
  const staff = await openPage({ viewport: MOBILE });
  await gotoReady(staff, "/masuk?next=%2Fkerja");
  await staff.getByLabel("Email").fill(EMAIL);
  await staff.getByLabel("Kata sandi").fill(tempPassword);
  await staff.getByRole("button", { name: "Masuk" }).click();
  await staff.waitForURL("**/akun/kata-sandi");
  await gotoReady(staff, "/kerja");
  await staff.waitForURL("**/akun/kata-sandi");

  await staff.getByLabel("Kata sandi sementara").fill(tempPassword);
  await staff.getByLabel("Kata sandi baru", { exact: true }).fill(NEW_PASSWORD);
  await staff.getByLabel("Ulangi kata sandi baru").fill("beda dengan yang baru");
  await staff.getByRole("button", { name: "Simpan kata sandi baru" }).click();
  await expect(staff.getByText("Konfirmasi tidak sama dengan kata sandi baru.")).toBeVisible();
  await staff.getByLabel("Ulangi kata sandi baru").fill(NEW_PASSWORD);
  await staff.getByRole("button", { name: "Simpan kata sandi baru" }).click();
  await staff.waitForURL("**/kerja");

  await admin.reload();
  await expect(row.getByText("Belum ganti sandi")).toHaveCount(0);

  // Admin menonaktifkan: halaman petugas berikutnya langsung meminta login ulang.
  await row.getByRole("button", { name: "Nonaktifkan" }).click();
  await expect(row.getByText("Nonaktif", { exact: true })).toBeVisible();
  await staff.reload();
  await staff.waitForURL("**/masuk?next=%2Fkerja");

  await staff.getByLabel("Email").fill(EMAIL);
  await staff.getByLabel("Kata sandi").fill(NEW_PASSWORD);
  await staff.getByRole("button", { name: "Masuk" }).click();
  await expect(staff.getByText("Email atau kata sandi salah.")).toBeVisible();
});

test("admin tidak bisa mengubah akunnya sendiri dari daftar petugas", async ({ openPage }) => {
  const admin = await openPage();
  await login(admin, "admin@resi.demo", "/admin/petugas");
  await admin.waitForURL("**/admin/petugas");
  const self = admin.getByRole("listitem").filter({ hasText: "admin@resi.demo" });
  await expect(self.getByText("Anda", { exact: true })).toBeVisible();
  await expect(self.getByRole("button")).toHaveCount(0);
});

test("top bar petugas: menu sesuai peran, antrean dua panel, cari resi, dan tab bar di HP", async ({
  openPage,
}) => {
  const loket = await openPage();
  await login(loket, "loket@resi.demo", "/kerja/RL-HJ26-PRBK");
  await loket.waitForURL("**/kerja/RL-HJ26-PRBK");

  const nav = loket.getByRole("navigation", { name: "Menu utama" });
  await expect(nav.getByRole("link", { name: "Antrean" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Input loket" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "Admin" })).toHaveCount(0); // khusus admin

  // Dua panel: daftar antrean & detail tampil bersamaan, baris terpilih ditandai.
  await expect(loket.getByRole("heading", { name: "Antrean", exact: true })).toBeVisible();
  await expect(loket.getByRole("link", { name: /RL-HJ26-PRBK/ })).toHaveAttribute("aria-current", "page");
  await expect(loket.getByRole("heading", { name: "Perubahan Kartu Keluarga" })).toBeVisible();

  // ⌘K → cari resi langsung membuka detailnya.
  await loket.keyboard.press("ControlOrMeta+k");
  await expect(loket.getByRole("search").getByRole("textbox")).toBeFocused();
  await loket.keyboard.type("rl-hj26-akta");
  await loket.keyboard.press("Enter");
  await loket.waitForURL("**/kerja/RL-HJ26-AKTA");

  await loket.getByRole("button", { name: /Menu akun/ }).click();
  await expect(loket.getByRole("link", { name: "Ganti kata sandi" })).toBeVisible();
  await expect(loket.getByRole("button", { name: "Keluar" })).toBeVisible();

  const phone = await openPage({ viewport: MOBILE });
  await login(phone, "admin@resi.demo", "/kerja");
  await phone.waitForURL("**/kerja");
  const tabBar = phone.getByRole("navigation", { name: "Menu bawah" });
  await tabBar.getByRole("button", { name: "Lainnya" }).click();
  await tabBar.getByRole("link", { name: "Petugas" }).click();
  await phone.waitForURL("**/admin/petugas");
  await expect(tabBar.getByRole("button", { name: "Lainnya" })).toBeVisible();
});

test("404 dirender di dalam kerangka masing-masing, tanpa navbar/footer dobel", async ({ openPage }) => {
  const visible = (page: Page, selector: string) => page.locator(selector).filter({ visible: true }).count();

  const guest = await openPage();
  const res = await guest.goto("/halaman-tidak-ada");
  expect(res?.status()).toBe(404);
  await expect(guest.getByRole("heading", { name: "Halaman tidak ditemukan" })).toBeVisible();
  expect(await visible(guest, "header")).toBe(1);
  expect(await visible(guest, "footer")).toBe(1);

  const staff = await openPage();
  await login(staff, "loket@resi.demo");
  await staff.waitForURL("**/kerja");
  await gotoReady(staff, "/kerja/RL-ZZZZ-ZZZZ");
  await expect(staff.getByRole("heading", { name: "Data tidak ditemukan" })).toBeVisible();
  await expect(staff.getByRole("navigation", { name: "Menu utama" })).toBeVisible();
  expect(await visible(staff, "header")).toBe(1);
  expect(await visible(staff, "main")).toBe(1);
  expect(await visible(staff, "footer")).toBe(0);
});
