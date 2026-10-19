@AGENTS.md

# Resi Layanan: catatan untuk sesi berikutnya

Konteks lomba, jadwal, spesifikasi, dan prioritas: `../docs/HANDOFF-WIA.md`.

## Perintah

- `npm run check`: lint + cek format + tes unit/integrasi. Jalankan sebelum commit.
- `npm test`: Vitest (unit + integrasi dengan MongoDB in-memory, tidak butuh Atlas)
- `npm run test:e2e`: Playwright di Google Chrome. Server khusus (`scripts/e2e-server.mjs`): MongoDB in-memory + seed segar + build di `.next-e2e`, jadi aman walau `npm run dev` sedang berjalan dan tidak menyentuh Atlas.
- `npm run lint:fix` (termasuk urutan import), `npm run format` (Prettier + urutan class Tailwind)
- `npm run build`
- `npm run seed`: hapus & isi ulang DB dari `.env.local`

## Struktur folder

```
src/
├── app/                  # route (nama URL berbahasa Indonesia); client component khusus satu halaman ditaruh di folder route-nya
├── components/
│   ├── application/      # domain permohonan: ApplyForm, ResiSearch, StatusBadge, Timeline
│   ├── charts/           # ColumnChart, Meter, StatTile, trend
│   ├── layout/           # Navbar, Footer, LogoutButton, DemoClockBanner
│   └── ui/               # Alert, Button, Field, Skeleton
├── hooks/                # useNow, useAutoRefresh (client)
├── config/site.js        # semua teks landing
├── lib/                  # logika & akses data (lihat Arsitektur)
├── models/               # skema Mongoose
└── proxy.js
scripts/                  # seed, data demo, server e2e
tests/                    # Vitest
e2e/                      # Playwright (fixtures.js: openPage per peran, gagal jika ada error browser/5xx)
```

Kode dirapikan otomatis: ESLint (`simple-import-sort`: side-effect → node: → paket → `@/` → relatif, tanpa baris kosong) dan Prettier (lebar 110, plugin Tailwind). Daftar data panjang boleh `// prettier-ignore` agar tetap ringkas.

Konvensi: komponen PascalCase, hook `useXxx`, modul lib huruf kecil (kebab-case jika dua kata). Kode & nama berkas berbahasa Inggris, teks UI & komentar berbahasa Indonesia.

## Arsitektur

- `src/lib/` berisi logika murni yang bisa diuji tanpa DB: `sla.js` (hari kerja WIB, jeda, estimasi), `workflow.js` (mesin status, `applyAction`), `escalation.js` (`pendingEscalations` murni + `syncEscalations` ke DB), `present.js` (bentuk data publik/terverifikasi/petugas, satu-satunya tempat aturan privasi), `stats.js`.
- `src/lib/dal.js` (Data Access Layer, server-only) adalah satu pintu baca data untuk Server Component **dan** route API: `getTracking`, `getQueue`, `getStaffApplication`, `getStats`, `getActiveServices`, `getClockInfo`. Setiap fungsi menyambungkan DB dan mengambil jam sendiri. Halaman petugas memanggil `requireStaffPage(roles, from)` (redirect), sedangkan route API memakai `requireUser(roles)` (401/403).
- `src/lib/applications.js` berisi operasi tulis (create/aksi/verifikasi HP). Route API cukup tipis: `route()` + `requireUser()` + `parseBody()` dari `lib/api.js`.
- Mutasi dari UI: `postJson()` (`lib/http.js`, tidak pernah throw, hasil `{ ok, data }` / `{ ok: false, error: { message, fields } }`) ke route API, lalu `router.refresh()` atau pindah halaman. Data halaman selalu dari Server Component (tanpa fetch di client saat load).
- Class Tailwind kondisional: `cn()` (`lib/cn.js`, clsx + tailwind-merge yang sudah mengenal token warna kustom). Pesan form: `<Alert tone="error|success|warning">`. Ikon: `lucide-react` dengan `aria-hidden`.
- Form yang memuat data sensitif (login, pengajuan, catatan petugas, 4 digit HP) wajib `method="post"`: kalau terkirim sebelum hydration, data tidak bocor ke URL.
- Setelah aksi di `/kerja/[resi]`, petugas dikembalikan ke `/kerja?selesai=RESI&aksi=...` dengan konfirmasi (panel aksi bisa hilang karena tahap pindah peran).
- Model dan modul `lib/` yang dipakai `scripts/` wajib memakai import relatif berekstensi `.js` (bukan `@/`), karena seed dijalankan dengan Node biasa.
- `lib/session.js` dan `lib/api.js` bersifat `server-only`. `proxy.js` hanya boleh mengimpor `lib/jwt.js` dan `lib/roles.js`.

