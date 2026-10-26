@AGENTS.md

# Pantas (Pantau Tahapan Sipil): catatan untuk sesi berikutnya

Nama aplikasi **Pantas** (folder & repo masih `resi-layanan`; awalan resi `RL-` sengaja tetap). Nama, kepanjangan, dan huruf logo di `src/config/site.ts`. Konteks lomba, jadwal, dan prioritas: `../docs/HANDOFF-WIA.md`; catatan pribadi deploy/demo: `../docs/PANDUAN-PRIBADI.md` (di luar repo).

## Perintah

- `npm run check`: lint + `tsc` + cek format + Vitest. Jalankan sebelum commit.
- `npm run test:e2e`: Playwright (Chrome). `scripts/e2e-server.ts` = MongoDB in-memory + seed segar + build di `.next-e2e` (aman walau `npm run dev` jalan; tidak menyentuh Atlas).
- `npm run lint:fix` (termasuk urutan import), `npm run format` (Prettier + urutan class Tailwind).
- `npm run seed` (hapus & isi ulang data demo dari `.env.local`), `seed:master` (upsert 3 layanan saja), `user:create -- --email … --name "…"` (`--reset` = pemulihan), `data:offices`, `sprite:sheet`.

## Struktur

```
src/
├── app/            # route berbahasa Indonesia; client component khusus satu halaman di folder route-nya
│   ├── (public)/   # halaman warga; layout.tsx = navbar + footer
│   ├── (staff)/    # area petugas: top bar + tab bar HP; kerja/(antrean) = antrean dua panel; pantau, admin/*, akun
│   └── api/        # route tipis (lihat Arsitektur); /api/stats = data terbuka rapor
├── components/
│   ├── ui.tsx      # Button, Alert, Field, Skeleton, NotFoundView, DemoClockBanner, SectionLabel, PageHeader
│   ├── application/# ApplyForm, ResiSearch, Badges (StatusBadge, ChannelBadge, STEP_STATE), Timeline, ReceiptCard, OfficeMap, DocumentArt
│   ├── charts/     # index.tsx (server) + ColumnChart.tsx (client)
│   ├── landing/    # HeroSection (+ data kantor), SummaryStats, CountUp, Scene
│   ├── office/     # kantor pixel-art: layout.ts (denah), engine.ts (jalur & karakter), PixelOffice.tsx (Canvas)
│   └── layout/     # StaffShell (top bar, tab bar, IdleGuard), ThemeToggle
├── config/         # site.ts (teks landing), staff-nav.ts (menu petugas per peran), offices.ts/json (peta)
├── lib/            # logika & data (lihat Arsitektur)
├── models.ts       # semua skema Mongoose
└── proxy.ts
scripts/            # seed, demo-data, create-user, e2e-server, fetch-offices, pixel-sheet
tests/              # Vitest: utils (murni), sla, workflow, users & integration (MongoDB in-memory)
e2e/                # Playwright (fixtures.ts: openPage per peran, gagal bila ada error browser/5xx)
design/sprites/     # sumber lembar karakter AI (tidak diserve)
```

## Konvensi

- TypeScript `strict`; kode & nama berkas berbahasa Inggris, teks UI & komentar berbahasa Indonesia. Komponen PascalCase, hook `useXxx`, modul lib huruf kecil.
- ESLint `simple-import-sort` + Prettier (lebar 110, plugin Tailwind). Data panjang boleh `// prettier-ignore`.
- **Jangan pecah berkas kecil**: modul/komponen yang hanya dipakai satu tempat digabung ke pemakainya; ekspor hanya yang dipakai di luar berkas.
- `models.ts` dan `lib/` yang dipakai `scripts/` memakai import relatif berekstensi `.ts` (Node type stripping) → tsconfig `verbatimModuleSyntax` + `erasableSyntaxOnly`.
- Class kondisional `cn()` (lib/cn.ts, tailwind-merge mengenal token warna). Pesan form `<Alert tone="error|success|warning">`. Ikon `lucide-react` + `aria-hidden`. Form berisi data sensitif wajib `method="post"`.

## Arsitektur

