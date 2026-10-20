import { ok, type ParamsOf, parseBody, requireUser, route } from "@/lib/api";
import { resetStaffPassword, setStaffActive, updateStaff } from "@/lib/users";
import { staffActionSchema } from "@/lib/validators";

// Aksi admin atas satu akun: { action: "update" | "set_active" | "reset_password", ... }.
export const POST = route(async (request, { params }: ParamsOf<{ id: string }>) => {
  const { user, error: authError } = await requireUser(["admin"]);
  if (authError) return authError;

  const { data, error } = await parseBody(request, staffActionSchema);
  if (error) return error;

  const { id } = await params;
  if (data.action === "reset_password") return ok(await resetStaffPassword(id, user));
  if (data.action === "set_active") return ok({ account: await setStaffActive(id, data.isActive, user) });
  return ok({ account: await updateStaff(id, data, user) });
});
