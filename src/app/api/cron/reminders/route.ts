import { fail, ok, route } from "@/lib/api";
import { getClock } from "@/lib/clock";
import { remindFixDeadlines } from "@/lib/push";
import { siteOrigin } from "@/lib/qr";

// Dipanggil Vercel Cron tiap hari kerja pukul 08.00 WIB (vercel.json): pengingat push H-3 & H-1
// batas melengkapi berkas. Vercel mengirim `Authorization: Bearer $CRON_SECRET`; tanpa
// CRON_SECRET route ini menolak semua panggilan.
export const GET = route(async (request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return fail(401, "Tidak diizinkan.");
  }
  const clock = await getClock();
  return ok({ sent: await remindFixDeadlines(clock, await siteOrigin()) });
});
