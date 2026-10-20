import { ok, parseBody, requireUser, route } from "@/lib/api";
import { createStaff } from "@/lib/users";
import { staffCreateSchema } from "@/lib/validators";

// Admin menambah akun petugas. Kata sandi sementara hanya dikirim di respons ini.
export const POST = route(async (request) => {
  const { user, error: authError } = await requireUser(["admin"]);
  if (authError) return authError;

  const { data, error } = await parseBody(request, staffCreateSchema);
  if (error) return error;

  return ok(await createStaff(data, user), 201);
});
