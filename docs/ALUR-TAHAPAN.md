# Alur tahapan permohonan (contoh: Akta Kelahiran)

## Ringkasnya

Setiap permohonan berjalan berurutan dari satu tahap ke tahap berikutnya. Setiap tahap dipegang oleh **satu peran petugas** dan punya **tenggat dalam hari kerja**. Tahap berikutnya baru dimulai setelah petugas tahap sebelumnya menekan "selesai".

Tenggat dihitung dalam **jam kerja** (Senin–Jumat 08.00–16.00 WIB). Setelah berkas dinyatakan lengkap, dokumen terbit paling lama **24 jam / 1 hari kerja** (Permendagri 19/2018).

| # | Tahap | Dipegang oleh | Tenggat | Yang dikerjakan |
|---|---|---|---|---|
| 1 | Verifikasi berkas | Petugas Loket | 1 hari kerja (8 jam) | Cek kelengkapan berkas. Kalau kurang → status "Perlu Perbaikan" dan hitung mundur dijeda. Selesai = **berkas lengkap, janji 24 jam dimulai**. |
| 2 | Entri & validasi data | Petugas Teknis | 2 jam kerja | Input data ke sistem kependudukan dan cek kecocokannya. |
| 3 | Persetujuan & tanda tangan elektronik | **Pimpinan** | 1 jam kerja | Menyetujui dan menandatangani dokumen secara elektronik. |
| 4 | Pencetakan akta | Petugas Teknis | 1 jam kerja | Mencetak kutipan akta. |
| 5 | Siap diambil di loket | Petugas Loket | tanpa tenggat | Menyerahkan dokumen saat warga datang. Selesai setelah diserahkan. |

## Posisi di screenshot saat ini

> Screenshot ini diambil sebelum SLA diubah ke jam kerja. Dengan aturan sekarang, tahap Persetujuan bertenggat 1 jam kerja, bukan 1 hari kerja.

```
✔ Verifikasi berkas           selesai 14 Okt, tepat waktu
✔ Entri & validasi data       selesai 22 Okt, MELEWATI tenggat (tercatat di rapor)
▶ Persetujuan & TTE           ← SEKARANG di tangan PIMPINAN
                                sisa ±24 jam, tenggat Jum 23 Okt 16.07 WIB
○ Pencetakan akta             menunggu (Petugas Teknis)
○ Siap diambil di loket       menunggu (Petugas Loket)
```

- **Sekarang dipegang oleh: Pimpinan.** Di data demo, akunnya Drs. Hendra Gunawan (`pimpinan@resi.demo`). Permohonan ini muncul di antrean `/kerja` miliknya.
- Petugas Teknis sudah menyelesaikan tahap 2. Karena terlambat, keterlambatan itu tercatat permanen di timeline dan rapor SLA, tapi **tidak** menahan proses.
- Hitung mundur tahap 3 dimulai saat tahap 2 selesai: 1 hari kerja, berakhir Jumat 23 Okt pukul 16.07.
- Warga **tidak perlu melakukan apa pun**. Halaman lacak menampilkan "Tidak ada yang perlu Anda lakukan sekarang".

## Yang terjadi berikutnya

- **Pimpinan menyetujui tepat waktu** → tahap 4 (Pencetakan) otomatis pindah ke antrean Petugas Teknis.
- **Lewat tenggat** → tahap ditandai "Terlambat" dan otomatis dieskalasi: level 1 saat melewati tenggat, level 2 setelah +1 hari kerja (8 jam kerja). Eskalasi tampil di `/pantau`. Warga melihat "sudah diteruskan ke atasan petugas".
- **Setelah tahap 4** → status "Siap Diambil". Warga melihat peta lokasi dan daftar berkas yang dibawa.
- **Setelah diserahkan di loket** → status "Selesai" dan warga bisa memberi penilaian.

## Aturan penting

- Tenggat dihitung dalam **jam kerja WIB** (08.00–16.00): malam, Sabtu, Minggu, dan hari libur di `/admin/libur` tidak dihitung.
- Saat status "Perlu Perbaikan", hitung mundur **dijeda**. Waktu menunggu warga tidak dihitung sebagai keterlambatan instansi.
- **Pemisahan tugas:** hanya peran pemilik tahap yang bisa menindaknya. Pimpinan hanya menyetujui tahap Persetujuan. Pimpinan dan Admin bisa *melihat* semua permohonan (label "Dipantau"), tapi tidak bisa menyelesaikan tahap peran lain, termasuk yang terlambat.
- Akun terakhir suatu peran pemegang tahap tidak bisa dinonaktifkan atau diganti perannya, supaya permohonan tidak macet tanpa petugas.
- Urutan tahap dan peran per layanan diatur di `/admin/layanan` (data awal di `scripts/demo-data.ts`).
