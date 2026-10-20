// Ilustrasi dokumen kependudukan untuk kartu layanan, digambar sebagai SVG menyerupai
// tata letak aslinya (KTP-el, Kartu Keluarga, Kutipan Akta Kelahiran). Sengaja bukan
// replika: data fiktif (Kota Harapan Jaya), emblem netral sebagai pengganti lambang negara,
// dan tanda SPESIMEN, supaya tidak bisa disalahgunakan sebagai dokumen palsu.

import { type ReactNode, useId } from "react";

const FONT = "Arial, Helvetica, sans-serif";

/** Gelombang halus berulang (meniru pola pengaman / guilloche) dalam kotak w×h. */
function waves(w: number, h: number, rows: number, amp: number, period: number): string {
  const paths: string[] = [];
  for (let r = 0; r < rows; r += 1) {
    const y0 = (h / rows) * r + h / rows / 2;
    let d = `M0 ${y0.toFixed(1)}`;
    for (let x = 4; x <= w; x += 4) {
      const y = y0 + Math.sin((x / period) * Math.PI * 2 + r * 0.7) * amp;
      d += ` L${x} ${y.toFixed(1)}`;
    }
    paths.push(d);
  }
  return paths.join(" ");
}

const KTP_WAVES = waves(340, 214, 26, 3.2, 70);
const KK_WAVES = waves(300, 212, 30, 2, 90);

