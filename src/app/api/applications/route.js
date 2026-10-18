import { fail, ok, parseBody, route } from "@/lib/api";
import { createApplication } from "@/lib/applications";
import { getClock } from "@/lib/clock";
import { getSession } from "@/lib/session";
import { applicationSchema } from "@/lib/validators";

const LOKET_ROLES = ["petugas_loket", "admin"];

// Pengajuan online (warga, tanpa login) atau input walk-in di loket (petugas).
export const POST = route(async (request) => {
  const { data, error } = await parseBody(request, applicationSchema);
  if (error) return error;

  const user = await getSession();
  if (data.channel === "loket" && !LOKET_ROLES.includes(user?.role)) {
    return fail(403, "Pengajuan lewat loket hanya bisa diinput petugas loket.");
  }

  const clock = await getClock();
  const app = await createApplication({
    input: data,
    actor: data.channel === "loket" ? user : null,
    clock,
  });
  return ok({ resi: app.resi, serviceName: app.serviceName, createdAt: app.createdAt }, 201);
});
