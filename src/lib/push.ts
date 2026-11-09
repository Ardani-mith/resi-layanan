// Notifikasi push ke browser/HP warga (Web Push + VAPID), pelengkap email: warga menekan
// "Kabari saya" di halaman lacak, browser memberi alamat push, dan setiap perubahan status
// dikirim ke sana (lihat pushMessage di notify.ts). Aktif bila VAPID_PUBLIC_KEY &
// VAPID_PRIVATE_KEY diisi (`npx web-push generate-vapid-keys`); tanpa itu tombolnya tidak tampil.
// Isi notifikasi tanpa data pribadi (terbaca di layar kunci): hanya layanan, resi, dan status.

import webpush from "web-push";
import { Application, PushSubscriber } from "../models.ts";
import { formatDateTime } from "./format.ts";
import { type Holidays, workdaysUntil } from "./sla.ts";
import { AppError, type ApplicationData, fixDeadline, OPEN_STATUSES, STATUS } from "./workflow.ts";

/** Maksimal perangkat per resi; langganan tertua diganti bila lebih. */
const MAX_PER_RESI = 5;
const KEEP_MS = 60 * 24 * 60 * 60 * 1000;

export interface PushMessage {
  title: string;
  body: string;
  url: string;
}

/** Kunci publik untuk browser (null = push tidak diatur). */
export function pushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY ? process.env.VAPID_PUBLIC_KEY : null;
}

let ready = false;
function setup(): boolean {
  const publicKey = pushPublicKey();
  if (!publicKey) return false;
  if (!ready) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:notifikasi@pantas.id",
      publicKey,
      process.env.VAPID_PRIVATE_KEY!,
    );
    ready = true;
  }
  return true;
}

/** Simpan langganan perangkat ini untuk resi (hanya selama permohonan masih berjalan). */
export async function subscribePush(
  resi: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  if (!pushPublicKey()) throw new AppError(503, "Notifikasi belum tersedia.");
  const app = await Application.findOne({ resi }).select("status serviceName").lean();
  if (!app) throw new AppError(404, "Resi tidak ditemukan.");
  if (!OPEN_STATUSES.includes(app.status)) {
    throw new AppError(409, "Permohonan ini sudah selesai, notifikasi tidak diperlukan lagi.");
  }
  await PushSubscriber.updateOne(
    { resi, endpoint: subscription.endpoint },
    { $set: { keys: subscription.keys, expiresAt: new Date(Date.now() + KEEP_MS) } },
    { upsert: true },
  );
  const extra = await PushSubscriber.find({ resi }).sort({ createdAt: -1 }).skip(MAX_PER_RESI).select("_id");
  if (extra.length) await PushSubscriber.deleteMany({ _id: { $in: extra.map((s) => s._id) } });
  return app.serviceName;
}

export async function unsubscribePush(resi: string, endpoint: string) {
  await PushSubscriber.deleteOne({ resi, endpoint });
}

/**
 * Kirim ke semua perangkat yang berlangganan resi ini. Alamat yang sudah tidak berlaku
 * (404/410: izin dicabut, browser dihapus) dibuang. Tidak pernah melempar.
 */
export async function sendPush(resi: string, message: PushMessage): Promise<void> {
  if (!setup()) return;
  try {
    const subscribers = await PushSubscriber.find({ resi }).lean();
    await Promise.all(
      subscribers.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: s.keys },
            JSON.stringify({ ...message, tag: resi }),
            { TTL: 24 * 60 * 60, urgency: "high" },
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await PushSubscriber.deleteOne({ _id: s._id });
          else console.error("[push]", status ?? error);
        }
      }),
    );
  } catch (error) {
    console.error("[push]", error);
  }
}

/** Sisa hari kerja saat pengingat batas perbaikan dikirim (yang paling mendesak dulu). */
export const FIX_REMINDER_DAYS = [1, 3] as const;

/**
 * Pengingat push sebelum batas melengkapi berkas (H-3 & H-1 hari kerja), untuk resi yang
 * berlangganan. Idempoten: tiap pengingat dicatat di `remindersSent` (per jeda) secara atomik,
 * jadi aman dipanggil berulang (cron harian, tombol jam demo). Mengembalikan jumlah terkirim.
 */
export async function remindFixDeadlines(
  { now, holidays }: { now: Date; holidays?: Holidays },
  origin: string,
): Promise<number> {
  if (!pushPublicKey()) return 0;
  const subscribed = await PushSubscriber.distinct("resi");
  if (!subscribed.length) return 0;
  const apps = await Application.find({ status: STATUS.PERLU_PERBAIKAN, resi: { $in: subscribed } })
    .select("resi serviceName currentStep steps")
    .lean<ApplicationData[]>();
  let sent = 0;
  for (const app of apps) {
    const pausedAt = app.steps[app.currentStep]?.pausedAt;
    if (!pausedAt) continue;
    const deadline = fixDeadline(pausedAt, holidays);
    const left = workdaysUntil(now, deadline, holidays);
    const mark = FIX_REMINDER_DAYS.find((days) => left > 0 && left <= days);
    if (!mark) continue;
    const key = `${new Date(pausedAt).toISOString()}|${mark}`;
    const claimed = await Application.updateOne(
      { _id: app._id, remindersSent: { $ne: key } },
      { $addToSet: { remindersSent: key } },
    );
    if (!claimed.modifiedCount) continue;
    await sendPush(app.resi, {
      title:
        left === 1
          ? "Hari kerja terakhir untuk melengkapi berkas"
          : `Sisa ${left} hari kerja untuk melengkapi berkas`,
      body: `${app.serviceName} (${app.resi}): lengkapi paling lambat ${formatDateTime(deadline)}; lewat dari itu permohonan dibatalkan otomatis.`,
      url: `${origin}/lacak/${app.resi}`,
    });
    sent += 1;
  }
  return sent;
}
