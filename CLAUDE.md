@AGENTS.md

# Resi Layanan: catatan untuk sesi berikutnya

Konteks lomba, jadwal, spesifikasi, dan prioritas: `../docs/HANDOFF-WIA.md`.

## Perintah

- `npm test`: Vitest (unit + integrasi dengan MongoDB in-memory, tidak butuh Atlas)
- `npm run lint`, `npm run build`
- `npm run seed`: hapus & isi ulang DB dari `.env.local`

## Arsitektur

- `src/lib/` berisi logika murni yang bisa diuji tanpa DB: `sla.js` (hari kerja WIB, jeda, estimasi), `workflow.js` (mesin status, `applyAction`), `escalation.js` (`pendingEscalations` murni + `syncEscalations` ke DB), `present.js` (bentuk data publik/terverifikasi/petugas, satu-satunya tempat aturan privasi), `stats.js`.
- `src/lib/applications.js` berisi operasi DB yang dipakai route API. Route API cukup tipis: `route()` + `requireUser()` + `parseBody()` dari `lib/api.js`.
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
- Hitung mundur di browser: `components/useNow.js` (useSyncExternalStore; snapshot server = null → pakai `serverNow`, jadi tidak ada hydration mismatch). Format tanggal selalu lewat `lib/format.js` (zona waktu WIB eksplisit).
- `components/Timeline.js` dipakai halaman warga & petugas (`staff` menampilkan catatan internal). `components/ApplyForm.js` dipakai `/ajukan` & nanti `/kerja/baru` (`channel="loket"`).
- `lib/resi-format.js` aman untuk browser; `lib/resi.js` (generator) memakai node:crypto.
- Design tokens ada di `src/app/globals.css` (bg-surface, text-muted, bg-late-soft, dst.); semua teks landing ada di `src/config/site.js`.
