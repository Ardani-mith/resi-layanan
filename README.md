# Resi Layanan

Lacak permohonan layanan publik seperti melacak paket. Setiap tahap punya tenggat (SLA) dalam hari kerja yang terlihat oleh warga, dan tahap yang terlambat otomatis dieskalasi ke atasan.

Karya untuk **Web In Action, MIA 2026**, subtema *Public Service Tracking*. Skenario demo: **Disdukcapil Kota Harapan Jaya** (instansi fiktif) dengan 3 layanan, yaitu perekaman KTP-el, perubahan Kartu Keluarga, dan akta kelahiran.

## Tech stack

- **Next.js 16** (App Router, Cache Components, JavaScript) + **React 19**
- **Tailwind CSS 4**
- **MongoDB Atlas** + **Mongoose 9**
- **jose** (JWT sesi di cookie httpOnly), **bcryptjs**, **Zod 4**
- **Vitest** + **mongodb-memory-server** untuk pengujian
- Deploy di **Vercel**

## Cara menjalankan

Prasyarat: Node.js 20.9+ dan database MongoDB (Atlas M0 gratis sudah cukup).

```bash
git clone <url-repo-ini> resi-layanan
cd resi-layanan
npm install
cp .env.example .env.local   # isi MONGODB_URI, SESSION_SECRET, DEMO_PASSWORD
npm run seed                 # isi data demo (MENGHAPUS data lama)
npm run dev                  # buka http://localhost:3000
```

Perintah lain: `npm test` (unit + integrasi, tidak butuh Atlas), `npm run lint`, `npm run build`.

### Akun & resi demo

Kata sandi semua akun = nilai `DEMO_PASSWORD` di `.env.local`.

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
- 69 tes otomatis (SLA, alur kerja, eskalasi, privasi, integrasi database).
- Landing page & halaman masuk.
- Halaman lacak `/lacak/[resi]`: timeline per tahap dengan hitung mundur langsung, banner terlambat/eskalasi, perbaikan berkas, rating, detail pemohon setelah verifikasi HP, pembaruan otomatis, mode gelap.
- Pengajuan online `/ajukan` dan halaman sukses dengan nomor resi.

**Berikutnya**

- Antrean petugas `/kerja`, detail & aksi `/kerja/[resi]`, input loket `/kerja/baru`
- Dashboard pimpinan `/pantau`, rapor SLA publik `/rapor`, mode demo `/admin/demo`
