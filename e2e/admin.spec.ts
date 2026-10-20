import { expect, test } from "./fixtures.ts";
import { gotoReady, login } from "./helpers.ts";

// Admin mengelola layanan (tahapan & SLA) dan hari libur; setiap perubahan tercatat.

test("admin membuat & mengubah layanan, lalu layanan tampil di katalog", async ({ openPage }) => {
  const admin = await openPage();
  await login(admin, "admin@resi.demo", "/admin/layanan");
  await admin.waitForURL("**/admin/layanan");

  await admin.getByRole("button", { name: "Tambah layanan" }).click();
  const form = admin.getByRole("region", { name: "Layanan baru" });
  await form.getByLabel("Nama layanan").fill("Surat Keterangan Pindah");
  await form.getByLabel(/^Slug/).fill("surat-pindah");
  await form.getByLabel("Urutan tampil").fill("9");
  await form.getByLabel("Persyaratan (satu per baris)").fill("Kartu Keluarga asli\nKTP-el");
  await form.getByRole("button", { name: "Tambah tahap" }).click();
  await form.getByRole("button", { name: "Buat layanan" }).click();
  // Tahap baru masih kosong: validasi server menunjuk field yang tepat.
  await expect(form.getByText("Nama tahap minimal 3 huruf.")).toBeVisible();
  await form.getByRole("button", { name: "Hapus tahap 3" }).click();
  await form.getByRole("button", { name: "Buat layanan" }).click();

  const row = admin.getByRole("listitem").filter({ hasText: "/layanan/surat-pindah" });
  await expect(row).toContainText("2 tahap · target 1 hari kerja · 2 persyaratan");
  await row.getByRole("button", { name: "Ubah" }).click();
  await row.getByLabel("SLA (hari kerja)").first().fill("3");
  await row.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(row).toContainText("target 3 hari kerja");
  await expect(admin.getByText("Layanan diubah · Surat Keterangan Pindah")).toBeVisible();

  await gotoReady(admin, "/layanan/surat-pindah");
  await expect(admin.getByRole("heading", { name: "Surat Keterangan Pindah" })).toBeVisible();
  await expect(admin.getByText("Kartu Keluarga asli")).toBeVisible();
});

test("admin menambah & menghapus hari libur", async ({ openPage }) => {
  const admin = await openPage();
  await login(admin, "admin@resi.demo", "/admin/libur");
  await admin.waitForURL("**/admin/libur");

  await admin.getByLabel("Tanggal libur").fill("2030-01-02");
  await admin.getByRole("button", { name: "Tambah" }).click();
  const chip = admin.getByRole("listitem").filter({ hasText: "2 Januari 2030" });
  await expect(chip).toBeVisible();
  await chip.getByRole("button", { name: /Hapus/ }).click();
  await expect(chip).toHaveCount(0);
  await expect(admin.getByText("Hari libur diubah").first()).toBeVisible();
});
