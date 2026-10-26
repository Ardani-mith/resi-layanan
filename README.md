# Pantas: Pantau Tahapan Sipil

Lacak permohonan layanan publik seperti melacak paket. Setiap tahap punya tenggat (SLA) dalam jam kerja yang terlihat oleh warga, dan tahap yang terlambat otomatis dieskalasi ke atasan.

Karya untuk **Web In Action, MIA 2026**, subtema *Public Service Tracking*. Skenario demo: **Disdukcapil Kota Harapan Jaya** (instansi fiktif) dengan 3 layanan: perekaman KTP-el, perubahan Kartu Keluarga, dan akta kelahiran.

## Fitur

- **Warga:** pengajuan online (NIK lebih dulu, verifikasi OTP), lacak `/lacak/[resi]` dengan timeline & hitung mundur, bukti resi ber-QR, lupa resi, rating, peta lokasi layanan, katalog `/layanan`, rapor SLA publik `/rapor`.
- **Petugas:** antrean dua panel per peran, syarat selesai & bukti per tahap, input warga di loket, pembeda kanal online/loket, audit log.
- **Pimpinan:** dashboard `/pantau` (KPI, eskalasi, tren, bottleneck per tahap).
- **Admin:** petugas, layanan & SLA, hari libur, mode demo (simulasi waktu). Semua tindakan tercatat.
- **Aturan layanan:** SLA jam kerja WIB (Senin–Jumat 08.00–16.00, di luar libur), janji terbit ≤ 24 jam setelah berkas lengkap (Permendagri 19/2018), jeda saat perlu perbaikan, layanan wajib hadir (KTP-el) yang tenggatnya baru berjalan saat warga datang. Alurnya dijelaskan di [docs/ALUR-TAHAPAN.md](docs/ALUR-TAHAPAN.md).
- **Keamanan & privasi (UU PDP):** NIK tidak disimpan apa adanya (hash + enkripsi + tersamar), nama & HP disamarkan di halaman publik, login dikunci setelah 5x salah, sesi petugas berakhir setelah 30 menit diam (maks. 12 jam), pemisahan tugas per peran.
- **Kantor transparan** di beranda: denah pixel-art yang isinya mengikuti data antrean asli.

## Tech stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript `strict` · Tailwind CSS 4 · MongoDB + Mongoose 9 · jose · bcryptjs · Zod 4 · Vitest + mongodb-memory-server · Playwright · Vercel.

## Menjalankan di lokal

Prasyarat: Node.js 22.18+ (skrip `.ts` dijalankan langsung oleh Node) dan database MongoDB (Atlas M0 gratis cukup).

```bash
git clone https://github.com/Ardani-mith/resi-layanan.git && cd resi-layanan
npm install
cp .env.example .env.local   # isi MONGODB_URI, SESSION_SECRET (openssl rand -base64 48), DEMO_PASSWORD
npm run seed                 # data demo (MENGHAPUS data lama)
npm run dev                  # http://localhost:3000
```

| Perintah | Fungsi |
|---|---|
| `npm run check` | lint + cek tipe + cek format + tes unit/integrasi |
| `npm test` / `npm run test:e2e` | tes unit & integrasi / end-to-end di Chrome (database sementara, tidak menyentuh Atlas) |
| `npm run lint:fix` / `npm run format` | rapikan kode otomatis |
| `npm run seed:master` | isi 3 layanan saja, tanpa menghapus data |
| `npm run user:create -- --email … --name "…"` | akun (bawaan: admin) dengan kata sandi sementara; `--reset` untuk pemulihan |
| `npm run data:offices` | perbarui daftar kantor layanan dari OpenStreetMap |
| `npm run sprite:sheet -- <sumber> <hasil.png>` | ubah lembar karakter AI (latar hijau) jadi sprite kantor pixel-art |

## Akun & resi demo

Kata sandi semua akun = `DEMO_PASSWORD`.

| Peran | Email |
|---|---|
| Petugas loket | `loket@resi.demo` |
| Petugas teknis | `teknis@resi.demo` |
| Pimpinan | `pimpinan@resi.demo` |
| Admin | `admin@resi.demo` |

| Resi | Kondisi | 4 digit HP |
|---|---|---|
| `RL-HJ26-AKTA` | Terlambat & dieskalasi | 1234 |
| `RL-HJ26-PRBK` | Perlu perbaikan | 5678 |
| `RL-HJ26-SLSE` | Selesai, belum diberi rating | 4321 |
| `RL-HJ26-TLAK` | Ditolak | 8765 |
| `RL-HJ26-DTNG` | KTP-el daftar online, menunggu kedatangan | 2468 |

Tanpa data demo, tidak ada pendaftaran lewat web: admin pertama dibuat dengan `npm run user:create`, lalu admin menambah petugas di `/admin/petugas`. Setiap akun baru wajib mengganti kata sandi sementara saat login pertama.

## Deploy ke Vercel

1. **MongoDB Atlas:** buat cluster M0, user database, dan izinkan Network Access `0.0.0.0/0` (IP Vercel berubah-ubah). Salin URI dan tambahkan nama database (`…mongodb.net/resi-layanan?retryWrites=true&w=majority`).
2. **Vercel:** Import Project dari GitHub, lalu isi Environment Variables (Production + Preview):
   - Wajib: `MONGODB_URI`, `SESSION_SECRET`, `DEMO_PASSWORD`.
   - Opsional: `SITE_URL` (alamat publik untuk QR & email), `PII_SECRET`, `RESEND_API_KEY` + `EMAIL_FROM`.
   - `SESSION_SECRET` (atau `PII_SECRET`) juga kunci perlindungan NIK: **pakai nilai yang sama** dengan `.env.local` yang dipakai untuk seed, dan jangan diganti setelah ada data.
3. **Seed** dari laptop: `npm run seed` dengan `.env.local` yang menunjuk ke Atlas.
4. **Cek:** buka `https://<app>.vercel.app/api/health` → `{"status":"ok","db":"connected"}`.

## Data terbuka

`GET /api/stats`: rapor SLA dalam JSON (agregat, tanpa data pribadi), sama dengan halaman `/rapor`.

## Kredit

Aset & teknik kantor pixel-art dari [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) (MIT); lihat `public/office/pixel/LICENSE.txt`. Karakter petugas dibuat khusus untuk Pantas (sumber di `design/sprites/`).
