// SEMUA teks landing page ada di sini. Urutan bagian mengikuti pitch deck:
// hero (cek resi) → rapor ringkas → masalah (+ pembanding) → cara kerja → untuk siapa → asisten →
// suara lapangan → penutup. Gaya: satu pesan di satu tempat, kalimat ringkas & berbasis hasil.

export const site = {
  name: "Pantas",
  /** Kepanjangan nama: PANTAS = Pantau Tahapan Sipil (sekaligus "pantas" = layak). */
  expansion: "Pantau Tahapan Sipil",
  agency: "Disdukcapil Kota Harapan Jaya",
  tagline: "Kalau paket bisa dilacak, kenapa KTP tidak?",
  description:
    "Pelacakan permohonan adminduk dengan tenggat per tahap, eskalasi otomatis, dan rapor kinerja yang terbuka untuk publik.",
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
    kicker: "Standar waktu per tahap, terbuka untuk publik",
    kickerShort: "Standar waktu terbuka",
    kickerCta: "Lihat rapor",
    // Dua kalimat sejajar; baris terakhir diberi warna aksen.
    titleLines: ["Tau berkas Anda di mana.", "Tau kapan selesai."],
    body: "Masukkan nomor resi untuk melihat tahap aktif, tenggat, dan langkah berikutnya. Tanpa login.",
    exampleResi: "RL-HJ26-AKTA",
    // Strip di dasar hero: dasar aturan alur & tenggat (bukan klaim kerja sama/dukungan).
    basis: {
      title: "Alur dan tenggat mengacu pada regulasi pelayanan publik",
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
      caption: "berkas berjalan per ruangan",
      live: "data langsung",
    },
  },

  summary: {
    title: "Rapor SLA hari ini",
    body: "Ketepatan janji waktu layanan, dihitung otomatis dari data permohonan.",
    cta: "Lihat rapor lengkap",
  },

  // VERIFIKASI ULANG angka & sumber sebelum submit (lihat docs/HANDOFF-WIA.md §2).
  problem: {
    title: "Masalahnya bukan hanya lambat, tapi gelap.",
    body: "Warga tidak tau posisi berkas, kapan selesai, atau ke mana mengadu saat terlambat. Pola ini konsisten dalam laporan Ombudsman RI.",
    stats: [
      {
        value: "38,0%",
        label: "laporan berupa penundaan berlarut",
        source: "Ombudsman RI Perwakilan Sulsel, 2025",
      },
      {
        value: "30,1%",
        label: "laporan berupa penundaan berlarut; adminduk paling banyak dilaporkan",
        source: "Ombudsman RI Perwakilan Riau, 2025",
      },
      {
        value: "32,6%",
        label: "laporan berupa penundaan berlarut, 2021–2025",
        source: "Ombudsman RI Perwakilan Bengkulu",
      },
    ],
    // Pembanding jujur dengan layanan yang sudah ada (bukan pesaing: Pantas melengkapi).
    // ✓ hanya bila fiturnya tercantum di sumber publik (`source`); selain itu "–" (tidak kami
    // temukan / bukan fungsinya). Perbarui `checkedAt` setiap kali dicek ulang.
    landscape: {
      title: "Cek status sudah ada. Yang belum: janji waktu per tahap.",
      body: "Pantas tidak menggantikan kanal yang ada, tetapi melengkapinya dengan tenggat per tahap, eskalasi otomatis, dan rapor terbuka.",
      checkedAt: "November 2026",
      apps: [
        {
          name: "IKD",
          owner: "Ditjen Dukcapil Kemendagri",
          logo: "/compare/ikd.png",
          source: "https://play.google.com/store/apps/details?id=gov.dukcapil.mobile_id",
        },
        {
          name: "Alpukat Betawi",
          owner: "Dukcapil DKI Jakarta",
          logo: "/compare/alpukat-betawi.png",
          source: "https://play.google.com/store/apps/details?id=id.disdukcapildki.alpukat",
        },
        {
          name: "KNG Mobile",
          owner: "Dispendukcapil Surabaya",
          logo: "/compare/kng.png",
          source: "https://play.google.com/store/apps/details?id=id.disdukcapilsurabaya.kng",
        },
        {
          name: "SP4N-LAPOR!",
          owner: "Pengaduan nasional",
          logo: "/compare/sp4n-lapor.png",
          source: "https://www.lapor.go.id",
        },
      ],
      // values: urutan sama dengan `apps`; pantas: isi kolom Pantas (true = ✓, teks = keterangan).
      rows: [
        { label: "Ajukan permohonan online", values: [true, true, true, false], pantas: true },
        { label: "Pantau status permohonan", values: [true, true, true, false], pantas: true },
        { label: "Tenggat tiap tahap terlihat warga", values: [false, false, false, false], pantas: true },
        { label: "Terlambat? Naik otomatis ke atasan", values: [false, false, false, false], pantas: true },
        { label: "Rapor ketepatan waktu terbuka", values: [false, false, false, false], pantas: true },
        {
          label: "Pengaduan setelah terjadi",
          values: [false, false, false, true],
          pantas: "Diarahkan ke SP4N-LAPOR!",
        },
      ],
    },
  },

  howItWorks: {
    title: "Seperti melacak paket, untuk dokumen kependudukan.",
    // Tiruan halaman lacak yang menempel di samping langkah (desktop); satu `frame` per langkah.
    // Tahap & urutan mengikuti layanan Akta Kelahiran di data demo.
    demo: {
      label: "Halaman lacak",
      service: "Akta Kelahiran",
      stages: [
        "Verifikasi berkas",
        "Entri & validasi data",
        "Persetujuan & tanda tangan elektronik",
        "Pencetakan akta",
        "Penyerahan",
      ],
      frames: [
        {
          status: "Diajukan",
          active: 0,
          left: "sisa 7j 58m",
          note: "Resi aktif dan bisa dilacak tanpa login.",
        },
        {
          status: "Diproses",
          active: 1,
          left: "sisa 7j 40m",
          note: "3/3 persyaratan lengkap. Tahap verifikasi ditutup.",
        },
        {
          status: "Diproses",
          active: 3,
          left: "sisa 0j 45m",
          note: "HP dikabari: tahap Persetujuan & TTE selesai.",
        },
        {
          status: "Siap diambil",
          active: 4,
          left: "jam kerja",
          note: "Terbit 6j 40m setelah lengkap. Penilaian masuk rapor.",
        },
      ],
    },
    steps: [
      {
        time: "Hari ini",
        title: "Ajukan, terima resi",
        body: "Online atau di loket. NIK dan nomor HP diverifikasi sejak awal.",
      },
      {
        time: "± 1 hari kerja",
        title: "Verifikasi berkas",
        body: "Persyaratan diperiksa satu per satu. Bila kurang: catatan tertulis, jam instansi dijeda.",
      },
      {
        time: "+ 1 hari kerja",
        title: "Dokumen terbit",
        body: "Paling lama 1 hari kerja setelah berkas lengkap. Tiap tahap bertenggat; yang terlambat naik ke atasan.",
      },
      {
        time: "Saat diambil",
        title: "Ambil & beri nilai",
        body: "Lokasi dan berkas bawaan tersedia di halaman lacak; penilaian warga masuk rapor publik.",
      },
    ],
  },

  perspectives: {
    title: "Satu resi, empat sudut pandang.",
    body: "Satu sumber data, disajikan sesuai peran.",
    items: [
      {
        role: "Warga",
        tone: "dawn",
        title: "Tau harus apa sekarang",
        body: "Tenggat tiap tahap dan satu langkah berikutnya yang jelas.",
        cta: { label: "Coba lacak resi demo", href: "/lacak/RL-HJ26-AKTA" },
        points: [
          "Hitung mundur dalam jam kerja",
          "Kabar di HP setiap tahap berubah",
          "Data pribadi terbuka dengan 4 digit HP",
        ],
      },
      {
        role: "Petugas",
        tone: "sky",
        title: "Selesai dengan dasar tercatat",
        body: "Pekerjaan diurutkan menurut sisa waktu dan ditutup dengan bukti.",
        cta: { label: "Masuk sebagai petugas", href: "/masuk" },
        points: [
          "Antrean paling mendesak di atas",
          "Checklist syarat sebelum tahap ditutup",
          "Draf catatan untuk warga dirapikan AI",
        ],
      },
      {
        role: "Pimpinan",
        tone: "dusk",
        title: "Tau di mana macetnya",
        body: "Keterlambatan terlihat sebelum menjadi aduan.",
        cta: { label: "Masuk sebagai pimpinan", href: "/masuk" },
        points: [
          "Eskalasi Kepala Seksi → Kepala Bidang",
          "Tanggapan dan janji waktu untuk warga",
          "Tahap yang paling sering molor",
        ],
      },
      {
        role: "Publik & auditor",
        tone: "sky",
        title: "Bisa memeriksa janji dinas",
        body: "Kinerja layanan terukur dan dapat diverifikasi.",
        cta: { label: "Buka rapor SLA", href: "/rapor" },
        points: [
          "Persen terbit ± 24 jam per layanan",
          "Dihitung otomatis, tanpa input manual",
          "Audit log yang tidak dapat diubah",
        ],
      },
    ],
  },

  // Asisten AI + notifikasi push (section gelap di tengah beranda). Isi demo = ilustrasi yang
  // meniru tampilan asli di /lacak; teksnya mengikuti jawaban dasar di lib/assist.ts.
  assistant: {
    label: "Asisten & kabar",
    title: "Tidak perlu bertanya. Pantas yang mengabari.",
    intro:
      "Jawaban dari data resi dan kabar di HP setiap tahap berubah. Petugas loket fokus memproses berkas, bukan menjawab status.",
    // Demo interaktif di beranda (AssistantDemo): klik pertanyaan → orb berpikir → jawaban diketik.
    // Jawaban mengikuti templat jawaban dasar di lib/assist.ts untuk resi contoh ini.
    demo: {
      summary:
        "Berkas Akta Kelahiran Anda sedang di tahap Entri & validasi data. Tidak ada yang perlu Anda lakukan sekarang; perkiraan selesai Selasa pukul 15.00 WIB.",
      hint: "Coba klik salah satu pertanyaan",
      initial: 2,
      questions: [
        {
          label: "Kapan permohonan saya selesai?",
          answer:
            "Perkiraan selesai Selasa, 3 November pukul 15.00 WIB. Sesuai janji Permendagri 19/2018, dokumen terbit paling lambat Rabu, 4 November pukul 09.12 WIB. Semua tenggat dihitung dalam jam kerja.",
        },
        {
          label: "Apa yang harus saya bawa?",
          answer:
            "Saat ini Anda belum perlu datang. Untuk pengambilan nanti, bawa bukti resi dan KTP-el atau KK asli.",
        },
        {
          label: "Bisa dipercepat?",
          answer:
            "Urutan dan tenggat sama untuk semua warga, tanpa jalur berbayar. Jika dokumen dibutuhkan untuk keperluan mendesak, tandai di halaman lacak agar terlihat oleh petugas.",
        },
      ],
    },
    phone: { time: "14.40", date: "Selasa, 3 November" },
    notifications: [
      {
        title: "Tahap Verifikasi berkas selesai",
        body: "Akta Kelahiran (RL-HJ26-AKTA) lanjut ke tahap Entri & validasi data.",
        when: "09.12",
      },
      {
        title: "Tahap Entri & validasi data selesai",
        body: "Akta Kelahiran (RL-HJ26-AKTA) lanjut ke tahap Persetujuan & tanda tangan elektronik.",
        when: "11.05",
      },
      {
        title: "Dokumen siap diambil",
        body: "Akta Kelahiran (RL-HJ26-AKTA) sudah bisa diambil di lokasi layanan pada jam kerja.",
        when: "baru saja",
      },
    ],
    guards: [
      {
        title: "Berbasis data, bukan tebakan",
        body: "Jawaban bersumber dari data resi; di luar itu, asisten menyatakan belum tau.",
      },
      {
        title: "Tanpa CS, tanpa calo",
        body: "Keperluan mendesak menjadi penanda di antrean petugas, tanpa jalur berbayar.",
      },
      {
        title: "Aman di layar kunci",
        body: "Notifikasi hanya memuat status, tanpa nama atau catatan petugas.",
      },
    ],
    cta: { label: "Coba di resi demo", href: "/lacak/RL-HJ26-AKTA" },
  },

  // Kutipan wawancara. SEMENTARA: data contoh (mock: true) dan label "Data contoh" tampil di
  // section. Ganti dengan kutipan asli (dengan izin, pakai inisial), lalu set mock: false.
  testimonials: {
    // Kutipan asli hasil wawancara (nama ditampilkan atas izin narasumber), kalimat dirapikan tanpa
    // mengubah isi. Set `mock: true` + `mockNotice` hanya bila memakai data contoh.
    mock: false,
    mockNotice: "Data contoh · akan diganti kutipan asli hasil wawancara",
    label: "Suara lapangan",
    title: "Yang kami dengar dari warga.",
    intro: "Kutipan wawancara: pengalaman saat ini dan tanggapan setelah mencoba Pantas.",
    items: [
      {
        name: "Ilham Fakih Hilmi",
        role: "Warga",
        kind: "tanggapan",
        quote:
          "Sebagai keluarga muda, kami masih akan banyak mengurus akta dan dokumen keluarga. Dengan Pantas, rasanya urusan itu akan mudah dipantau.",
      },
      {
        name: "Satrio Wibowo",
        role: "Warga, karyawan swasta",
        kind: "pengalaman",
        quote:
          "Waktu membuat KTP, prosesnya terlalu lama dan saya bingung harus bertanya ke siapa. Sementara saya sendiri tetap harus bekerja.",
      },
      {
        name: "Deri Pran",
        role: "Warga, karyawan swasta",
        kind: "demo",
        quote:
          "Setelah saya coba, prosesnya mudah dilacak dan aplikasinya gampang digunakan. Saya merasa lebih tenang karena tau status berkas saya...",
      },
    ],
  },

  closing: {
    title: "Pelayanan publik yang bisa dipegang janjinya.",
    body: "Cek resi atau ajukan permohonan baru. Tanpa login, tanpa biaya.",
    // Pita berjalan di antara CTA & footer (fitur yang benar-benar ada di aplikasi).
    marquee: [
      "Tenggat tiap tahap terlihat",
      "Lacak tanpa login",
      "Eskalasi otomatis ke atasan",
      "Hari libur tidak dihitung",
      "Rapor SLA terbuka",
      "Gratis · Rp0",
    ],
  },
} as const;
