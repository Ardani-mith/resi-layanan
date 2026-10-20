# Resi Layanan

Lacak permohonan layanan publik seperti melacak paket. Setiap tahap punya tenggat (SLA) dalam hari kerja yang terlihat oleh warga, dan tahap yang terlambat otomatis dieskalasi ke atasan.

Karya untuk **Web In Action, MIA 2026**, subtema *Public Service Tracking*. Skenario demo: **Disdukcapil Kota Harapan Jaya** (instansi fiktif) dengan 3 layanan, yaitu perekaman KTP-el, perubahan Kartu Keluarga, dan akta kelahiran.

## Tech stack

- **Next.js 16** (App Router, Cache Components) + **React 19** + **TypeScript** (`strict`)
- **Tailwind CSS 4**
- **MongoDB Atlas** + **Mongoose 9**
- **jose** (JWT sesi di cookie httpOnly), **bcryptjs**, **Zod 4**
- **Vitest** + **mongodb-memory-server** untuk pengujian
- Deploy di **Vercel**

## Cara menjalankan

Prasyarat: Node.js 22.18+ (skrip `.ts` dijalankan langsung oleh Node) dan database MongoDB (Atlas M0 gratis sudah cukup).

```bash
# Sudah punya foldernya? Lewati 2 baris ini, cukup cd ke folder proyek.
git clone https://github.com/Ardani-mith/resi-layanan.git
cd resi-layanan
npm install
cp .env.example .env.local   # isi MONGODB_URI, SESSION_SECRET, DEMO_PASSWORD
npm run seed                 # isi data demo (MENGHAPUS data lama)
npm run dev                  # buka http://localhost:3000
```

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm run check` | lint + cek tipe + cek format + tes unit/integrasi |
| `npm test` | tes unit & integrasi (MongoDB in-memory, tidak butuh Atlas) |
| `npm run test:e2e` | tes end-to-end di Google Chrome (database sementara, tidak menyentuh Atlas) |
| `npm run lint:fix` / `npm run format` | rapikan kode otomatis (ESLint + Prettier) |
| `npm run build` | build produksi |
| `npm run seed:master` | isi 3 layanan saja, tanpa menghapus data apa pun |
| `npm run user:create -- --email … --name "…"` | buat akun (bawaan: admin) dengan kata sandi sementara; `--reset` untuk pemulihan |

### Akun petugas (database tanpa data demo)

Tidak ada pendaftaran lewat web. Alurnya:

1. Admin pertama dibuat dari terminal: `npm run user:create -- --email admin@instansi.go.id --name "Nama Admin"`.
   Kata sandi sementara tampil sekali di terminal.
2. Admin login → wajib ganti kata sandi → buka **Petugas** (`/admin/petugas`) untuk menambah petugas loket,
   teknis, pimpinan, atau admin lain. Setiap akun baru mendapat kata sandi sementara untuk diserahkan langsung.
3. Petugas login pertama kali → wajib ganti kata sandi sebelum bisa membuka antrean.
4. Admin bisa mengubah nama/peran/unit, me-reset kata sandi, dan menonaktifkan akun (bukan menghapus, agar
   audit log tetap utuh). Ganti peran, reset, atau nonaktif membuat sesi petugas itu langsung berakhir.

Lupa kata sandi admin: `npm run user:create -- --email <email-admin> --reset`.

### Akun & resi demo

Kata sandi semua akun = nilai `DEMO_PASSWORD` di `.env.local`.

| Peran          | Email                  |
| -------------- | ---------------------- |
| Petugas loket  | `loket@resi.demo`    |
| Petugas teknis | `teknis@resi.demo`   |
| Pimpinan       | `pimpinan@resi.demo` |
| Admin          | `admin@resi.demo`    |

| Resi             | Kondisi                      | 4 digit HP |
| ---------------- | ---------------------------- | ---------- |
| `RL-HJ26-AKTA` | Terlambat & dieskalasi       | 1234       |
| `RL-HJ26-PRBK` | Perlu perbaikan              | 5678       |
| `RL-HJ26-SLSE` | Selesai, belum diberi rating | 4321       |
| `RL-HJ26-TLAK` | Ditolak                      | 8765       |

## Progress

**Sudah selesai (fondasi, 18 Okt 2026)**

- Model data: layanan, permohonan (tahapan disalin ke dokumen permohonan sebagai snapshot), audit log *append-only*, pengaturan sistem.
- Mesin alur kerja: `diajukan → diproses → siap_diambil → selesai`, ditambah `perlu_perbaikan` (SLA dijeda) dan `ditolak` (alasan wajib diisi).
- SLA dalam hari kerja WIB (melewati akhir pekan & tanggal libur), estimasi tanggal selesai.
- Eskalasi dihitung saat data dibaca dan ditulis secara idempoten (Kasi → Kabid), tanpa cron.
- Resi acak `RL-XXXX-XXXX` tanpa karakter ambigu.
- Privasi: nama disamarkan di tampilan publik, detail terbuka setelah verifikasi 4 digit HP (dengan batas percobaan), NIK tidak pernah ditampilkan.
- API: pengajuan online & loket, lacak publik, antrean per peran, aksi petugas, KPI/rapor, simulasi waktu demo.
- Login petugas & proteksi halaman per peran.
- Seed: 3 layanan, 6 akun, 60 permohonan hasil simulasi alur kerja nyata.
- 75 tes unit/integrasi (SLA, alur kerja, eskalasi, privasi, mode demo, database) dan 14 tes end-to-end di browser yang memerankan skrip demo.
- Landing page & halaman masuk petugas.
- **Warga:** lacak `/lacak/[resi]` (timeline, hitung mundur langsung, verifikasi HP, perbaikan berkas, rating, pembaruan otomatis), pengajuan online `/ajukan` + halaman sukses.
- **Petugas:** antrean `/kerja` (urut sisa SLA, filter, pencarian), detail & aksi `/kerja/[resi]` (selesaikan, minta perbaikan, lanjutkan, tolak, audit log), input loket `/kerja/baru`.
- **Pimpinan:** dashboard `/pantau` (KPI, eskalasi terbuka, tren mingguan, analisis bottleneck per tahap).
- **Publik:** rapor SLA `/rapor`.
- **Admin:** mode demo `/admin/demo` (majukan jam sistem, kembali ke waktu nyata).
- Responsif (HP & desktop), mode gelap, diuji end-to-end di browser.

**Berikutnya (Fix It, 8–10 Nov)**

- QR code & unduh bukti resi
- Notifikasi email perubahan status
- Kelola layanan, SLA, dan libur dari halaman admin (akun petugas sudah bisa dikelola di `/admin/petugas`)
