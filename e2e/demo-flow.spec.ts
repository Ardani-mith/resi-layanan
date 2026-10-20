import { expect, test } from "./fixtures.ts";
import { gotoReady, hasHorizontalScroll, login, MOBILE } from "./helpers.ts";

// Skrip demo lomba, berurutan: warga mengajukan → loket verifikasi → jam +2 hari →
// warga melihat tahap merah → pimpinan melihat eskalasi → rapor → jam dikembalikan.
test.describe.configure({ mode: "serial" });

let resi: string;

test("warga mengajukan akta kelahiran dari HP", async ({ openPage }) => {
  const page = await openPage({ viewport: MOBILE });
  await gotoReady(page, "/ajukan?layanan=akta-kelahiran");
  for (const box of await page.locator("fieldset").nth(1).getByRole("checkbox").all()) await box.check();
  await page.getByLabel("Nama lengkap sesuai KTP/KK").fill("Dimas Anggara");
  await page.getByLabel("NIK", { exact: true }).fill("3299000011113333");
  await page.getByLabel("Nomor HP", { exact: true }).fill("081234569999");
  await page.getByLabel(/Saya menyatakan/).check();
  await page.getByRole("button", { name: "Ajukan & dapatkan resi" }).click();
  await page.waitForURL("**/ajukan/sukses?resi=*");
  resi = new URL(page.url()).searchParams.get("resi") ?? "";
});

test("halaman petugas terlindungi per peran", async ({ openPage }) => {
  const anon = await openPage();
  await gotoReady(anon, "/kerja");
  await anon.waitForURL("**/masuk?next=%2Fkerja");

  const teknis = await openPage();
  await login(teknis, "teknis@resi.demo");
  await teknis.waitForURL("**/kerja");
  for (const path of ["/kerja/baru", "/pantau", "/admin/demo"]) {
    await gotoReady(teknis, path);
    await expect(teknis, `${path} → /kerja`).toHaveURL(/\/kerja$/);
  }
});

test("petugas loket memverifikasi berkas dari antrean", async ({ openPage }) => {
  const page = await openPage();
  await login(page, "loket@resi.demo", "/kerja");
  await page.waitForURL("**/kerja");
  await page.getByRole("link", { name: new RegExp(resi) }).click();
  await page.waitForURL(`**/kerja/${resi}`);

  await page.getByRole("button", { name: "Selesaikan tahap" }).click();
  await page.getByLabel("Catatan untuk warga (opsional)").fill("Berkas lengkap, diteruskan ke entri data.");
  await page.getByLabel("Catatan internal (hanya petugas)").fill("Cek silang KK OK.");
  await page.getByRole("button", { name: "Tandai tahap selesai" }).click();

  // Kembali ke antrean dengan konfirmasi; resi pindah ke petugas teknis.
  await page.waitForURL(`**/kerja?selesai=${resi}&aksi=complete`);
  await expect(page.getByText(`${resi}: tahap diselesaikan`)).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(resi) })).toHaveCount(0);

  await gotoReady(page, `/kerja/${resi}`);
  await expect(page.getByText(/ditangani Petugas Teknis/)).toBeVisible();
});

test("permintaan perbaikan wajib menyertakan catatan untuk warga", async ({ openPage }) => {
  const page = await openPage();
  await login(page, "loket@resi.demo");
  await page.waitForURL("**/kerja");
  await page.locator("main ul li a").first().click();
  await page.getByRole("button", { name: "Minta perbaikan" }).click();
  await page.getByRole("button", { name: "Kirim permintaan perbaikan" }).click();
  await expect(page.getByText("Wajib diisi, karena catatan ini dibaca warga.")).toBeVisible();
});

test("warga melihat catatan publik, catatan internal tidak bocor", async ({ openPage }) => {
  const page = await openPage({ viewport: MOBILE });
  await gotoReady(page, `/lacak/${resi}`);
  await expect(page.getByText("Berkas lengkap, diteruskan ke entri data.")).toBeVisible();
  await expect(page.getByText("Cek silang KK OK.")).toHaveCount(0);
});

test("jam +2 hari: tahap merah di HP warga, eskalasi di dashboard pimpinan", async ({ openPage }) => {
  const admin = await openPage();
  await login(admin, "admin@resi.demo");
  await admin.waitForURL("**/admin/demo");
  await admin.getByRole("button", { name: "Majukan +2 hari" }).click();
  await expect(admin.getByText(/Jam sistem sekarang \+2 hari/)).toBeVisible();

  const warga = await openPage({ viewport: MOBILE });
  await gotoReady(warga, `/lacak/${resi}`);
  await expect(warga.getByText(/melewati tenggat/).first()).toBeVisible();
  await expect(warga.getByText(/Mode demo: jam sistem dimajukan/)).toBeVisible();

  const pimpinan = await openPage();
  await login(pimpinan, "pimpinan@resi.demo");
  await pimpinan.waitForURL("**/pantau");
  await expect(pimpinan.getByRole("link", { name: resi })).toBeVisible();

  // Tooltip grafik: lewat hover dan lewat keyboard.
  const lastBar = pimpinan.locator("figure button").last();
  await lastBar.hover();
  await expect(pimpinan.getByRole("tooltip")).toBeVisible();
  await pimpinan.mouse.move(0, 0);
  await lastBar.focus();
  await expect(pimpinan.getByRole("tooltip")).toBeVisible();
});

test("rapor publik tanpa data pribadi", async ({ openPage }) => {
  const page = await openPage({ viewport: MOBILE });
  await gotoReady(page, "/rapor");
  await expect(page.getByRole("heading", { name: "Per layanan" })).toBeVisible();
  await expect(page.getByText("Dimas Anggara")).toHaveCount(0);
  await expect(page.getByText(resi)).toHaveCount(0);
  expect(await hasHorizontalScroll(page)).toBe(false);
});

test("kembali ke waktu nyata membatalkan eskalasi simulasi", async ({ openPage }) => {
  const admin = await openPage();
  await login(admin, "admin@resi.demo");
  await admin.waitForURL("**/admin/demo");
  await admin.getByRole("button", { name: "Kembali ke waktu nyata" }).click();
  await expect(admin.getByText(/Jam sistem kembali ke waktu nyata/)).toBeVisible();

  // Regresi: sebelumnya badge eskalasi tetap muncul di tahap yang belum terlambat.
  await gotoReady(admin, "/pantau");
  await expect(admin.getByRole("heading", { name: "Eskalasi terbuka" })).toBeVisible();
  await expect(admin.getByRole("link", { name: resi })).toHaveCount(0);
});
