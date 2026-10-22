import { ok, parseBody, route } from "@/lib/api";
import { recoverResi } from "@/lib/applications";
import { maskPhone } from "@/lib/present";
import { recoverSchema } from "@/lib/validators";

// Lupa resi: tanpa `otp` → kirim kode ke nomor HP; dengan `otp` → daftar resi milik NIK + HP itu.
export const POST = route(async (request) => {
  const { data, error } = await parseBody(request, recoverSchema);
  if (error) return error;

  const result = await recoverResi(data);
  const { otp, applications } = result;
  if (otp) {
    // Mode demo (belum ada penyedia SMS/WhatsApp): kode ikut dikirim ke layar, sama seperti pengajuan.
    console.info(`[otp] kode lupa resi untuk ${maskPhone(otp.phone)}: ${otp.code}`);
    return ok(
      { otpRequired: true, otpId: otp.otpId, phoneMasked: maskPhone(otp.phone), demoCode: otp.code },
      202,
    );
  }
  return ok({ otpRequired: false, applications });
});
