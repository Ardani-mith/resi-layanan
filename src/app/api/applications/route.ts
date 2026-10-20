import { after } from "next/server";
import { fail, ok, parseBody, route } from "@/lib/api";
import { createApplication } from "@/lib/applications";
import { getClock } from "@/lib/clock";
import { notifyApplicant } from "@/lib/notify";
import { siteOrigin } from "@/lib/qr";
import type { Role } from "@/lib/roles";
import { getSession } from "@/lib/session";
import { applicationSchema } from "@/lib/validators";

const LOKET_ROLES: readonly Role[] = ["petugas_loket", "admin"];

// Pengajuan online (warga, tanpa login) atau input walk-in di loket (petugas).
export const POST = route(async (request) => {
  const { data, error } = await parseBody(request, applicationSchema);
  if (error) return error;

  const user = await getSession();
  if (data.channel === "loket" && !(user && LOKET_ROLES.includes(user.role))) {
    return fail(403, "Pengajuan lewat loket hanya bisa diinput petugas loket.");
  }

  const clock = await getClock();
  const app = await createApplication({
    input: data,
    actor: data.channel === "loket" ? user : null,
    clock,
  });
  // Email dikirim setelah respons terkirim: warga tidak menunggu, dan gagal kirim tidak menggagalkan pengajuan.
  const origin = await siteOrigin();
  after(() => notifyApplicant("created", app, origin));
  return ok({ resi: app.resi, serviceName: app.serviceName, createdAt: app.createdAt }, 201);
});