/** Emblem netral (perisai + bintang), pengganti lambang negara pada ilustrasi. */
function Emblem({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const s = size / 20;
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`}>
      <path d="M10 1 L18 4 V10 C18 15 14 18 10 19 C6 18 2 15 2 10 V4 Z" fill={color} />
      <path
        d="M10 5 L11.4 8.6 L15 8.8 L12.2 11 L13.1 14.6 L10 12.6 L6.9 14.6 L7.8 11 L5 8.8 L8.6 8.6 Z"
        fill="#fff"
      />
    </g>
  );
}

/** Coretan tanda tangan. */
const Signature = ({ x, y, color = "#1e3a8a" }: { x: number; y: number; color?: string }) => (
  <path
    d={`M${x} ${y} c4 -8 8 -8 9 -2 s3 6 7 -3 s5 -6 6 1 s4 4 9 -4`}
    fill="none"
    stroke={color}
    strokeWidth="1.1"
    strokeLinecap="round"
  />
);

function Svg({ viewBox, children, label }: { viewBox: string; children: ReactNode; label: string }) {
  return (
    <svg viewBox={viewBox} role="img" aria-label={label} className="h-auto w-full" fontFamily={FONT}>
      {children}
    </svg>
  );
}

// --- KTP-el ---------------------------------------------------------------------------

/** Isi KTP. Ilustrasi kartu layanan memakai CONTOH; pratinjau form mengisi dari input warga. */
export interface KtpData {
  nik: string;
  name: string;
  birth: string;
  gender: string;
  bloodType: string;
  address: string;
  rtrw: string;
  village: string;
  district: string;
  religion: string;
  marital: string;
  job: string;
  citizenship: string;
  validUntil: string;
  issued: string;
}

const KTP_SAMPLE: KtpData = {
  nik: "3299015508080002",
  name: "SITI RAHMAWATI",
  birth: "HARAPAN JAYA, 15-08-2008",
  gender: "PEREMPUAN",
  bloodType: "O",
  address: "JL. MELATI NO. 12",
  rtrw: "003/005",
  village: "SUKAMAJU",
  district: "HARAPAN BARU",
  religion: "ISLAM",
  marital: "BELUM KAWIN",
  job: "PELAJAR/MAHASISWA",
  citizenship: "WNI",
  validUntil: "SEUMUR HIDUP",
  issued: "15-01-2026",
};

const KTP_FIELDS: [label: string, key: keyof KtpData][] = [
  ["Nama", "name"],
  ["Tempat/Tgl Lahir", "birth"],
  ["Jenis Kelamin", "gender"],
  ["Alamat", "address"],
  ["RT/RW", "rtrw"],
  ["Kel/Desa", "village"],
  ["Kecamatan", "district"],
  ["Agama", "religion"],
  ["Status Perkawinan", "marital"],
  ["Pekerjaan", "job"],
  ["Kewarganegaraan", "citizenship"],
  ["Berlaku Hingga", "validUntil"],
];

/** "3299015508080002" → "3299 0155 0808 0002" (sisa yang belum diketik dibiarkan apa adanya). */
const groupNik = (nik: string) => nik.replace(/(\d{4})(?=\d)/g, "$1 ");

/**
 * KTP-el. Tanpa `data`: contoh lengkap (kartu layanan). Dengan `data` (pratinjau form):
 * kolom yang tidak diisi dibiarkan kosong seperti blangko, dan nilai dari warga ditebalkan.
 */
export function KtpArt({ data }: { data?: Partial<KtpData> }) {
  const id = useId();
  const preview = Boolean(data);
  const values: Partial<KtpData> = data ?? KTP_SAMPLE;
  const value = (key: keyof KtpData) => values[key] ?? "";
  const bg = `${id}-bg`;
  const clip = `${id}-clip`;

  return (
    <Svg
      viewBox="0 0 340 214"
      label={preview ? "Pratinjau KTP elektronik dari isian form" : "Ilustrasi KTP elektronik (spesimen)"}
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9eefb" />
          <stop offset="0.55" stopColor="#a9d6f2" />
          <stop offset="1" stopColor="#7cbde6" />
        </linearGradient>
        <clipPath id={clip}>
          <rect width="340" height="214" rx="12" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="340" height="214" fill={`url(#${bg})`} />
        <path d={KTP_WAVES} fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.6" />
        <circle cx="300" cy="40" r="70" fill="#ffffff" opacity="0.12" />
      </g>

      <text x="170" y="20" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0f2747">
        PROVINSI JAWA HARAPAN
      </text>
      <text x="170" y="32" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0f2747">
        KOTA HARAPAN JAYA
      </text>
      <text x="16" y="52" fontSize="11" fontWeight="700" fill="#0f2747">
        NIK
      </text>
      <text x="44" y="52" fontSize="11" fontWeight="700" fill="#0f2747">
        : {groupNik(value("nik"))}
      </text>

      {/* Golongan darah: kolom kanan pada baris jenis kelamin, seperti KTP asli. */}
      <text x="170" y={66 + 2 * 10.6} fontSize="6.6" fill="#10233d">
        Gol. Darah
      </text>
      <text
        x="206"
        y={66 + 2 * 10.6}
        fontSize="6.6"
        fill="#10233d"
        fontWeight={preview && value("bloodType") ? 700 : 400}
      >
        : {value("bloodType")}
      </text>
      {KTP_FIELDS.map(([label, key], i) => (
        <g key={key} fontSize="6.6" fill="#10233d">
          <text x="16" y={66 + i * 10.6}>
            {label}
          </text>
          <text x="88" y={66 + i * 10.6} fontWeight={preview && value(key) ? 700 : 400}>
            : {value(key)}
          </text>
        </g>
      ))}

      {/* Pas foto berlatar merah (pratinjau: abu-abu, foto diambil saat perekaman), tempat & tanggal terbit. */}
      <rect x="250" y="44" width="72" height="92" rx="2" fill={preview ? "#94a3b8" : "#c8102e"} />
      <circle cx="286" cy="78" r="15" fill={preview ? "#e2e8f0" : "#2b2b33"} />
      <path
        d="M258 136 C260 112 272 102 286 102 C300 102 312 112 314 136 Z"
        fill={preview ? "#e2e8f0" : "#f4f4f5"}
      />
      {!preview && <path d="M278 102 L286 116 L294 102 Z" fill="#cbd5e1" />}
      <text x="286" y="150" textAnchor="middle" fontSize="6" fill="#10233d">
        KOTA HARAPAN JAYA
      </text>
      <text x="286" y="159" textAnchor="middle" fontSize="6" fill="#10233d">
        {value("issued")}
      </text>
      {!preview && <Signature x={268} y={180} />}

      <text x="16" y="204" fontSize="6" fontWeight="700" fill="#b91c1c" opacity="0.8" letterSpacing="2">
        {preview ? "PRATINJAU · SPESIMEN" : "SPESIMEN"}
      </text>
    </Svg>
  );
}

// --- Kartu Keluarga ----------------------------------------------------------------------

const KK_MEMBERS: string[][] = [
  ["1", "BUDI SANTOSO", "3299011203850001", "LAKI-LAKI", "HARAPAN JAYA", "12-03-1985", "ISLAM"],
  ["2", "ANI LESTARI", "3299014507880002", "PEREMPUAN", "SUKAMAJU", "05-07-1988", "ISLAM"],
  ["3", "RIZKY PRATAMA", "3299012109120001", "LAKI-LAKI", "HARAPAN JAYA", "21-09-2012", "ISLAM"],
  ["4", "SITI RAHMAWATI", "3299015508260002", "PEREMPUAN", "HARAPAN JAYA", "15-08-2026", "ISLAM"],
];
const KK_COLUMNS = ["No", "Nama Lengkap", "NIK", "Jenis Kelamin", "Tempat Lahir", "Tanggal Lahir", "Agama"];
const KK_X = [10, 22, 80, 140, 182, 226, 266];

export function KartuKeluargaArt() {
  return (
    <Svg viewBox="0 0 300 212" label="Ilustrasi Kartu Keluarga (spesimen)">
      <rect width="300" height="212" rx="4" fill="#fbfdfb" />
      <path d={KK_WAVES} fill="none" stroke="#7cc4a4" strokeOpacity="0.25" strokeWidth="0.5" />
      <rect x="4" y="4" width="292" height="204" rx="2" fill="none" stroke="#5fae8c" strokeOpacity="0.6" />

      <Emblem x={150} y={17} size={14} color="#3f8f6b" />
      <text
        x="150"
        y="36"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="#1f2937"
        letterSpacing="1"
      >
        KARTU KELUARGA
      </text>
      <text x="150" y="45" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#1f2937">
        No. 3299011501260003
      </text>

      <g fontSize="5.4" fill="#1f2937">
        <text x="10" y="58">
          Nama Kepala Keluarga : BUDI SANTOSO
        </text>
        <text x="10" y="65">
          Alamat : JL. MELATI NO. 12
        </text>
        <text x="10" y="72">
          RT/RW : 003/005
        </text>
        <text x="160" y="58">
          Kecamatan : HARAPAN BARU
        </text>
        <text x="160" y="65">
          Kabupaten/Kota : KOTA HARAPAN JAYA
        </text>
        <text x="160" y="72">
          Provinsi : JAWA HARAPAN
        </text>
      </g>

      <rect x="8" y="78" width="284" height="10" fill="#d7efe3" />
      <g fontSize="4.8" fontWeight="700" fill="#1f2937">
        {KK_COLUMNS.map((col, i) => (
          <text key={col} x={KK_X[i]} y="85">
            {col}
          </text>
        ))}
      </g>
      {KK_MEMBERS.map((row, r) => (
        <g key={row[0]} fontSize="4.8" fill="#1f2937">
          <line x1="8" x2="292" y1={98 + r * 10} y2={98 + r * 10} stroke="#cfe7da" strokeWidth="0.5" />
          {row.map((cell, i) => (
            <text key={i} x={KK_X[i]} y={95 + r * 10}>
              {cell}
            </text>
          ))}
        </g>
      ))}
      {/* Tabel kedua (pendidikan, pekerjaan, ...) hanya sebagai garis. */}
      <rect x="8" y="134" width="284" height="8" fill="#d7efe3" />
      {[0, 1, 2, 3].map((r) => (
        <line key={r} x1="8" x2="292" y1={150 + r * 8} y2={150 + r * 8} stroke="#cfe7da" strokeWidth="0.5" />
      ))}

      <g fontSize="5" fill="#1f2937">
        <text x="10" y="192">
          Dikeluarkan Tanggal : 15-01-2026
        </text>
        <text x="200" y="182" textAnchor="middle">
          KEPALA DINAS KEPENDUDUKAN
        </text>
        <text x="200" y="188" textAnchor="middle">
          DAN PENCATATAN SIPIL
        </text>
      </g>
      <Signature x={186} y={200} />
      {/* QR tiruan */}
      <g transform="translate(262 174)">
        <rect width="26" height="26" fill="#fff" stroke="#1f2937" strokeWidth="0.6" />
        {[
          [2, 2],
          [16, 2],
          [2, 16],
          [10, 10],
          [13, 6],
          [6, 12],
          [18, 14],
          [12, 19],
          [20, 20],
        ].map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={x === 2 || (x === 16 && y === 2) ? 8 : 3}
            height={x === 2 || (x === 16 && y === 2) ? 8 : 3}
            fill="#1f2937"
          />
        ))}
      </g>
      <text x="10" y="203" fontSize="5" fontWeight="700" fill="#b91c1c" opacity="0.8" letterSpacing="1.5">
        SPESIMEN
      </text>
    </Svg>
  );
}

