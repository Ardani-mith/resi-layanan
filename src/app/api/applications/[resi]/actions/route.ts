import { after } from "next/server";
import { ok, type ParamsOf, parseBody, requireUser, route } from "@/lib/api";
import { performAction } from "@/lib/applications";
import { getClock } from "@/lib/clock";
import { notifyApplicant } from "@/lib/notify";
import { staffView } from "@/lib/present";
import { siteOrigin } from "@/lib/qr";
import { STAFF_ROLES } from "@/lib/roles";
import { actionSchema } from "@/lib/validators";

// Aksi petugas: complete | request_fix | resume | reject.
export const POST = route(async (request, { params }: ParamsOf<{ resi: string }>) => {
  const { user, error: authError } = await requireUser(STAFF_ROLES);
  if (authError) return authError;

  const { data, error } = await parseBody(request, actionSchema);
  if (error) return error;

  const { resi } = await params;
  const clock = await getClock();
  const app = await performAction({ resi, input: data, actor: user, clock });
  const origin = await siteOrigin();
  after(() => notifyApplicant(data.action, app, origin));
  return ok(staffView(app, clock));
});
