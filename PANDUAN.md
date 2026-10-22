# Panduan pribadi (HAPUS sebelum submit)

## 1. Atlas (sekali saja)

1. Buat cluster **M0** di cloud.mongodb.com (region Singapore/Jakarta).
2. Database Access → buat user + password.
3. Network Access → **Add IP → `0.0.0.0/0`** (wajib, karena IP Vercel berubah-ubah).
4. Connect → Drivers → salin URI, tambahkan nama database: `...mongodb.net/resi-layanan?retryWrites=true&w=majority`.

## 2. Lokal

```bash
cp .env.example .env.local
openssl rand -base64 48        # → SESSION_SECRET
npm run seed
npm run dev
```

Cek: http://localhost:3000/api/health → `{"status":"ok","db":"connected"}`.

## 3. Vercel

1. Push ke GitHub (repo **publik**), lalu Import Project di Vercel.
2. Environment Variables: `MONGODB_URI`, `SESSION_SECRET`, `DEMO_PASSWORD` (Production + Preview).
3. Setelah deploy, buka `https://<app>.vercel.app/api/health`.
4. Seed ke Atlas cukup dari laptop (`npm run seed` memakai `.env.local` yang menunjuk ke Atlas).

## 4. Sebelum demo / rekam video

- [ ] `npm run seed` (data segar; tanggal relatif terhadap hari ini)
- [ ] `/api/health` di URL live → connected
- [ ] Jam demo di-reset (admin → mode demo → reset)
- [ ] Coba di Chrome, Edge, Firefox, dan HP
- [ ] Siapkan cadangan offline: `npm run build && npm start` + MongoDB lokal

## 4b. Screenshot untuk PDF / proposal

Animasi landing page (judul naik, kartu melayang) bisa terulang saat Chrome mengambil
screenshot halaman penuh, sehingga judul tampak kosong. Sebelum capture:

1. DevTools → Ctrl/Cmd+Shift+P → ketik **"Emulate CSS prefers-reduced-motion: reduce"**.
2. Ctrl/Cmd+Shift+P → **"Capture full size screenshot"**.

Dengan pengaturan itu semua animasi langsung di keadaan akhir (ini juga yang dilihat
pengguna yang memilih "kurangi gerakan").

## 5. Alur demo (sesuai skrip di handoff)

1. Landing → "Kalau paket bisa dilacak, kenapa KTP tidak?"
2. Warga ajukan akta kelahiran → dapat resi
3. Login `loket@resi.demo` → selesaikan verifikasi
4. HP: buka `/lacak/<resi>` → timeline ter-update
5. Login `admin@resi.demo` → mode demo → majukan +2 hari kerja → tahap merah
6. Login `pimpinan@resi.demo` → eskalasi muncul
7. `/rapor` → dampak & roadmap

## Catatan teknis yang mudah terlupa

- `npm run seed` **menghapus semua data**, termasuk audit log.
- Simulasi waktu menggeser jam sistem (`clockOffsetMs` di koleksi `settings`), bukan mengubah data. Reset = kembali ke waktu nyata.
- Tanggal libur ada di `settings.holidays` (format `YYYY-MM-DD`). Seed baru berisi 25 Des 2026 & 1 Jan 2027; lengkapi dari SKB libur nasional 2026.
