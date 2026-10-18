// SEMUA teks landing page ada di sini. Urutan bagian mengikuti pitch deck:
// masalah → cara kerja → fitur → penutup.

export const site = {
  name: "Resi Layanan",
  agency: "Disdukcapil Kota Harapan Jaya",
  tagline: "Kalau paket bisa dilacak, kenapa KTP tidak?",
  description:
    "Lacak permohonan layanan publik seperti melacak paket: setiap tahap punya tenggat yang terlihat warga, dan keterlambatan otomatis naik ke atasan.",
  demoNotice: "Instansi dan data pada situs ini fiktif, dibuat untuk Web In Action MIA 2026.",

  hero: {
    eyebrow: "Pelacakan layanan publik",
    title: "Tahu pasti permohonan Anda sampai di mana, dan kapan selesai.",
    body: "Masukkan nomor resi dari loket atau pengajuan online. Tanpa login, tanpa antre bertanya.",
    exampleResi: "RL-HJ26-AKTA",
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
    gap: "Kanal seperti SP4N-LAPOR! berfokus pada pengaduan setelah masalah terjadi. Resi Layanan mencegahnya: status dan tenggat terbuka sejak hari pertama.",
  },

  howItWorks: {
    title: "Cara kerja",
    steps: [
      {
        title: "Ajukan, dapat resi",
        body: "Online atau di loket. Nomor resi acak dan unik, misalnya RL-AB3K-7XQ9.",
      },
      {
        title: "Setiap tahap punya tenggat",
        body: "Verifikasi, proses, tanda tangan, cetak. Tenggat dihitung dalam hari kerja dan tampil ke warga.",
      },
      {
        title: "Terlambat? Naik otomatis",
        body: "Tahap yang lewat tenggat ditandai merah dan dieskalasi ke Kepala Seksi, lalu Kepala Bidang.",
      },
      {
        title: "Selesai, beri penilaian",
        body: "Warga memberi rating, dan kinerja tiap layanan terbuka di rapor SLA publik.",
      },
    ],
  },

  features: {
    title: "Untuk warga, petugas, dan pimpinan",
    items: [
      {
        role: "Warga",
        title: "Lacak seperti paket",
        body: "Timeline per tahap, hitung mundur tenggat, catatan petugas, dan estimasi selesai. Nama disamarkan; detail terbuka dengan 4 digit HP.",
      },
      {
        role: "Warga",
        title: "Perbaikan tanpa mulai dari nol",
        body: "Jika berkas kurang, petugas menulis apa yang perlu diperbaiki. Jam SLA instansi berhenti sampai warga melengkapi.",
      },
      {
        role: "Petugas",
        title: "Antrean urut paling mendesak",
        body: "Setiap petugas hanya melihat tahap miliknya, diurutkan dari sisa waktu tersempit.",
      },
      {
        role: "Pimpinan",
        title: "Eskalasi & bottleneck",
        body: "Daftar tahap yang terlambat, tahap paling sering molor, dan persentase tepat waktu per layanan.",
      },
      {
        role: "Publik",
        title: "Rapor SLA terbuka",
        body: "Siapa pun bisa melihat seberapa sering instansi menepati janjinya.",
      },
      {
        role: "Auditor",
        title: "Jejak tak bisa diubah",
        body: "Setiap aksi tercatat di audit log append-only: siapa, kapan, dan apa.",
      },
    ],
  },

  closing: {
    title: "Pelayanan publik yang bisa dipegang janjinya.",
    body: "Resi Layanan dirancang untuk Mal Pelayanan Publik dan dinas mana pun yang ingin menurunkan laporan maladministrasi.",
  },
};
