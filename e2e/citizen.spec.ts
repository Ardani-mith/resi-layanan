import { expect, test } from "./fixtures.ts";
import { confirmOtp, gotoReady, hasHorizontalScroll, MOBILE } from "./helpers.ts";

// Alur warga di HP: lacak, verifikasi HP, perbaikan berkas, rating, pengajuan.

test("cek resi dari beranda, lalu buka detail dengan 4 digit HP", async ({ openPage }) => {
  const page = await openPage({ viewport: MOBILE });
  await gotoReady(page, "/");
  await page.getByRole("textbox", { name: /resi/i }).first().fill("rlhj26akta"); // huruf kecil & tanpa tanda hubung tetap diterima
  await page.getByRole("button", { name: "Lacak", exact: true }).first().click(); // kolom cek resi di hero
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

  await expect(submit).toBeDisabled(); // terkunci sampai NIK lolos

  // Pemohon di bawah 17 tahun ditolak sejak langkah NIK.
  const nik = page.getByLabel("NIK", { exact: true });
  await nik.fill("3299010101120001");
  await expect(page.getByText(/pemohon berusia 14 tahun/)).toBeVisible();
  await nik.fill("3299012208950001");
  await expect(page.getByText(/NIK valid · lahir 22-08-1995/)).toBeVisible();

  await submit.click();
  await expect(page.getByText("Pastikan semua persyaratan sudah Anda siapkan.")).toBeVisible();

  for (const box of await page.locator("fieldset").nth(1).getByRole("checkbox").all()) await box.check();
  await page.getByLabel(/Saya menyatakan/).check();
  await submit.click();
  await expect(page.getByText("Nama minimal 3 huruf.")).toBeVisible(); // validasi dari server

  await page.getByLabel("Nama lengkap sesuai KTP/KK").fill("Ardani Setiawan");
  await page.getByLabel("Nomor HP", { exact: true }).fill("0812 3456 7777");
  await submit.click();
  await expect(page.getByText(/Kode 6 digit dikirim ke 0812\*+7777/)).toBeVisible();
  await confirmOtp(page);

  await page.waitForURL("**/ajukan/sukses?resi=*");
  const resi = new URL(page.url()).searchParams.get("resi");
  expect(resi).toMatch(/^RL-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);

  // Bukti resi: QR menuju halaman lacak + gambar PNG yang bisa diunduh.
  const receipt = page.getByRole("region", { name: "Simpan bukti resi" });
  await expect(receipt.getByRole("img", { name: new RegExp(`/lacak/${resi}`) })).toBeVisible();
  const image = await page.request.get(`/lacak/${resi}/bukti`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");

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

test("katalog layanan: persyaratan, tahapan & SLA, lalu ajukan", async ({ openPage }) => {
  const page = await openPage({ viewport: MOBILE });
  await gotoReady(page, "/layanan");
  await page.getByRole("link", { name: /Akta Kelahiran/ }).click();
  await page.waitForURL("**/layanan/akta-kelahiran");
  await expect(page.getByRole("heading", { name: "Tahapan & janji waktu" })).toBeVisible();
  await expect(page.getByText("Verifikasi berkas", { exact: true })).toBeVisible();
  await expect(page.getByText(/dokumen terbit paling lama 4 jam kerja/)).toBeVisible();
  expect(await hasHorizontalScroll(page)).toBe(false);
  await page.getByRole("link", { name: "Ajukan sekarang" }).click();
  await page.waitForURL("**/ajukan?layanan=akta-kelahiran");
});

test("pengajuan KTP-el: isian KTP mengisi pratinjau, lalu terkirim", async ({ openPage }) => {
  const page = await openPage();
  await gotoReady(page, "/ajukan?layanan=perekaman-ktp-el");
  const preview = page
    .getByRole("img", { name: "Pratinjau KTP elektronik dari isian form" })
    .filter({ visible: true });
  await expect(preview).toBeVisible();
  const shows = (text: string) => expect(preview.locator("text", { hasText: text })).toHaveCount(1);

  // NIK lebih dulu: bagian lain form terkunci sampai NIK valid.
  await page.getByLabel("NIK", { exact: true }).fill("3299019913080002");
  await expect(
    page
      .getByText(/Digit tanggal lahir di NIK/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await page.getByLabel("NIK", { exact: true }).fill("3299015508080002");
  await expect(page.getByText(/NIK valid · lahir 15-08-2008 · perempuan/)).toBeVisible();
  await page.getByLabel("Nama lengkap sesuai KTP/KK").fill("Siti Rahmawati");
  await shows("SITI RAHMAWATI");
  await shows("3299 0155 0808 0002");

  await page.getByLabel("Nomor HP", { exact: true }).fill("081234560002");
  await page.getByLabel("Tempat lahir").fill("Harapan Jaya");
  await page.getByLabel("Golongan darah").selectOption("O");
  await page.getByLabel("Alamat").fill("Jl. Melati No. 12");
  await page.getByLabel("RT/RW").fill("3/5");
  await page.getByLabel("Kelurahan/Desa").fill("Sukamaju");
  await page.getByLabel("Kecamatan").fill("Harapan Baru");
  await page.getByLabel("Agama/Kepercayaan").selectOption("ISLAM");
  await page.getByLabel("Status perkawinan").selectOption("BELUM KAWIN");
  await page.getByLabel("Pekerjaan").fill("PELAJAR/MAHASISWA");
  await shows("HARAPAN JAYA, 15-08-2008");
  await shows("JL. MELATI NO. 12");

  for (const box of await page.locator("fieldset").nth(1).getByRole("checkbox").all()) await box.check();
  await page.getByLabel(/Saya menyatakan/).check();
  await page.getByRole("button", { name: "Ajukan & dapatkan resi" }).click();
  await confirmOtp(page);
  await page.waitForURL("**/ajukan/sukses?resi=*");
  // KTP-el wajib hadir (biometrik): pendaftaran online, tenggat mulai saat warga datang.
  await expect(page.getByText("Datang ke loket dengan dokumen asli")).toBeVisible();

  // Layanan lain: tanpa isian & pratinjau KTP.
  await gotoReady(page, "/ajukan?layanan=akta-kelahiran");
  await expect(page.getByLabel("Tempat lahir")).toHaveCount(0);
  await expect(preview).toHaveCount(0);
});

test("peta lokasi layanan: hasil mengikuti area peta, filter jenis, urut dari lokasi saya", async ({
  openPage,
}) => {
  // Lokasi tiruan di depan Kantor Kecamatan Tanah Abang (Jl. K.H. Mas Mansyur No. 130).
  const page = await openPage({
    viewport: MOBILE,
    geolocation: { latitude: -6.1999, longitude: 106.8145 },
    permissions: ["geolocation"],
  });
  await gotoReady(page, "/ajukan/sukses?resi=RL-HJ26-AKTA");
  // Di halaman sukses peta masih ringkas (warga belum perlu datang); dibuka lewat tombol.
  const section = page.getByRole("region", { name: "Lokasi pengambilan dokumen nanti" });
  await section.getByRole("button", { name: "Tampilkan peta" }).click();
  const count = section.getByText(/^\d+ lokasi$/);
  await expect(section.getByRole("region", { name: "Peta lokasi layanan" })).toBeVisible();
  await expect(section.getByRole("listitem").first()).toBeVisible();

  // Perkecil peta: area lebih luas, kantor kelurahan disembunyikan agar tidak penuh sesak.
  await section.getByRole("button", { name: "Zoom out" }).click();
  await expect(section.getByText("Perbesar peta untuk melihat kantor kelurahan.")).toBeVisible();

  await section.getByRole("button", { name: "Gunakan lokasi saya" }).click();
  const first = section.getByRole("listitem").first();
  await expect(first).toContainText("Kantor Kecamatan Tanah Abang");
  await expect(first).toContainText("terdekat");
  await expect(first.getByRole("link", { name: "Petunjuk arah" })).toHaveAttribute(
    "href",
    /google\.com\/maps\/dir/,
  );
  await expect(count).not.toHaveText("0 lokasi");

  // MPP tidak di area peta: peta pindah ke MPP terdekat dan hasilnya tampil.
  await section
    .getByRole("group", { name: "Jenis lokasi" })
    .getByRole("button", { name: "Mal Pelayanan Publik", exact: true })
    .click();
  await expect(section.getByRole("listitem").first()).toContainText("Rasuna Said");
  await expect(section.getByText(/Program Jemput Bola/)).toBeVisible();
  expect(await hasHorizontalScroll(page)).toBe(false);
});

test("lupa resi: NIK + HP → kode OTP → daftar resi", async ({ openPage }) => {
  const page = await openPage({ viewport: MOBILE });
  await gotoReady(page, "/lacak");
  await page.getByRole("link", { name: "Cari dengan NIK & nomor HP" }).click();
  await page.waitForURL("**/lacak/lupa");

  await page.getByLabel("NIK pemohon").fill("3299012208950009");
  await page.getByLabel("Nomor HP yang didaftarkan").fill("081299990009");
  await page.getByRole("button", { name: "Kirim kode verifikasi" }).click();
  const code = (await page.locator(".font-mono.tracking-widest").textContent())?.trim() ?? "";
  await page.getByLabel("Kode verifikasi").fill(code);
  await page.getByRole("button", { name: "Tampilkan resi saya" }).click();
  // Data tidak cocok: tetap lewat OTP dulu, baru dijawab "tidak ada" (tidak bisa dipakai menebak NIK).
  await expect(page.getByRole("heading", { name: "Tidak ada permohonan" })).toBeVisible();
});
