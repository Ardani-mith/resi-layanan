import { ok, requireUser, route } from "@/lib/api";
import { getQueue } from "@/lib/dal";
import { STAFF_ROLES } from "@/lib/roles";

// Antrean petugas, paling mendesak di atas. Aturan visibilitas ada di getQueue().
export const GET = route(async () => {
  const { user, error } = await requireUser(STAFF_ROLES);
  if (error) return error;
  return ok(await getQueue(user));
});