## Aturan yang sudah diputuskan

- **Cache Components aktif** (default Next 16.4). Data request-time (DB, cookies, params) dibaca di komponen async di dalam `<Suspense>`, dan komponen yang membaca DB memanggil `await connection()` dulu. Route API sudah dibungkus `route()`, yang memanggil `connection()`.
- `syncEscalations()` hanya untuk objek **lean**. Pada dokumen Mongoose, `push` di memori akan ikut di-`$push` ulang saat `save()`.
- `Application` memakai `optimisticConcurrency`: dua petugas yang menindak bersamaan → `VersionError` → 409.
- Ambang eskalasi dihitung dalam **hari kerja** (level 1 saat lewat tenggat, level 2 setelah +3 hari kerja).
- Waktu selalu diambil dari `getClock()` (jam nyata + offset mode demo), jangan `new Date()` langsung untuk logika SLA.
- `events` bersifat append-only: hook Mongoose melempar error saat update/delete. Seed menghapusnya lewat `Model.collection` secara sengaja.
- Format respons API: `{ data }` atau `{ error: { message, fields? } }`; key `fields` memakai path bertitik (`applicant.phone`).
- Status tahap untuk UI: `selesai | berjalan | dijeda | terlambat | menunggu | ditolak | dibatalkan`.
- Hitung mundur di browser: `hooks/useNow.js` (useSyncExternalStore; snapshot server = null → pakai `serverNow`, jadi tidak ada hydration mismatch). Format tanggal selalu lewat `lib/format.js` (zona waktu WIB eksplisit).
- `components/application/Timeline.js` dipakai halaman warga & petugas (`staff` menampilkan catatan internal). `components/application/ApplyForm.js` dipakai `/ajukan` & nanti `/kerja/baru` (`channel="loket"`).
- `lib/resi-format.js` aman untuk browser; `lib/resi.js` (generator) memakai node:crypto.
- `getClock()` dan `getCurrentUser()` dibungkus `React.cache`: satu pembacaan per render.
- Grafik: `components/charts/` (ColumnChart, Meter, StatTile) mengikuti skill dataviz: satu hue `--chart` (divalidasi untuk terang & gelap), tooltip hover + fokus, tabel alternatif. Prop ke Client Component harus bisa diserialisasi (`format="percent"`, bukan fungsi).
- Mode demo: `resetClock()` juga menghapus eskalasi bertanggal masa depan (hasil simulasi); audit log tidak disentuh.
- Design tokens ada di `src/app/globals.css` (bg-surface, text-muted, bg-late-soft, dst.); semua teks landing ada di `src/config/site.js`.
- Tema: `<html data-theme="light|dark">` dipasang skrip inline di `<head>` (`lib/theme.js`, dari localStorage atau tema OS) sebelum paint. Token gelap hanya di `:root[data-theme="dark"]`; varian `dark:` sudah diarahkan ke data-theme. Tombol: `components/layout/ThemeToggle.js` + `hooks/useTheme.js`. Hero & penutup landing memakai token `hero-*` (jangan `text-white`/`sky-*`).
