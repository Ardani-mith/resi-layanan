import { setHolidays } from "@/lib/admin";
import { ok, parseBody, requireUser, route } from "@/lib/api";
import { holidaysSchema } from "@/lib/validators";

// Admin mengganti daftar hari libur (tanggal WIB yang tidak dihitung sebagai hari kerja).
export const POST = route(async (request) => {
  const { user, error: authError } = await requireUser(["admin"]);
  if (authError) return authError;

  const { data, error } = await parseBody(request, holidaysSchema);
  if (error) return error;

  return ok({ holidays: await setHolidays(data, user) });
});
