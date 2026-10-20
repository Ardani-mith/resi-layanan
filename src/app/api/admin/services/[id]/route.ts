import { saveService } from "@/lib/admin";
import { ok, type ParamsOf, parseBody, requireUser, route } from "@/lib/api";
import { serviceSchema } from "@/lib/validators";

// Admin mengubah layanan. Permohonan yang sudah berjalan tetap memakai tahapan lamanya.
export const POST = route(async (request, { params }: ParamsOf<{ id: string }>) => {
  const { user, error: authError } = await requireUser(["admin"]);
  if (authError) return authError;

  const { data, error } = await parseBody(request, serviceSchema);
  if (error) return error;

  const service = await saveService(data, user, (await params).id);
  return ok({ id: String(service._id), slug: service.slug });
});
