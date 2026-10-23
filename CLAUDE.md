@AGENTS.md

# Pantas (Pantau Tahapan Sipil): catatan untuk sesi berikutnya

Nama aplikasi: **Pantas** (dulu "Resi Layanan"; folder & repo masih `resi-layanan`). Nama, kepanjangan, dan huruf logo ada di `src/config/site.ts` (`name`, `expansion`, `mark`). Awalan nomor resi `RL-` (= resi layanan) sengaja tidak diubah.

Konteks lomba, jadwal, spesifikasi, dan prioritas: `../docs/HANDOFF-WIA.md`.

## Perintah

- `npm run check`: lint + cek tipe (`tsc`) + cek format + tes unit/integrasi. Jalankan sebelum commit.
- `npm run typecheck`: `tsc --noEmit` (mode `strict`)
- `npm test`: Vitest (unit + integrasi dengan MongoDB in-memory, tidak butuh Atlas)
- `npm run test:e2e`: Playwright di Google Chrome. Server khusus (`scripts/e2e-server.ts`): MongoDB in-memory + seed segar + build di `.next-e2e`, jadi aman walau `npm run dev` sedang berjalan dan tidak menyentuh Atlas.
- `npm run lint:fix` (termasuk urutan import), `npm run format` (Prettier + urutan class Tailwind)
- `npm run build`
- `npm run seed`: hapus & isi ulang DB dari `.env.local` dengan data demo lengkap
- `npm run seed:master`: upsert 3 layanan saja (tanpa menghapus apa pun); dipakai untuk DB `development`
- `npm run user:create -- --email … --name "…" [--role …] [--unit …]`: akun dengan kata sandi sementara (admin pertama); `--reset` = pemulihan

## Struktur folder

```
src/
├── app/                  # route (nama URL berbahasa Indonesia); client component khusus satu halaman ditaruh di folder route-nya
│   ├── (public)/         # halaman warga: navbar atas + footer (beranda, layanan, lacak + bukti PNG, ajukan, rapor, masuk)
│   └── (staff)/          # area petugas: top bar + tab bar HP; kerja/(antrean) = antrean dua panel; pantau, admin/{petugas,layanan,libur,demo}, akun
├── components/
│   ├── ui.tsx            # Button/buttonClass, Alert, Field, Skeleton, NotFoundView, DemoClockBanner
│   ├── SectionError.tsx  # batas error per bagian halaman (client, catchError)
│   ├── application/      # domain permohonan: ApplyForm, ResiSearch, StatusBadge, Timeline, ReceiptCard (QR + unduh/cetak)
│   ├── charts/           # index.tsx (StatTile, Meter, weeklyOnTime; server) + ColumnChart.tsx (client)
│   ├── landing/          # HeroSection, TrackingPreview, SummaryStats, CountUp, Decor (hiasan + ikon)
│   └── layout/           # PublicShell (Navbar+Footer), StaffShell (StaffTopBar + StaffTabBar), ThemeToggle
├── config/               # site.ts (semua teks landing), staff-nav.ts (menu petugas per peran: tab, dropdown Admin, menu akun)
├── lib/                  # logika & akses data (lihat Arsitektur); hooks.ts = hook client (useNow, useAutoRefresh, ...)
├── models.ts             # semua skema Mongoose (Application, Service, Event, AdminEvent, Setting, User)
└── proxy.ts
scripts/                  # seed (+ --master), create-user, demo-data, server e2e
tests/                    # Vitest
e2e/                      # Playwright (fixtures.ts: openPage per peran, gagal jika ada error browser/5xx)
```

Kode dirapikan otomatis: ESLint (`simple-import-sort`: side-effect → node: → paket → `@/` → relatif, tanpa baris kosong) dan Prettier (lebar 110, plugin Tailwind). Daftar data panjang boleh `// prettier-ignore` agar tetap ringkas.

Konvensi: TypeScript `strict`; komponen PascalCase, hook `useXxx`, modul lib huruf kecil (kebab-case jika dua kata). Kode & nama berkas berbahasa Inggris, teks UI & komentar berbahasa Indonesia. Modul kecil yang hanya dipakai satu tempat digabung ke pemakainya (mis. hook tema di `ThemeToggle.tsx`); jangan pecah lagi menjadi berkas 10–20 baris.

