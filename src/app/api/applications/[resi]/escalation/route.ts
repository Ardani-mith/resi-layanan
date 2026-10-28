import { after } from "next/server";
import { ok, type ParamsOf, parseBody, requireUser, route } from "@/lib/api";
import { followUpEscalation } from "@/lib/applications";
import { getClock } from "@/lib/clock";
import { notifyApplicant } from "@/lib/notify";
import { staffView } from "@/lib/present";
import { siteOrigin } from "@/lib/qr";
import { followUpSchema } from "@/lib/validators";

// Tindak lanjut eskalasi oleh pimpinan: tanggapan untuk warga, arahan untuk petugas, janji selesai.
export const POST = route(async (request, { params }: ParamsOf<{ resi: string }>) => {
  const { user, error: authError } = await requireUser(["pimpinan"]);
  if (authError) return authError;

  const { data, error } = await parseBody(request, followUpSchema);
  if (error) return error;

  const { resi } = await params;
  const clock = await getClock();
  const app = await followUpEscalation({ resi, input: data, actor: user, clock });
  const origin = await siteOrigin();
  after(() => notifyApplicant("follow_up", app, origin));
  return ok(staffView(app, clock));
});
