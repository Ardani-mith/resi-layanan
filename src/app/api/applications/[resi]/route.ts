import { fail, ok, requireUser, route } from "@/lib/api";
import { getStaffApplication } from "@/lib/dal";
import { STAFF_ROLES } from "@/lib/roles";

// Detail lengkap untuk petugas: catatan internal, eskalasi, audit log.
export const GET = route(async (request, { params }) => {
  const { user, error } = await requireUser(STAFF_ROLES);
  if (error) return error;

  const data = await getStaffApplication((await params).resi, user);
  return data ? ok(data) : fail(404, "Permohonan tidak ditemukan.");
});
