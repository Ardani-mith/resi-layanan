// Notifikasi email ke warga saat permohonannya berubah. Dikirim lewat Resend (HTTP API)
// bila RESEND_API_KEY & EMAIL_FROM diisi; tanpa itu hanya dicatat di log server, jadi
// demo tetap jalan. Hanya untuk pemohon yang mengisi email (opsional di form).

import { type Action, type ApplicationData, STATUS } from "./workflow.ts";

export type NotifyKind = "created" | "request_fix" | "ready" | "completed" | "rejected";

/** Jenis notifikasi setelah sebuah aksi, atau null jika warga tidak perlu diberi tahu. */
export function notificationFor(
  action: Action | "created",
  app: Pick<ApplicationData, "status">,
): NotifyKind | null {
  if (action === "created") return "created";
  if (action === "request_fix") return "request_fix";
  if (action === "reject") return "rejected";
  if (action === "complete" && app.status === STATUS.SIAP_DIAMBIL) return "ready";
  if (action === "complete" && app.status === STATUS.SELESAI) return "completed";
  return null;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Isi email (teks polos: terbaca di semua aplikasi email, tanpa data pribadi selain nama). */
export function applicantEmail(
  kind: NotifyKind,
  app: Pick<
    ApplicationData,
    "resi" | "serviceName" | "applicant" | "steps" | "currentStep" | "rejectionReason" | "status"
  >,
  origin: string,
): EmailMessage | null {
  const to = app.applicant.email;
  if (!to) return null;
  const link = `${origin}/lacak/${app.resi}`;
  const note = app.steps[app.currentStep]?.publicNote;

  const bodies: Record<NotifyKind, [subject: string, lines: string[]]> = {
    created: [
      `Resi ${app.resi}: permohonan ${app.serviceName} diterima`,
      app.status === STATUS.MENUNGGU_KEDATANGAN
        ? [
          "Pendaftaran Anda sudah kami terima. Layanan ini wajib datang ke loket (mis. perekaman biometrik).",
          "Datang pada jam kerja dengan membawa dokumen asli dan nomor resi ini. Hitung mundur layanan dimulai saat Anda hadir.",
        ]
        : [
          "Permohonan Anda sudah kami terima dan masuk tahap verifikasi berkas.",
          "Simpan nomor resi ini untuk memantau setiap tahap dan tenggatnya.",
        ],
    ],
    request_fix: [
      `Resi ${app.resi}: berkas perlu dilengkapi`,
      [
        "Petugas meminta Anda melengkapi berkas. Hitung mundur instansi dihentikan sampai Anda melengkapinya.",
        note ? `Catatan petugas: ${note}` : "",
        "Setelah dilengkapi, konfirmasi di halaman lacak (siapkan 4 digit terakhir nomor HP Anda).",
      ],
    ],
    ready: [
      `Resi ${app.resi}: dokumen siap diambil`,
      [`Dokumen ${app.serviceName} Anda sudah selesai dan siap diambil di loket pelayanan.`],
    ],
    completed: [
      `Resi ${app.resi}: permohonan selesai`,
      [
        `Permohonan ${app.serviceName} Anda telah selesai.`,
        "Bantu kami menjadi lebih baik dengan memberi penilaian di halaman lacak.",
      ],
    ],
    rejected: [
      `Resi ${app.resi}: permohonan tidak dapat diproses`,
      [`Alasan: ${app.rejectionReason ?? "-"}`],
    ],
  };

  const [subject, lines] = bodies[kind];
  return {
    to,
    subject,
    text: [
      `Halo ${app.applicant.name},`,
      "",
      ...lines.filter(Boolean),
      "",
      `Lacak permohonan: ${link}`,
      "",
      "Email ini dikirim otomatis oleh Pantas (Pantau Tahapan Sipil). Jangan balas email ini.",
    ].join("\n"),
  };
}

/** Kirim lewat Resend; gagal kirim hanya dicatat (notifikasi tidak boleh menggagalkan aksi). */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.info(
      `[email] (tidak dikirim: RESEND_API_KEY/EMAIL_FROM kosong) ke ${message.to}: ${message.subject}`,
    );
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text }),
    });
    if (!res.ok) console.error(`[email] gagal (${res.status}): ${await res.text()}`);
    return res.ok;
  } catch (error) {
    console.error("[email] gagal terhubung ke Resend", error);
    return false;
  }
}

/** Beri tau pemohon tentang `action` yang baru terjadi (dipanggil lewat after() di route). */
export async function notifyApplicant(
  action: Action | "created",
  app: Parameters<typeof applicantEmail>[1] & Pick<ApplicationData, "status">,
  origin: string,
): Promise<void> {
  const kind = notificationFor(action, app);
  const message = kind && applicantEmail(kind, app, origin);
  if (message) await sendEmail(message);
}
