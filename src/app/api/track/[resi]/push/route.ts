import { after } from "next/server";
import { fail, ok, type ParamsOf, parseBody, route } from "@/lib/api";
import { sendPush, subscribePush, unsubscribePush } from "@/lib/push";
import { siteOrigin } from "@/lib/qr";
import { isValidResi, normalizeResi } from "@/lib/resi";
import { pushSchema } from "@/lib/validators";

// "Kabari saya" di halaman lacak (publik, tanpa login): simpan/hapus langganan push perangkat
// ini untuk resi. Isi notifikasi hanya status (tanpa data pribadi), sama terbukanya dengan
// halaman lacak itu sendiri. Setelah berlangganan, satu notifikasi sambutan dikirim sebagai bukti.
export const POST = route(async (request, { params }: ParamsOf<{ resi: string }>) => {
  const { data, error } = await parseBody(request, pushSchema);
  if (error) return error;
  const resi = normalizeResi((await params).resi);
  if (!isValidResi(resi)) return fail(400, "Format resi tidak dikenali.");

  if (data.action === "unsubscribe") {
    await unsubscribePush(resi, data.endpoint);
    return ok({ subscribed: false });
  }
  const serviceName = await subscribePush(resi, data.subscription);
  const origin = await siteOrigin();
  after(() =>
    sendPush(resi, {
      title: "Notifikasi Pantas aktif",
      body: `Anda akan dikabari setiap ada perubahan pada ${serviceName} (${resi}).`,
      url: `${origin}/lacak/${resi}`,
    }),
  );
  return ok({ subscribed: true });
});
