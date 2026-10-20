import { ok, parseBody, requireUser, route } from "@/lib/api";
import { homeFor } from "@/lib/roles";
import { createSession } from "@/lib/session";
import { changeOwnPassword } from "@/lib/users";
import { passwordChangeSchema } from "@/lib/validators";

// Ganti kata sandi sendiri (juga kata sandi sementara dari admin). Sesi di perangkat
// lain berakhir; perangkat ini langsung mendapat sesi baru.
export const POST = route(async (request) => {
  const { user, error: authError } = await requireUser(null, { allowTempPassword: true });
  if (authError) return authError;

  const { data, error } = await parseBody(request, passwordChangeSchema);
  if (error) return error;

  const updated = await changeOwnPassword(user.id, data);
  await createSession(updated);
  return ok({ home: homeFor(updated.role) });
});
