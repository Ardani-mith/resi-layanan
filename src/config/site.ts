// SEMUA teks landing page ada di sini. Urutan bagian mengikuti pitch deck:
// hero (cek resi) → rapor ringkas → masalah → cara kerja → fitur → penutup.

export const site = {
  name: "Pantas",
  /** Kepanjangan nama: PANTAS = Pantau Tahapan Sipil (sekaligus "pantas" = layak). */
  expansion: "Pantau Tahapan Sipil",
  agency: "Disdukcapil Kota Harapan Jaya",
  tagline: "Kalau paket bisa dilacak, kenapa KTP tidak?",
  description:
    "Lacak permohonan layanan publik seperti melacak paket: setiap tahap punya tenggat yang terlihat warga, dan keterlambatan otomatis naik ke atasan.",
  demoNotice: "Instansi dan data pada situs ini fiktif.",
  /** Lomba tempat karya ini dibuat (logo di footer). */
  event: {
    competition: "Web In Action",
    name: "Multimedia In Action 2026",
    url: "https://www.mia2026.com",
    logo: "/brand/mia2026.webp",
  },
  /** Penjelasan latar demo: Pantas dipasang per instansi; Kota Harapan Jaya = instansi contoh. */
  demo: {
    badge: "Instansi demo",
    note: "Pantas dipasang per Disdukcapil, dengan tahapan & tenggat yang diatur masing-masing instansi. Demo ini memakai instansi contoh Kota Harapan Jaya (fiktif); peta memakai kantor nyata di DKI Jakarta sebagai contoh lokasi.",
    mapBadge: "Contoh lokasi · DKI Jakarta",
  },

  hero: {
    kicker: "Pelacakan permohonan Dukcapil",
    // Satu elemen = satu baris yang dianimasikan muncul bergantian.
    titleLines: ["Tau pasti permohonan", "Anda sampai di mana,", "dan kapan selesai."],
    body: "Masukkan nomor resi dari loket atau pengajuan online. Tanpa login, tanpa antre bertanya.",
    exampleResi: "RL-HJ26-AKTA",
    highlights: ["Nama pemohon disamarkan", "Tenggat tiap tahap terlihat", "Terlambat? Naik ke atasan"],
    // Denah "kantor transparan" di hero: isi ruangan dari data permohonan asli.
    office: {
      label: "Kantor transparan",
      caption: "berkas yang sedang berjalan, per ruangan",
      live: "data langsung",
    },
  },

  summary: {
    title: "Rapor SLA hari ini",
    body: "Janji waktu yang bisa dicek siapa pun, dihitung langsung dari data permohonan.",
    cta: "Lihat rapor lengkap",
  },

  // VERIFIKASI ULANG angka & sumber sebelum submit (lihat docs/HANDOFF-WIA.md §2).
  problem: {
    title: "Masalahnya bukan hanya lambat, tapi gelap.",
    body: "Warga tidak tau berkasnya di meja siapa, kapan selesai, dan ke mana harus mengadu ketika molor. Laporan Ombudsman RI menunjukkan pola yang sama di banyak daerah.",
    stats: [
      { value: "38,0%", label: "laporan penundaan berlarut", source: "Ombudsman RI Perwakilan Sulsel, 2025" },
      {
        value: "30,1%",
        label: "laporan penundaan berlarut; administrasi kependudukan terbanyak",
        source: "Ombudsman RI Perwakilan Riau, 2025",
      },
      {
        value: "35,6%",
        label: "laporan penyimpangan prosedur (2021–2025)",
        source: "Ombudsman RI Perwakilan Bengkulu",
      },
    ],
    // Perbandingan: hari ini vs dengan Pantas (tabel di beranda).
    compare: [
      {
        topic: "Posisi berkas",
        today: 'Tanya ke loket, dijawab "masih diproses"',
        pantas: "Terlihat per tahap, di meja peran siapa",
      },
      {
        topic: "Kapan selesai",
        today: "Tidak ada kepastian",
        pantas: "Tenggat jam kerja; terbit ≤ 24 jam setelah lengkap",
      },
      {
        topic: "Berkas kurang",
        today: "Bolak-balik tanpa catatan jelas",
        pantas: "Catatan tertulis, jam instansi dijeda",
      },
      {
        topic: "Kalau molor",
        today: "Mengadu setelah terjadi (SP4N-LAPOR!)",
        pantas: "Naik otomatis ke Kepala Seksi, lalu Kabid",
      },
      {
        topic: "Kinerja dinas",
        today: "Tidak terlihat publik",
        pantas: "Rapor SLA terbuka, diperbarui otomatis",
      },
    ],
  },

  howItWorks: {
    title: "Seperti melacak paket, tapi untuk dokumen kependudukan.",
    steps: [
      {
        time: "Hari ini",
        title: "Ajukan, dapat resi",
        body: "Online atau di loket. NIK dicek di awal, nomor HP diverifikasi, resi acak & unik.",
      },
      {
        time: "≤ 1 hari kerja",
        title: "Berkas diverifikasi",
        body: "Petugas loket mencentang setiap persyaratan. Kurang? Catatan tertulis, jam instansi berhenti.",
      },
      {
        time: "≤ 24 jam",
        title: "Dokumen terbit",
        body: "Entri, tanda tangan, cetak: tiap tahap punya tenggat jam kerja. Lewat? Naik ke atasan otomatis.",
      },
      {
        time: "Saat diambil",
        title: "Ambil & beri nilai",
        body: "Peta lokasi layanan terdekat, berkas yang dibawa, lalu penilaian masuk rapor SLA publik.",
      },
    ],
  },

  perspectives: {
    title: "Satu resi, tiga sudut pandang.",
    body: "Data yang sama tampil sesuai kebutuhan: warga tau harus apa, petugas tau dasar keputusannya, pimpinan tau di mana macetnya.",
    items: [
      {
        role: "Warga",
        tone: "dawn",
        title: "tau harus apa sekarang",
        body: "Hitung mundur tiap tahap dan satu langkah berikutnya yang jelas. Data pribadi baru terbuka dengan 4 digit nomor HP.",
      },
      {
        role: "Petugas",
        tone: "sky",
        title: "Selesai dengan dasar tercatat",
        body: "Antrean urut paling mendesak. Tahap baru bisa diselesaikan setelah syarat selesai dicentang, lalu lanjut ke tugas berikutnya.",
      },
      {
        role: "Pimpinan",
        tone: "dusk",
        title: "tau di mana macetnya",
        body: "Eskalasi Kasi → Kabid berjalan otomatis, tahap yang paling sering molor terlihat, dan persen terbit ≤ 24 jam terukur per layanan.",
      },
    ],
    more: "Juga untuk publik dan auditor: rapor SLA terbuka dan audit log yang tidak bisa diubah.",
  },

  closing: {
    title: "Pelayanan publik yang bisa dipegang janjinya.",
    body: "Pantas dirancang untuk Mal Pelayanan Publik dan dinas mana pun yang ingin menurunkan laporan maladministrasi.",
  },
} as const;
