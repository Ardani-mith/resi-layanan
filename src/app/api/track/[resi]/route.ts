import { fail, ok, type ParamsOf, parseBody, route } from "@/lib/api";
import { loadByResi, performCitizenAction, verifyApplicant } from "@/lib/applications";
import { getClock } from "@/lib/clock";
import { publicView, verifiedView } from "@/lib/present";
import { isValidResi, normalizeResi } from "@/lib/resi";
import { trackActionSchema } from "@/lib/validators";

async function find(params: ParamsOf<{ resi: string }>["params"]) {
  const resi = normalizeResi((await params).resi);
  if (!isValidResi(resi)) {
    return { error: fail(400, "Format resi tidak dikenali. Contoh: RL-AB3K-7XQ9.") };
  }
  const clock = await getClock();
  const app = await loadByResi(resi, clock);
  if (!app) return { error: fail(404, "Resi tidak ditemukan. Periksa kembali nomornya.") };
  return { app, clock };
}

// Publik: progres + nama disamarkan, tanpa login.
export const GET = route(async (request, { params }: ParamsOf<{ resi: string }>) => {
  const { app, clock, error } = await find(params);
  if (error) return error;
  return ok(publicView(app, clock));
});

// Butuh 4 digit terakhir HP: lihat detail, kirim perbaikan, atau beri rating.
export const POST = route(async (request, { params }: ParamsOf<{ resi: string }>) => {
  const { data, error: bodyError } = await parseBody(request, trackActionSchema);
  if (bodyError) return bodyError;

  const { app, clock, error } = await find(params);
  if (error) return error;

  const check = await verifyApplicant(app, data.phoneLast4, clock.now);
  if (check === "locked") return fail(429, "Terlalu banyak percobaan. Coba lagi 15 menit lagi.");
  if (check === "wrong") {
    const message = "4 digit terakhir nomor HP tidak cocok.";
    return fail(403, message, { phoneLast4: message });
  }

  if (data.action === "verify") return ok(verifiedView(app, clock));

  const updated = await performCitizenAction({ resi: app.resi, input: data, clock });
  return ok(verifiedView(updated, clock));
});