// --- Kutipan Akta Kelahiran ---------------------------------------------------------------

const AKTA_LINES: [string, string, boolean?][] = [
  ["Berdasarkan Akta Kelahiran Nomor", "3299-LT-15012026-0001"],
  ["bahwa di", "KOTA HARAPAN JAYA"],
  ["pada tanggal", "LIMA BELAS JANUARI"],
  ["", "DUA RIBU DUA PULUH ENAM"],
  ["telah lahir", "SITI RAHMAWATI", true],
  ["anak ke", "SATU, PEREMPUAN"],
  ["dari ayah", "BUDI SANTOSO"],
  ["dan ibu", "ANI LESTARI"],
];

export function AktaArt() {
  return (
    <Svg viewBox="0 0 220 300" label="Ilustrasi kutipan akta kelahiran (spesimen)">
      <defs>
        <pattern id="akta-border" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#e9dcc0" />
          <path d="M0 4 Q2 0 4 4 T8 4" fill="none" stroke="#b08a4a" strokeWidth="0.7" />
          <path d="M0 4 Q2 8 4 4 T8 4" fill="none" stroke="#7a9a6a" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="220" height="300" rx="3" fill="url(#akta-border)" />
      <rect x="12" y="12" width="196" height="276" fill="#fbf6ea" stroke="#b08a4a" strokeWidth="0.8" />
      <rect x="15" y="15" width="190" height="270" fill="none" stroke="#b08a4a" strokeWidth="0.4" />

      <Emblem x={110} y={36} size={20} color="#9a7438" />
      <text x="110" y="60" textAnchor="middle" fontSize="7" fontWeight="700" fill="#3b2f1e" letterSpacing="1">
        PENCATATAN SIPIL
      </text>
      <text x="110" y="69" textAnchor="middle" fontSize="5.5" fill="#3b2f1e">
        WARGA NEGARA : INDONESIA
      </text>
      <text
        x="110"
        y="86"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="700"
        fill="#3b2f1e"
        letterSpacing="0.5"
      >
        KUTIPAN AKTA KELAHIRAN
      </text>
      <line x1="56" x2="164" y1="91" y2="91" stroke="#b08a4a" strokeWidth="0.6" />

      {AKTA_LINES.map(([label, value, strong], i) => (
        <g key={i} fontSize="6" fill="#3b2f1e">
          <text x="26" y={110 + i * 14}>
            {label}
          </text>
          <text
            x="194"
            y={110 + i * 14}
            textAnchor="end"
            fontWeight={strong ? 700 : 400}
            fontSize={strong ? 7 : 6}
          >
            {value}
          </text>
        </g>
      ))}

      <g fontSize="5.2" fill="#3b2f1e" textAnchor="middle">
        <text x="150" y="228">
          Kutipan ini dikeluarkan di
        </text>
        <text x="150" y="235">
          Kota Harapan Jaya, 15-01-2026
        </text>
        <text x="150" y="243">
          Pejabat Pencatatan Sipil
        </text>
      </g>
      <circle cx="128" cy="258" r="11" fill="#7c3aed" opacity="0.18" />
      <circle cx="128" cy="258" r="11" fill="none" stroke="#6d28d9" strokeOpacity="0.5" strokeWidth="0.8" />
      <Signature x={138} y={262} />
      <text x="26" y="276" fontSize="5" fontWeight="700" fill="#b91c1c" opacity="0.8" letterSpacing="1.5">
        SPESIMEN
      </text>
    </Svg>
  );
}

// --- Dokumen umum (layanan baru buatan admin) ---------------------------------------------

export function GenericDocArt() {
  return (
    <Svg viewBox="0 0 220 280" label="Ilustrasi dokumen layanan">
      <rect width="220" height="280" rx="6" fill="#ffffff" />
      <Emblem x={110} y={30} size={18} color="#0b5cad" />
      <rect x="60" y="52" width="100" height="7" rx="3.5" fill="#cbd5e1" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect
          key={i}
          x="24"
          y={80 + i * 16}
          width={i % 3 === 2 ? 110 : 172}
          height="5"
          rx="2.5"
          fill="#e2e8f0"
        />
      ))}
      <Signature x={140} y={250} />
    </Svg>
  );
}
