import { expect, test } from "./fixtures.js";
import { gotoReady, hasHorizontalScroll, MOBILE } from "./helpers.js";

// Alur warga di HP: lacak, verifikasi HP, perbaikan berkas, rating, pengajuan.

test("cek resi dari beranda, lalu buka detail dengan 4 digit HP", async ({ openPage }) => {
  const page = await openPage({ viewport: MOBILE });
  await gotoReady(page, "/");
  await page.locator("#resi").fill("rlhj26akta"); // huruf kecil & tanpa tanda hubung tetap diterima
  await page.getByRole("button", { name: "Lacak", exact: true }).click();
  await page.waitForURL("**/lacak/RL-HJ26-AKTA");

  await expect(page.getByText(/melewati tenggat/).first()).toBeVisible();
  // filter visible: Next 16 menyimpan halaman sebelumnya (beranda, yang memuat cuplikan
  // dengan teks serupa) secara tersembunyi agar navigasi "kembali" instan.
  await expect(page.getByText("Si*** R***").filter({ visible: true })).toBeVisible();

  await page.locator("#verify-last4").fill("0000");
  await page.getByRole("button", { name: "Tampilkan detail" }).click();
  await expect(page.getByText("4 digit terakhir nomor HP tidak cocok.")).toBeVisible();

  await page.locator("#verify-last4").fill("1234");
  await page.getByRole("button", { name: "Tampilkan detail" }).click();
  await expect(page.getByText("Siti Rahmawati").first()).toBeVisible();
  expect(await hasHorizontalScroll(page)).toBe(false);
});

test("state khusus: URL dinormalisasi, format salah, tidak ditemukan, ditolak", async ({ openPage }) => {
  const page = await openPage({ viewport: MOBILE });

  await gotoReady(page, "/lacak/rl-hj26-akta");
  await page.waitForURL("**/lacak/RL-HJ26-AKTA");

  await gotoReady(page, "/lacak/RL-12");
  await expect(page.getByText("Format resi tidak dikenali")).toBeVisible();

  await gotoReady(page, "/lacak/RL-ZZZZ-ZZZZ");
  await expect(page.getByText("Resi tidak ditemukan")).toBeVisible();

  await gotoReady(page, "/lacak/RL-HJ26-TLAK");
  await expect(page.getByText("Permohonan ditolak")).toBeVisible();
});

test("warga mengonfirmasi perbaikan berkas, hitung mundur berjalan lagi", async ({ openPage }) => {
  const page = await openPage({ viewport: MOBILE });
  await gotoReady(page, "/lacak/RL-HJ26-PRBK");
  await expect(page.getByText("Berkas perlu diperbaiki")).toBeVisible();

  await page.locator("#fix-last4").fill("5678");
  await page.getByRole("button", { name: "Saya sudah melengkapi berkas" }).click();
  await expect(page.getByText(/Proses dilanjutkan/)).toBeVisible();
  await expect(page.getByText("Berkas perlu diperbaiki")).toBeHidden();
});

test("rating hanya terkirim setelah memilih bintang", async ({ openPage }) => {
  const page = await openPage({ viewport: MOBILE });
  await gotoReady(page, "/lacak/RL-HJ26-SLSE");

  await page.getByRole("button", { name: "Kirim penilaian" }).click();
  await expect(page.getByText("Pilih 1–5 bintang.")).toBeVisible();

  await page.getByRole("button", { name: "5 bintang" }).click();
  await page.locator("#comment").fill("Cepat dan jelas.");
  await page.locator("#rate-last4").fill("4321");
  await page.getByRole("button", { name: "Kirim penilaian" }).click();
  await expect(page.getByText("Terima kasih atas penilaian Anda.")).toBeVisible();
  await expect(page.getByText("Bagaimana pelayanan kami?")).toBeHidden();
});

test("pengajuan online: validasi, resi baru, dan nama tersamar di halaman lacak", async ({ openPage }) => {
  const page = await openPage();
  await gotoReady(page, "/ajukan?layanan=akta-kelahiran");
  const submit = page.getByRole("button", { name: "Ajukan & dapatkan resi" });

  await submit.click();
  await expect(page.getByText("Pastikan semua persyaratan sudah Anda siapkan.")).toBeVisible();

  for (const box of await page.locator("fieldset").nth(1).getByRole("checkbox").all()) await box.check();
  await page.getByLabel(/Saya menyatakan/).check();
  await submit.click();
  await expect(page.getByText("Nama minimal 3 huruf.")).toBeVisible(); // validasi dari server

  await page.getByLabel("Nama lengkap sesuai KTP/KK").fill("Ardani Setiawan");
  await page.getByLabel("NIK", { exact: true }).fill("3299000011112222");
  await page.getByLabel("Nomor HP", { exact: true }).fill("0812 3456 7777");
  await submit.click();

  await page.waitForURL("**/ajukan/sukses?resi=*");
  const resi = new URL(page.url()).searchParams.get("resi");
  expect(resi).toMatch(/^RL-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);

  await page.getByRole("link", { name: "Lacak sekarang" }).click();
  await page.waitForURL(`**/lacak/${resi}`);
  await expect(page.getByText("Ar*** S***")).toBeVisible();
});

test("tampilan HP & mode gelap tanpa scroll horizontal", async ({ openPage }) => {
  const page = await openPage({ viewport: MOBILE, colorScheme: "dark" });
  for (const path of ["/", "/ajukan", "/lacak/RL-HJ26-AKTA", "/rapor"]) {
    await gotoReady(page, path);
    await page.locator("main h1").first().waitFor();
    expect(await hasHorizontalScroll(page), path).toBe(false);
  }
});

test("tombol tema: Sistem → Terang → Gelap, tersimpan setelah reload", async ({ openPage }) => {
  const page = await openPage({ viewport: MOBILE, colorScheme: "dark" });
  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: /^Tema:/ });
  await gotoReady(page, "/");

  // Belum ada pilihan: ikut OS (gelap).
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAccessibleName(/^Tema: Sistem/);

  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAccessibleName(/^Tema: Terang/);

  // Pilihan dipasang skrip di <head> sebelum paint, jadi langsung benar setelah reload.
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(246, 248, 251)");

  await page.getByRole("button", { name: /^Tema:/ }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /^Tema:/ }).click();
  await expect(toggle).toHaveAccessibleName(/^Tema: Sistem/);

  // Mode Sistem mengikuti perubahan tema OS tanpa reload.
  await page.emulateMedia({ colorScheme: "light" });
  await expect(html).toHaveAttribute("data-theme", "light");
});
