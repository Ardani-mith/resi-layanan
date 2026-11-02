import { fail, ok, type ParamsOf, parseBody, requireUser, route } from "@/lib/api";
import { draftCitizenNote } from "@/lib/assist";
import { getAssistContext } from "@/lib/dal";
import { STAFF_ROLES } from "@/lib/roles";
import { assistSchema } from "@/lib/validators";

// Asisten AI petugas: draf catatan untuk warga dari catatan singkat petugas. Tidak mengubah data;
// petugas tetap mengirim catatannya sendiri lewat /actions.
export const POST = route(async (request, { params }: ParamsOf<{ resi: string }>) => {
  const { error: authError } = await requireUser(STAFF_ROLES);
  if (authError) return authError;

  const { data, error } = await parseBody(request, assistSchema);
  if (error) return error;

  const context = await getAssistContext((await params).resi);
  if (!context) return fail(404, "Permohonan tidak ditemukan.");

  try {
    return ok(await draftCitizenNote({ ...data, ...context }));
  } catch (err) {
    console.error("[assist]", err);
    return fail(502, "Asisten AI sedang tidak bisa dihubungi. Tulis catatannya secara manual.");
  }
});
