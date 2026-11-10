import { fail, ok, route } from "@/lib/api";
import { getClock } from "@/lib/clock";
import { syncOverdue } from "@/lib/escalation";
import { remindFixDeadlines } from "@/lib/push";
import { siteOrigin } from "@/lib/qr";

// Dipanggil Vercel Cron tiap hari kerja pukul 08.00 WIB (vercel.json): sinkronkan eskalasi &
// pembatalan otomatis (tidak bergantung pada petugas membuka antrean), lalu pengingat push H-3 & H-1
// batas melengkapi berkas. Vercel mengirim `Authorization: Bearer $CRON_SECRET`; tanpa
// CRON_SECRET route ini menolak semua panggilan.
export const GET = route(async (request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return fail(401, "Tidak diizinkan.");
  }
  const clock = await getClock();
  const synced = await syncOverdue(clock.now, clock.holidays);
  return ok({ synced, sent: await remindFixDeadlines(clock, await siteOrigin()) });
});