## Arsitektur

- `src/lib/` berisi logika murni yang bisa diuji tanpa DB: `sla.ts` (hari kerja WIB, jeda, estimasi), `workflow.ts` (mesin status, `applyAction`, **dan tipe domain**: `ApplicationData`, `Step`, `Status`, ...), `escalation.ts` (`pendingEscalations` murni + `syncEscalations` ke DB), `present.ts` (bentuk data publik/terverifikasi/petugas + masker nama/HP; satu-satunya tempat aturan privasi), `stats.ts`.
- `src/lib/dal.ts` (Data Access Layer, server-only) adalah satu pintu baca data untuk Server Component **dan** route API: `getTracking`, `getQueue`, `getStaffApplication`, `getStats`, `getActiveServices`, `getClockInfo`, `getStaffAccounts`. Setiap fungsi menyambungkan DB dan mengambil jam sendiri. Halaman petugas memanggil `requireStaffPage(roles, from)` (redirect), sedangkan route API memakai `requireUser(roles)` (401/403).
- `src/lib/applications.ts` berisi operasi tulis (create/aksi/verifikasi HP). Route API cukup tipis: `route()` + `requireUser()` + `parseBody()` dari `lib/api.ts` (juga tipe `ParamsOf`, `SearchParamsOf`, `firstParam` untuk halaman).
- Mutasi dari UI: `postJson<T>()` (`lib/http.ts`, tidak pernah throw, hasil `{ ok, data }` / `{ ok: false, error: { message, fields } }`; `formErrors()` mengubah error menjadi state form) ke route API, lalu `router.refresh()` atau pindah halaman. Data halaman selalu dari Server Component (tanpa fetch di client saat load).
- Tipe input API berasal dari skema Zod (`ApplicationInput`, `ActionInput`, ... di `validators.ts`, via `z.infer`); tipe data ke klien dari `present.ts`/`dal.ts` (`PublicView`, `Queue`, `ActiveService`, ...). Client Component cukup `import type` dari modul server (terhapus saat build).
- Class Tailwind kondisional: `cn()` (`lib/cn.ts`, clsx + tailwind-merge yang sudah mengenal token warna kustom). Pesan form: `<Alert tone="error|success|warning">`. Ikon: `lucide-react` dengan `aria-hidden`.
- Form yang memuat data sensitif (login, pengajuan, catatan petugas, 4 digit HP) wajib `method="post"`: kalau terkirim sebelum hydration, data tidak bocor ke URL.
- Setelah aksi di `/kerja/[resi]`, petugas dikembalikan ke `/kerja?selesai=RESI&aksi=...` dengan konfirmasi (panel aksi bisa hilang karena tahap pindah peran).
- `models.ts` dan modul `lib/` yang dipakai `scripts/` wajib memakai import relatif berekstensi `.ts` (bukan `@/`), karena skrip dijalankan langsung oleh Node (type stripping). Karena itu tsconfig memakai `verbatimModuleSyntax` (impor tipe wajib `import type`) dan `erasableSyntaxOnly` (tanpa enum/namespace/parameter property).
- Akun petugas: `lib/users.ts` (kata sandi bcrypt + kata sandi sementara, login, `loadSessionUser`, kelola akun; error lewat `AppError`). `PASSWORD_MIN` ada di `lib/roles.ts` (aman untuk browser). Halaman `/admin/petugas` (`StaffManager.tsx`) dan `/akun/kata-sandi`.
- Admin: `lib/admin.ts` (layanan, hari libur, dan `AdminEvent` = audit log semua tindakan admin termasuk akun petugas; `logAdminEvent` dipanggil dari users.ts/admin.ts, append-only). Error untuk pengguna: `AppError(status, message, fields)` di `workflow.ts` → respons lewat `route()`.
- Bukti resi: `lib/qr.ts` (server-only: `siteOrigin()` dari `SITE_URL`/header, QR SVG/PNG) → `ReceiptCard` di /ajukan/sukses, /lacak/[resi], /kerja/[resi]; gambar PNG di `/lacak/[resi]/bukti` (ImageResponse: `<div>` berisi >1 node wajib `display:flex`). Cetak: kelas `print-area` (globals.css).
- Peta lokasi layanan: `config/offices.ts` (MPP DKI + Sudin Dukcapil JP manual, ditambah ±312 kantor kelurahan/kecamatan se-DKI dari OpenStreetMap di `offices.json`, perbarui dengan `npm run data:offices`) → `components/application/OfficeMap.tsx` (Leaflet di browser, tile OSM + filter CSS `.map-tiles`). Pin & daftar mengikuti area peta (`moveend`), kelurahan baru tampil di zoom ≥ `KELURAHAN_ZOOM`, filter terbang ke lokasi terdekat jenis itu, `showMe()` dipanggil dari callback geolokasi. `defaultOpen={false}` = baris ringkas dulu (Leaflet belum dimuat). E2E menjawab request non-localhost dengan PNG kosong.
- Halaman warga menjawab "lalu saya harus apa?": /ajukan/sukses = urutan 4 langkah + berkas yang dibawa (`requirements` layanan dari `getTracking`) + peta ringkas; /lacak/[resi] = dua kolom (utama: ringkasan + progres, kartu `NextStep` per status, peta terbuka hanya saat warga perlu datang, timeline; samping sticky: bukti resi + detail pemohon). Pesan status jangan dibuat banner terpisah lagi; masukkan ke `NextStep`.
- **SLA dalam JAM KERJA** (Senin–Jumat 08.00–16.00 WIB, di luar libur; `sla.ts`: `addWorkHours`/`addWorkMs`, `workMsBetween`, `WORKDAY_HOURS = 8`). Field tahap `slaHours` (bukan hari). Verifikasi berkas 8 jam (1 hari kerja); tahap setelahnya total ≤ 8 jam = janji **Permendagri 19/2018** (dokumen terbit ≤ 24 jam setelah berkas lengkap): `issuePromise()` (sla.ts) → `publicView.issuePromise` (PromiseLine di /lacak) dan `promiseRate`/`avgIssueHours` di stats (rapor, pantau, beranda, katalog). Jeda: `resumeStep` menghitung ulang tenggat dari SISA jam kerja, `pausedWorkMs` mencatat jeda di jam kerja. Eskalasi level 2 = tenggat + 8 jam kerja. Tampilan selalu lewat `formatWorkHours` (format.ts) dan tenggat pakai `formatDateTime` (ada jamnya). Mode demo maju dalam jam kerja (+1 jam, +4 jam, +1 hari kerja).
- Email warga: `lib/notify.ts` (murni + `sendEmail` lewat Resend HTTP API jika `RESEND_API_KEY`/`EMAIL_FROM` ada, selain itu hanya log). Dipanggil dengan `after()` di route pengajuan & aksi petugas, agar tidak memperlambat/menggagalkan aksi.
- `lib/session.ts`, `lib/api.ts`, `lib/dal.ts`, `lib/qr.ts` bersifat `server-only` (jangan diimpor modul yang dites Vitest). `proxy.ts` hanya boleh mengimpor `lib/jwt.ts` dan `lib/roles.ts`.
- Modul yang diimpor Server Component tidak boleh mengimpor hook client (`useSyncExternalStore`, `useState`, ...): Turbopack menolak build. Hook client ada di `lib/hooks.ts` atau di dalam komponen `"use client"` pemakainya.

