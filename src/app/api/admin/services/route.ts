import { saveService } from "@/lib/admin";
import { ok, parseBody, requireUser, route } from "@/lib/api";
import { serviceSchema } from "@/lib/validators";

// Admin membuat layanan baru (tahapan, SLA, persyaratan).
export const POST = route(async (request) => {
  const { user, error: authError } = await requireUser(["admin"]);
  if (authError) return authError;

  const { data, error } = await parseBody(request, serviceSchema);
  if (error) return error;

  const service = await saveService(data, user);
  return ok({ id: String(service._id), slug: service.slug }, 201);
});
