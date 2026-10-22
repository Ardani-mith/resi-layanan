import { after } from "next/server";
import { fail, ok, parseBody, route } from "@/lib/api";
import { createApplication, startVerification } from "@/lib/applications";
import { getClock } from "@/lib/clock";
import { notifyApplicant } from "@/lib/notify";
import { maskPhone } from "@/lib/present";
import { siteOrigin } from "@/lib/qr";
import type { Role } from "@/lib/roles";
import { getSession } from "@/lib/session";
import { applicationSchema } from "@/lib/validators";

const LOKET_ROLES: readonly Role[] = ["petugas_loket", "admin"];

// Pengajuan online (warga, tanpa login) atau input walk-in di loket (petugas).
export const POST = route(async (request) => {
  const { data, error } = await parseBody(request, applicationSchema);
  if (error) return error;

  const user = await getSession();
  if (data.channel === "loket" && !(user && LOKET_ROLES.includes(user.role))) {
    return fail(403, "Pengajuan lewat loket hanya bisa diinput petugas loket.");
  }

  const clock = await getClock();

  // Online tanpa kode: periksa semua isian dulu, lalu kirim OTP ke nomor HP (langkah terakhir warga).
  if (data.channel === "online" && !data.otp) {
    const otp = await startVerification({ input: data, clock });
    // Belum ada penyedia SMS/WhatsApp: mode demo menampilkan kode di layar. Sambungkan pengirimnya di
    // sini (mis. WhatsApp Business API) lalu hapus `demoCode` dari respons.
    console.info(`[otp] kode untuk ${maskPhone(otp.phone)}: ${otp.code}`);
    return ok(
      {
        otpRequired: true,
        otpId: otp.otpId,
        phoneMasked: maskPhone(otp.phone),
        expiresAt: otp.expiresAt,
        demoCode: otp.code,
      },
      202,
    );
  }

  const app = await createApplication({
    input: data,
    actor: data.channel === "loket" ? user : null,
    clock,
  });
  // Email dikirim setelah respons terkirim: warga tidak menunggu, dan gagal kirim tidak menggagalkan pengajuan.
  const origin = await siteOrigin();
  after(() => notifyApplicant("created", app, origin));
  return ok(
    { otpRequired: false, resi: app.resi, serviceName: app.serviceName, createdAt: app.createdAt },
    201,
  );
});