## Aturan yang sudah diputuskan

- **Cache Components aktif** (default Next 16.4). Data request-time (DB, cookies, params) dibaca di komponen async di dalam `<Suspense>`, dan komponen yang membaca DB memanggil `await connection()` dulu. Route API sudah dibungkus `route()`, yang memanggil `connection()`.
- `syncEscalations()` hanya untuk objek **lean**. Pada dokumen Mongoose, `push` di memori akan ikut di-`$push` ulang saat `save()`.
- **Pemisahan tugas:** `canActOn` = hanya peran pemilik tahap (+ loket untuk `perlu_perbaikan`); pimpinan/admin TIDAK punya bypass, mereka memantau (label "Dipantau" di antrean). `ensureRoleCovered` (users.ts) menolak menonaktifkan/mengganti peran akun aktif terakhir dari peran pemegang tahap. Tolak wajib centang konfirmasi final; panel "Selesaikan" menampilkan tahap & peran berikutnya.
- **Pengaman pengajuan** (`applications.ts`): `prepare()` dipanggil sebelum OTP dan saat membuat = layanan aktif, `checkNik` (present.ts, juga dipakai form di browser: format, tanggal lahir digit 7–12, pemohon ≥17 tahun kecuali KTP-el yang dicek bersama status kawin), pernyataan (`consent`, online), batas `DAILY_ONLINE_LIMIT` per NIK/HP per 24 jam. Online: POST tanpa `otp` → 202 `{ otpRequired, otpId, demoCode }` (model `Verification`, hash kode, 5 menit, 5x salah, 5 kode/jam per HP, TTL index); dengan `otp` → dibuat. Cek permohonan ganda (NIK + layanan masih berjalan) SETELAH OTP dan pesannya tanpa detail (UU PDP). Kode wilayah NIK sengaja tidak dipakai menolak: NIK tidak berubah saat pindah. Belum ada penyedia SMS/WA: kode tampil di layar (`demoCode`, sambungkan pengirim di route `api/applications`). Loket tanpa OTP & batas harian.
- **Lupa resi** (`/lacak/lupa`, `POST /api/track/recover`, `recoverResi`): NIK + HP → OTP SELALU dikirim (cocok atau tidak, anti-tebak NIK) → setelah kode benar baru daftar resi milik pasangan NIK + HP itu (maks. 10). Memakai `issueOtp`/`consumeOtp` yang sama dengan pengajuan.
- **Syarat selesai per tahap** (dasar keputusan petugas; pekerjaan nyatanya di SIAK/loket): template tahap punya `checklist`, `checkRequirements` (persyaratan layanan jadi item "Berkas asli diperiksa: …" saat permohonan dibuat) dan `evidenceLabel` (bukti wajib, mis. "Nomor seri blangko"). `applyAction("complete")` menolak (AppError 422, fields `checked`/`evidence`) bila belum lengkap; yang dicentang & bukti disimpan di tahap (`checked`, `evidence`) dan payload audit log. Hanya untuk petugas (`staffView`), tidak tampil publik. Diatur admin di Layanan & SLA; seed demo mengisi contoh dan `Sim.act` mencentang otomatis.
- `Application` memakai `optimisticConcurrency`: dua petugas yang menindak bersamaan → `VersionError` → 409.
- Ambang eskalasi dihitung dalam **jam kerja** (level 1 saat lewat tenggat, level 2 setelah +1 hari kerja / 8 jam kerja).
- Waktu selalu diambil dari `getClock()` (jam nyata + offset mode demo), jangan `new Date()` langsung untuk logika SLA.
- `events` bersifat append-only: hook Mongoose melempar error saat update/delete. Seed menghapusnya lewat `Model.collection` secara sengaja.
- Format respons API: `{ data }` atau `{ error: { message, fields? } }`; key `fields` memakai path bertitik (`applicant.phone`).
- Status tahap untuk UI: `selesai | berjalan | dijeda | terlambat | menunggu | ditolak | dibatalkan`.
- Hitung mundur di browser: `useNow` di `lib/hooks.ts` (useSyncExternalStore; snapshot server = null → pakai `serverNow`, jadi tidak ada hydration mismatch). Format tanggal selalu lewat `lib/format.ts` (zona waktu WIB eksplisit).
- `components/application/Timeline.tsx` dipakai halaman warga & petugas (`staff` menampilkan catatan internal). `components/application/ApplyForm.tsx` dipakai `/ajukan` & `/kerja/baru` (`channel="loket"`).
- `lib/resi.ts` aman untuk browser maupun server: format, normalisasi, dan generator (Web Crypto; alfabet 32 karakter → `byte & 31` tanpa bias). `randomCode()` juga dipakai untuk kata sandi sementara.
- `getClock()` dan `getCurrentUser()` dibungkus `React.cache`: satu pembacaan per render.
- Grafik: `components/charts/` (ColumnChart, Meter, StatTile) mengikuti skill dataviz: satu hue `--chart` (divalidasi untuk terang & gelap), tooltip hover + fokus, tabel alternatif. Prop ke Client Component harus bisa diserialisasi (`format="percent"`, bukan fungsi).
- Mode demo: `resetClock()` juga menghapus eskalasi bertanggal masa depan (hasil simulasi); audit log tidak disentuh.
- Design tokens ada di `src/app/globals.css` (bg-surface, text-muted, bg-late-soft, dst.); semua teks landing ada di `src/config/site.ts` (`as const`; nama ikon diketik sebagai `IconName`).
- **Sesi dicek ulang ke DB** di `getSession()`: JWT menyimpan `ver` (= `User.sessionVersion`), yang dinaikkan saat peran, status aktif, atau kata sandi berubah. Nama & peran untuk otorisasi diambil dari DB. proxy.ts hanya membaca token (tanpa DB), karena itu proxy tidak mengalihkan `/masuk` (bisa memantul untuk akun nonaktif).
- Kata sandi sementara (`mustChangePassword`): proxy (klaim `pwd`), `requireStaffPage`, dan `requireUser` mengarahkan/menolak semua kecuali `PASSWORD_PATH`; route ganti kata sandi memakai `requireUser(null, { allowTempPassword: true })`. Admin tidak bisa mengubah/menonaktifkan/me-reset akunnya sendiri dari `/admin/petugas` (selalu tersisa satu admin aktif).
- Email di skema Zod lewat `emailSchema` (trim dulu, baru cek format); jangan `z.email().trim()`.
- **Area petugas tanpa sidebar** (kebanyakan peran hanya 1–3 menu): `StaffTopBar` = tab menu per peran (`navFor`), bagian "Admin" sebagai dropdown (`ADMIN_SECTION`), cari resi ⌘K (resi valid → detail, teks lain → `/kerja?cari=`), chip jam demo (menggantikan `DemoClockBanner` di halaman petugas), menu akun (avatar: ganti sandi, halaman warga, tema, keluar). HP: `StaffTabBar` di bawah (maks. 4, sisanya "Lainnya"). Antrean dua panel di `kerja/(antrean)/layout.tsx` (daftar kiri, detail kanan, scroll masing-masing); halaman detail diberi `data-detail` dan CSS `group-has-[[data-detail]]` memilih panel di HP. Setelah aksi, `ActionPanel` pindah ke tugas berikutnya (`nextResi`, dari `getQueue` yang di-`cache`) dengan `?selesai=&aksi=` (`ACTION_DONE` di workflow.ts). Ganti kata sandi sementara memakai navigasi penuh (`window.location.replace`), bukan router (cache pengalihan lama).
- Layout: root layout hanya `<html>/<body>`; kerangka ada di route group. Menu petugas ditambah di `config/staff-nav.ts` (bukan di komponen). Top bar & tab bar memakai `usePathname`, jadi wajib di dalam `<Suspense>` (route dinamis `/kerja/[resi]`). 404: setiap group punya `not-found.tsx` sendiri (isi dari `NotFoundView`, kerangka dari layout group); alamat tak dikenal ditangkap `(public)/[...missing]`. Jangan memasang Navbar/Footer di not-found/error, nanti dobel di dalam layout group. `error.ts` group me-re-export `app/error.tsx`.
- Tema: `<html data-theme="light|dark">` dipasang skrip inline di `<head>` (`lib/theme.ts`, dari localStorage atau tema OS) sebelum paint. Token gelap hanya di `:root[data-theme="dark"]`; varian `dark:` sudah diarahkan ke data-theme. Tombol & hook `useTheme`: `components/layout/ThemeToggle.tsx`. Hero & penutup landing memakai token `hero-*` (jangan `text-white`/`sky-*`).
