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
    kicker: "Janji waktu tiap tahap, terbuka untuk publik",
    kickerShort: "Janji waktu terbuka",
    kickerCta: "Lihat rapor",
    // Dua kalimat sejajar; baris terakhir diberi warna aksen.
    titleLines: ["Tau berkas Anda di mana.", "Tau kapan selesai."],
    body: "Masukkan nomor resi dari loket atau pengajuan online. Lihat tahap aktif, tenggatnya, dan siapa yang menangani. Tanpa login, tanpa antre bertanya.",
    exampleResi: "RL-HJ26-AKTA",
    // Strip di dasar hero: dasar aturan alur & tenggat (bukan klaim kerja sama/dukungan).
    basis: {
      title: "Alur & tenggat dirancang mengacu pada regulasi pelayanan publik",
      items: [
        { code: "UU 25/2009", label: "Pelayanan Publik" },
        { code: "UU 24/2013", label: "Administrasi Kependudukan" },
        { code: "Permendagri 19/2018", label: "Kualitas Layanan Adminduk" },
        { code: "PermenPANRB 15/2014", label: "Standar Pelayanan" },
        { code: "Perpres 95/2018", label: "SPBE" },
      ],
    },
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
    title: "Satu resi, empat sudut pandang.",
    body: "Data yang sama tampil sesuai kebutuhan: warga tau harus apa, petugas tau dasar keputusannya, pimpinan tau di mana macetnya, publik bisa menilai.",
    items: [
      {
        role: "Warga",
        tone: "dawn",
        title: "tau harus apa sekarang",
        body: "Hitung mundur tiap tahap dan satu langkah berikutnya yang jelas. Data pribadi baru terbuka dengan 4 digit nomor HP.",
        cta: { label: "Coba lacak resi demo", href: "/lacak/RL-HJ26-AKTA" },
        points: [
          "Tahap aktif & tenggatnya, dihitung dalam jam kerja",
          "Diberi tahu bila berkas kurang; batas melengkapi 10 hari kerja",
          "Terlambat? Tanggapan pimpinan tampil di halaman lacak",
        ],
      },
      {
        role: "Petugas",
        tone: "sky",
        title: "Selesai dengan dasar tercatat",
        body: "Antrean urut paling mendesak. Tahap baru bisa diselesaikan setelah syarat selesai dicentang, lalu lanjut ke tugas berikutnya.",
        cta: { label: "Masuk sebagai petugas", href: "/masuk" },
        points: [
          "Antrean urut sisa waktu, yang paling mendesak di atas",
          "Syarat dicentang dulu sebelum tahap bisa diselesaikan",
          "Jam instansi dijeda otomatis saat berkas perlu perbaikan",
        ],
      },
      {
        role: "Pimpinan",
        tone: "dusk",
        title: "tau di mana macetnya",
        body: "Eskalasi Kasi → Kabid berjalan otomatis, tahap yang paling sering molor terlihat, dan persen terbit ≤ 24 jam terukur per layanan.",
        cta: { label: "Masuk sebagai pimpinan", href: "/masuk" },
        points: [
          "Eskalasi otomatis ke Kasi, lalu Kabid satu hari kerja kemudian",
          "Tanggapan untuk warga + arahan untuk petugas + janji waktu",
          "Dashboard Pantau: tahap yang paling sering molor",
        ],
      },
      {
        role: "Publik & auditor",
        tone: "sky",
        title: "bisa memeriksa janji dinas",
        body: "Rapor SLA terbuka per layanan, diperbarui otomatis dari data permohonan, dan audit log yang tidak bisa diubah.",
        cta: { label: "Buka rapor SLA", href: "/rapor" },
        points: [
          "Persen terbit ≤ 24 jam per layanan",
          "Dihitung langsung dari data permohonan, tanpa input manual",
          "Audit log setiap keputusan yang tidak bisa diubah",
        ],
      },
    ],
  },

  // Kutipan wawancara. SEMENTARA: data contoh (mock: true) dan label "Data contoh" tampil di
  // section. Ganti dengan kutipan asli (dengan izin, pakai inisial), lalu set mock: false.
  testimonials: {
    mock: true,
    mockNotice: "Data contoh · akan diganti kutipan asli hasil wawancara",
    label: "Suara lapangan",
    title: "Yang kami dengar dari warga & petugas.",
    intro:
      "Kutipan dari wawancara: pengalaman mengurus dokumen hari ini, dan tanggapan setelah mencoba demo Pantas.",
    items: [
      {
        name: "R.",
        role: "Warga, mengurus akta kelahiran anak",
        kind: "pengalaman",
        quote: "Saya datang tiga kali. Baru di kedatangan ketiga dibilang fotokopi KK kurang satu.",
      },
      {
        name: "D.",
        role: "Petugas loket",
        kind: "pengalaman",
        quote: "Separuh waktu di loket habis untuk menjawab pertanyaan status, bukan memproses berkas.",
      },
      {
        name: "M.",
        role: "Warga, karyawan swasta",
        kind: "demo",
        quote:
          "Di halaman lacak saya tahu berkas saya di tahap apa dan kapan selesai. Tidak perlu izin kerja cuma untuk bertanya.",
      },
    ],
  },

  closing: {
    title: "Pelayanan publik yang bisa dipegang janjinya.",
    body: "Pantas dirancang untuk Mal Pelayanan Publik dan dinas mana pun yang ingin menurunkan laporan maladministrasi.",
    // Pita berjalan di antara CTA & footer (fitur yang benar-benar ada di aplikasi).
    marquee: [
      "Tenggat tiap tahap terlihat",
      "Lacak tanpa login",
      "Nama pemohon disamarkan",
      "Terlambat? Naik ke Kasi, lalu Kabid",
      "Berkas kurang langsung diberi tahu",
      "Hari libur tidak dihitung",
      "Gratis · Rp0",
      "Rapor SLA terbuka untuk publik",
    ],
  },
} as const;