- **Murni (dites tanpa DB):** `sla.ts` (jam kerja WIB, jeda, estimasi), `workflow.ts` (mesin status `applyAction`, tipe domain, `AppError`), `escalation.ts` (`pendingEscalations` + sinkronisasi lazy ke DB), `present.ts` (bentuk data publik/terverifikasi/petugas: satu-satunya tempat aturan privasi tampilan), `stats.ts`, `resi.ts`, `format.ts` (tanggal selalu WIB).
- **Baca:** `dal.ts` (server-only) = satu pintu untuk Server Component & route API; tiap fungsi menyambung DB & mengambil jam sendiri. Halaman petugas `requireStaffPage(roles, from)`, API `requireUser(roles)`.
- **Tulis:** `applications.ts` (pengajuan, aksi, OTP, lupa resi), `users.ts` (akun), `admin.ts` (layanan, libur, `AdminEvent`). Route API = `route()` + `requireUser()` + `parseBody()` (lib/api.ts). Respons `{ data }` atau `{ error: { message, fields? } }` (path bertitik).
- **Dari UI:** `postJson()` (lib/http.ts, tidak pernah throw) → `router.refresh()`/pindah halaman. Data halaman selalu dari Server Component. Input API bertipe dari Zod (`validators.ts`), data ke klien dari `present.ts`/`dal.ts` (client cukup `import type`).
- **Batas modul:** `session.ts`, `api.ts`, `dal.ts`, `qr.ts` server-only (jangan diimpor modul yang dites Vitest). `proxy.ts` hanya mengimpor `jwt.ts` & `roles.ts`. Modul yang diimpor Server Component tidak boleh mengimpor hook client (hook ada di `lib/hooks.ts`).
- **Cache Components aktif:** data request-time dibaca di komponen async di dalam `<Suspense>`; `route()` memanggil `connection()`. `getClock()` & `getCurrentUser()` dibungkus `React.cache`. Halaman yang ditinggalkan **disembunyikan** `<Activity>` (bukan dibuang): state sementara (pending, kata sandi, isian warga terkirim, menu terbuka) direset dengan `useResetOnHide` (hooks.ts).
- Waktu selalu dari `getClock()` (jam nyata + offset mode demo), bukan `new Date()`, untuk logika SLA. Email warga: `notify.ts` lewat `after()` (Resend jika ada API key, selain itu log).

## Aturan domain

- **Status:** `menunggu_kedatangan → diajukan → diproses → siap_diambil → selesai`, plus `perlu_perbaikan` (SLA dijeda) dan `ditolak` (alasan wajib, terlihat warga). Status tahap UI: `selesai | berjalan | dijeda | terlambat | menunggu | ditolak | dibatalkan`.
- **SLA dalam jam kerja** (Senin–Jumat 08.00–16.00 WIB, di luar libur; `slaHours`). Verifikasi 8 jam; tahap sesudahnya ≤ 8 jam = janji Permendagri 19/2018 (`issuePromise`, `promiseRate`). Jeda menghitung ulang dari sisa jam kerja. Eskalasi lazy & idempoten: level 1 saat lewat tenggat (Kasi), level 2 setelah +8 jam kerja (Kabid); `syncEscalations()` hanya untuk objek lean.
- **Pemisahan tugas:** `canActOn` = hanya peran pemilik tahap; berkas yang menunggu warga (`WAITING_CITIZEN_STATUSES`) ditangani loket. Pimpinan/admin memantau tanpa bypass. `ensureRoleCovered` mencegah akun aktif terakhir suatu peran dinonaktifkan. Syarat selesai per tahap (`checklist`, `checkRequirements`, `evidenceLabel`) wajib lengkap sebelum `complete`; hanya terlihat petugas.
- **Layanan wajib hadir** (`requiresVisit`, KTP-el): pengajuan online = pendaftaran awal `menunggu_kedatangan` tanpa tenggat; aksi `arrive` (loket, tab "Menunggu datang") memulai tahap 1. Lewat 10 hari kerja tanpa datang → batal otomatis (`expireArrival`, event `expired`) agar NIK tidak terkunci cek permohonan ganda.
- **Pengajuan:** `prepare()` sebelum OTP & saat membuat (layanan aktif, `checkNik`, consent online, `DAILY_ONLINE_LIMIT`). Online: tanpa `otp` → 202 + kode (mode demo tampil di layar; belum ada SMS); dengan `otp` → dibuat. Cek permohonan ganda SETELAH OTP, pesan tanpa detail. Loket tanpa OTP & batas harian. Lupa resi: OTP selalu dikirim (anti-tebak NIK).
- **NIK** tidak disimpan apa adanya (`pii.ts`): `nikHash` (HMAC, semua pencarian & OTP), `nikEnc` (AES-256-GCM, `decryptNik`), `nikMasked` (tampilan petugas). Kunci HKDF dari `PII_SECRET`/`SESSION_SECRET`: seed & server wajib rahasia yang sama, jangan diganti setelah ada data.
- **Akun & sesi:** login 5x salah → kunci 15 menit (reset admin membuka). JWT menyimpan `ver` (= `User.sessionVersion`, naik saat peran/status/kata sandi berubah) dan `auth` (waktu login); kedaluwarsa 30 menit sejak aktivitas, maks. 12 jam (`roles.ts`). `IdleGuard` memperpanjang lewat `POST /api/auth/activity` saat klik/ketik (refresh otomatis tidak), peringatan 2 menit. Kata sandi sementara: hanya `PASSWORD_PATH` yang boleh dibuka. proxy hanya membaca token (tanpa DB), jadi tidak mengalihkan `/masuk`.
- `events` append-only (hook Mongoose menolak update/delete; seed menghapus lewat `Model.collection`). `Application` memakai `optimisticConcurrency` (aksi bersamaan → 409). Mode demo `resetClock()` menghapus eskalasi bertanggal masa depan.

