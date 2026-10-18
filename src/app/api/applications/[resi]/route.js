import { fail, ok, requireUser, route } from "@/lib/api";
import { eventsFor, loadByResi } from "@/lib/applications";
import { getClock } from "@/lib/clock";
import { staffView } from "@/lib/present";
import { STAFF_ROLES } from "@/lib/roles";

// Detail lengkap untuk petugas: catatan internal, eskalasi, audit log.
export const GET = route(async (request, { params }) => {
  const { error } = await requireUser(STAFF_ROLES);
  if (error) return error;

  const { resi } = await params;
  const clock = await getClock();
  const app = await loadByResi(resi, clock);
  if (!app) return fail(404, "Permohonan tidak ditemukan.");

  return ok(staffView(app, clock, await eventsFor(app._id)));
});
