# Alur tahapan permohonan (contoh: Akta Kelahiran)

## Ringkasnya

Setiap permohonan berjalan berurutan dari satu tahap ke tahap berikutnya. Setiap tahap dipegang oleh **satu peran petugas** dan punya **tenggat dalam jam kerja**. Tahap berikutnya baru dimulai setelah petugas tahap sebelumnya menekan "selesai".

Tenggat dihitung dalam **jam kerja** (Senin–Jumat 08.00–16.00 WIB). Setelah berkas dinyatakan lengkap, dokumen terbit paling lama **24 jam / 1 hari kerja** (Permendagri 19/2018).

| # | Tahap | Dipegang oleh | Tenggat | Yang dikerjakan |
|---|---|---|---|---|
| 1 | Verifikasi berkas | Petugas Loket | 1 hari kerja (8 jam) | Cek kelengkapan berkas. Kalau kurang → status "Perlu Perbaikan" dan hitung mundur dijeda. Selesai = **berkas lengkap, janji 24 jam dimulai**. |
| 2 | Entri & validasi data | Petugas Teknis | 2 jam kerja | Input data ke sistem kependudukan dan cek kecocokannya. |
| 3 | Persetujuan & tanda tangan elektronik | **Pimpinan** | 1 jam kerja | Menyetujui dan menandatangani dokumen secara elektronik. |
| 4 | Pencetakan akta | Petugas Teknis | 1 jam kerja | Mencetak kutipan akta. |
| 5 | Siap diambil di loket | Petugas Loket | tanpa tenggat | Menyerahkan dokumen saat warga datang. Selesai setelah diserahkan. |

## Setelah tahap berjalan

- **Pimpinan menyetujui tepat waktu** → tahap 4 (Pencetakan) otomatis pindah ke antrean Petugas Teknis.
- **Lewat tenggat** → tahap ditandai "Terlambat" dan otomatis dieskalasi: level 1 saat melewati tenggat, level 2 setelah +1 hari kerja (8 jam kerja). Eskalasi tampil di `/pantau`. Warga melihat "sudah diteruskan ke atasan petugas".
- **Setelah tahap 4** → status "Siap Diambil". Warga melihat peta lokasi dan daftar berkas yang dibawa.
- **Setelah diserahkan di loket** → status "Selesai" dan warga bisa memberi penilaian.

## Layanan wajib hadir (KTP-el)

Perekaman biometrik (foto, sidik jari, iris) tidak bisa dilakukan online. Karena itu, untuk layanan yang ditandai **wajib hadir** (`requiresVisit`, diatur di `/admin/layanan`):

| Kanal | Status awal | Tenggat tahap 1 |
|---|---|---|
| Online | **Menunggu Kedatangan**: pendaftaran awal, data sudah tersimpan | Belum berjalan. Tidak ada keterlambatan atau eskalasi selama warga belum datang. |
| Loket | Diajukan (warga sudah hadir) | Langsung berjalan |

Saat warga datang, petugas loket mencari resinya di tab **"Menunggu datang"** lalu menekan **"Warga sudah hadir"**. Kedatangan tercatat di audit log, dan hitung mundur verifikasi dimulai saat itu. Setelahnya alurnya sama: petugas memeriksa dokumen asli lalu menyelesaikan tahap. Contoh di data demo: `RL-HJ26-DTNG` (4 digit HP 2468).

## Aturan penting

- **Syarat selesai:** tombol "Selesaikan tahap" baru aktif setelah petugas mencentang semua syarat tahap itu (mis. Entri: "Data diinput ke SIAK", "NIK & KK cocok dengan database kependudukan") dan mengisi bukti bila diminta (mis. Pencetakan: nomor seri blangko / nomor akta; Penyerahan: diserahkan kepada). Semua tercatat di audit log dan timeline petugas. Pekerjaan sebenarnya tetap di SIAK/loket; Pantas mencatat dasar keputusannya.

- Tenggat dihitung dalam **jam kerja WIB** (08.00–16.00): malam, Sabtu, Minggu, dan hari libur di `/admin/libur` tidak dihitung.
- Saat status "Perlu Perbaikan", hitung mundur **dijeda**. Waktu menunggu warga tidak dihitung sebagai keterlambatan instansi.
- **Pemisahan tugas:** hanya peran pemilik tahap yang bisa menindaknya. Pimpinan hanya menyetujui tahap Persetujuan. Pimpinan dan Admin bisa *melihat* semua permohonan (label "Dipantau"), tapi tidak bisa menyelesaikan tahap peran lain, termasuk yang terlambat.
- Akun terakhir suatu peran pemegang tahap tidak bisa dinonaktifkan atau diganti perannya, supaya permohonan tidak macet tanpa petugas.
- Urutan tahap dan peran per layanan diatur di `/admin/layanan` (data awal di `scripts/demo-data.ts`).
