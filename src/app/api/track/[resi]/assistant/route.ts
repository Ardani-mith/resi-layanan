import { fail, ok, type ParamsOf, parseBody, route } from "@/lib/api";
import { ASSISTANT_DAILY_LIMIT, refundAssistantQuota, takeAssistantQuota } from "@/lib/applications";
import { askAssistant, askFree, questionsFor } from "@/lib/assist";
import { getTracking } from "@/lib/dal";
import { isValidResi, normalizeResi } from "@/lib/resi";
import { assistantSchema } from "@/lib/validators";

// Asisten Pantas (publik, tanpa login), hanya dari data publik resi ini:
// - tanpa isian: ringkasan status;
// - `question`: pertanyaan template (hanya yang relevan dengan status);
// - `ask`: pertanyaan yang diketik warga, maks. ASSISTANT_DAILY_LIMIT per resi per hari.
export const POST = route(async (request, { params }: ParamsOf<{ resi: string }>) => {
  const { data, error } = await parseBody(request, assistantSchema);
  if (error) return error;

  const resi = normalizeResi((await params).resi);
  if (!isValidResi(resi)) return fail(400, "Format resi tidak dikenali.");
  const tracking = await getTracking(resi);
  if (!tracking) return fail(404, "Resi tidak ditemukan.");

  if (data.ask) {
    if (!process.env.DEEPSEEK_API_KEY)
      return fail(503, "Tanya bebas belum tersedia. Pilih pertanyaan di atas.");
    const remaining = await takeAssistantQuota(resi);
    if (remaining === null) {
      return fail(
        429,
        `Batas ${ASSISTANT_DAILY_LIMIT} pertanyaan per hari untuk resi ini sudah tercapai. Coba lagi besok, atau pilih pertanyaan di atas.`,
      );
    }
    try {
      return ok({ text: await askFree(tracking, data.ask), source: "ai", remaining });
    } catch (err) {
      console.error("[assist] tanya bebas", err);
      await refundAssistantQuota(resi);
      return fail(502, "Asisten sedang tidak bisa dihubungi. Jatah pertanyaan Anda tidak berkurang.");
    }
  }

  if (data.question && !questionsFor(tracking).some((q) => q.id === data.question)) {
    return fail(422, "Pertanyaan ini tidak tersedia untuk status permohonan Anda.");
  }
  return ok(await askAssistant(tracking, data.question));
});