## UI

- Root layout hanya `<html>/<body>`; kerangka di route group. 404 per group (`NotFoundView`), alamat tak dikenal ditangkap `(public)/[...missing]`; `error.ts` group me-re-export `app/error.tsx`. Jangan pasang navbar di not-found/error.
- **Area petugas tanpa sidebar:** `StaffTopBar` (tab per peran dari `config/staff-nav.ts`, dropdown Admin, cari resi ⌘K, chip jam demo, menu akun), `StaffTabBar` di HP (maks. 4). Antrean dua panel di `kerja/(antrean)/layout.tsx` (`data-detail` + `group-has-[[data-detail]]` untuk HP). Setelah aksi, `ActionPanel` pindah ke tugas berikutnya dengan `?selesai=&aksi=` (`ACTION_DONE`).
- **Halaman warga** menjawab "lalu saya harus apa?": kartu `NextStep` per status di /lacak (jangan banner terpisah), urutan langkah + berkas dibawa di /ajukan/sukses, peta terbuka hanya saat warga perlu datang.
- **Identitas visual = struk resi:** IBM Plex Mono untuk angka & resi, token `paper`/`paper-line`/`ink-soft`, utilitas `receipt-edge-top` & `rule-dashed`, `SectionLabel`/`PageHeader`. Hindari pola template (label pil, grid ikon seragam, latar gradien). Token di `globals.css`; teks landing di `site.ts`; hero memakai token `hero-*`.
- **Tema:** skrip inline (`lib/theme.ts`) memasang `<html data-theme>` sebelum paint; `dark:` mengikuti data-theme; tombol di `ThemeToggle.tsx`.
- **Grafik** (`components/charts/`): satu hue `--chart`, tooltip hover + fokus, tabel alternatif; prop ke client harus bisa diserialisasi.
- **Peta** (`OfficeMap.tsx`, Leaflet + OSM): data `config/offices.ts` + `offices.json` (`npm run data:offices`); pin mengikuti area peta.
- **Bukti resi:** `qr.ts` (`siteOrigin()` dari `SITE_URL`/header) → `ReceiptCard`; PNG di `/lacak/[resi]/bukti` (ImageResponse: `<div>` berisi >1 node wajib `display:flex`); cetak via kelas `print-area`.
- **Kantor transparan** (hero): Canvas 2D pixel-art, teknik & aset Pixel Agents (MIT, `public/office/pixel/LICENSE.txt`). `layout.ts` = denah petak 16 px (`ZONES`, `FURNITURE` dengan `bg`/`surface`+`dy`/`front`/`frames`, dekorasi tanpa aset digambar di `PAINTERS`, `RUGS`, `SIGN`, `STAFF`, `WAITING_SEATS`, `WALKERS`). `engine.ts`: BFS per petak, state machine, frame lembar 7×3 (jalan 0–2, ketik 3–4, baca 5–6; baris bawah/atas/kanan, kiri = cermin). Isi mengikuti data (petugas bekerja bila zonanya ada berkas, zona terlambat berbingkai merah); teks di lapisan HTML; animasi hanya saat `playing` (tombol Jeda/Putar, WCAG 2.2.2). Ubah denah → jalankan tes (tujuan pejalan harus terjangkau). Karakter baru: lembar AI latar hijau 7×3 tanpa meja di `design/sprites/` → `npm run sprite:sheet -- <src> public/office/pixel/chars/<nama>.png [--copy b1k4=b1k5]` → petakan di `SHEETS`. Warga masih memakai karakter pengganti `char_1`/`char_5`.
