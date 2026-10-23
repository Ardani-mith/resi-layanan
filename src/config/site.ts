// SEMUA teks landing page ada di sini. Urutan bagian mengikuti pitch deck:
// hero (cek resi) → rapor ringkas → masalah → cara kerja → fitur → penutup.
// Ikon ditulis sebagai nama (lihat ICONS di components/landing/Decor.tsx) agar config tetap data polos.

export const site = {
  name: "Pantas",
  /** Kepanjangan nama: PANTAS = Pantau Tahapan Sipil (sekaligus "pantas" = layak). */
  expansion: "Pantau Tahapan Sipil",
  agency: "Disdukcapil Kota Harapan Jaya",
  tagline: "Kalau paket bisa dilacak, kenapa KTP tidak?",
  description:
    "Lacak permohonan layanan publik seperti melacak paket: setiap tahap punya tenggat yang terlihat warga, dan keterlambatan otomatis naik ke atasan.",
  demoNotice: "Instansi dan data pada situs ini fiktif, dibuat untuk Web In Action MIA 2026.",
  /** Penjelasan latar demo: Pantas dipasang per instansi; Kota Harapan Jaya = instansi contoh. */
  demo: {
    badge: "Instansi demo",
    note: "Pantas dipasang per Disdukcapil, dengan tahapan & tenggat yang diatur masing-masing instansi. Demo ini memakai instansi contoh Kota Harapan Jaya (fiktif); peta memakai kantor nyata di DKI Jakarta sebagai contoh lokasi.",
    mapBadge: "Contoh lokasi · DKI Jakarta",
  },

  hero: {
    eyebrow: "Pelacakan layanan publik",
    // Satu elemen = satu baris yang dianimasikan muncul bergantian.
    titleLines: ["Tahu pasti permohonan", "Anda sampai di mana,", "dan kapan selesai."],
    body: "Masukkan nomor resi dari loket atau pengajuan online. Tanpa login, tanpa antre bertanya.",
    exampleResi: "RL-HJ26-AKTA",
    highlights: [
      { icon: "lock", text: "Nama pemohon disamarkan" },
      { icon: "timer", text: "Tenggat tiap tahap terlihat" },
      { icon: "bell", text: "Terlambat? Otomatis naik ke atasan" },
    ],
    // Isi cuplikan halaman lacak di hero (ilustrasi, bukan data asli).
    preview: {
      service: "Akta Kelahiran",
      applicant: "Si*** R***",
      officerNote: "Berkas lengkap dan sesuai.",
      escalationNote: "Lewat tenggat? Otomatis diteruskan ke Kepala Seksi.",
    },
  },

  summary: {
    eyebrow: "Rapor SLA hari ini",
    title: "Janji waktu yang bisa dicek siapa pun.",
    cta: "Lihat rapor lengkap",
  },

  // VERIFIKASI ULANG angka & sumber sebelum submit (lihat docs/HANDOFF-WIA.md §2).
  problem: {
    title: "Masalahnya bukan hanya lambat, tapi gelap.",
    body: "Warga tidak tahu berkasnya di meja siapa, kapan selesai, dan ke mana harus mengadu ketika molor. Laporan Ombudsman RI menunjukkan pola yang sama di banyak daerah.",
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
    gap: "Kanal seperti SP4N-LAPOR! berfokus pada pengaduan setelah masalah terjadi. Pantas mencegahnya: status dan tenggat terbuka sejak hari pertama.",
  },

  howItWorks: {
    title: "Seperti melacak paket, tapi untuk dokumen kependudukan.",
    steps: [
      {
        icon: "file",
        title: "Ajukan, dapat resi",
        body: "Online atau di loket. Nomor resi acak dan unik, misalnya RL-AB3K-7XQ9.",
      },
      {
        icon: "timer",
        title: "Setiap tahap punya tenggat",
        body: "Verifikasi, proses, tanda tangan, cetak. Tenggat dalam jam kerja, dokumen terbit ≤ 24 jam setelah berkas lengkap.",
      },
      {
        icon: "bell",
        title: "Terlambat? Naik otomatis",
        body: "Tahap yang lewat tenggat ditandai merah dan dieskalasi ke Kepala Seksi, lalu Kepala Bidang.",
      },
      {
        icon: "star",
        title: "Selesai, beri penilaian",
        body: "Warga memberi rating, dan kinerja tiap layanan terbuka di rapor SLA publik.",
      },
    ],
  },

  features: {
    title: "Untuk warga, petugas, dan pimpinan",
    items: [
      {
        icon: "phone",
        role: "Warga",
        title: "Lacak seperti paket",
        body: "Timeline per tahap, hitung mundur tenggat, catatan petugas, dan estimasi selesai. Nama disamarkan; detail terbuka dengan 4 digit HP.",
      },
      {
        icon: "fix",
        role: "Warga",
        title: "Perbaikan tanpa mulai dari nol",
        body: "Jika berkas kurang, petugas menulis apa yang perlu diperbaiki. Jam SLA instansi berhenti sampai warga melengkapi.",
      },
      {
        icon: "queue",
        role: "Petugas",
        title: "Antrean urut paling mendesak",
        body: "Setiap petugas hanya melihat tahap miliknya, diurutkan dari sisa waktu tersempit.",
      },
      {
        icon: "dashboard",
        role: "Pimpinan",
        title: "Eskalasi & bottleneck",
        body: "Daftar tahap yang terlambat, tahap paling sering molor, dan persentase tepat waktu per layanan.",
      },
      {
        icon: "chart",
        role: "Publik",
        title: "Rapor SLA terbuka",
        body: "Siapa pun bisa melihat seberapa sering instansi menepati janjinya.",
      },
      {
        icon: "shield",
        role: "Auditor",
        title: "Jejak tak bisa diubah",
        body: "Setiap aksi tercatat di audit log append-only: siapa, kapan, dan apa.",
      },
    ],
  },

  closing: {
    title: "Pelayanan publik yang bisa dipegang janjinya.",
    body: "Pantas dirancang untuk Mal Pelayanan Publik dan dinas mana pun yang ingin menurunkan laporan maladministrasi.",
  },
} as const;
