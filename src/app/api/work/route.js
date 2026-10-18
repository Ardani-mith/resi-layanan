import Application from "@/models/Application";
import { ok, requireUser, route } from "@/lib/api";
import { getClock } from "@/lib/clock";
import { syncOverdue } from "@/lib/escalation";
import { queueItem } from "@/lib/present";
import { STAFF_ROLES } from "@/lib/roles";
import { OPEN_STATUSES, STATUS } from "@/lib/workflow";

// Antrean petugas. Petugas loket/teknis hanya melihat tahap sesuai perannya
// (plus semua yang menunggu perbaikan untuk loket); pimpinan & admin melihat semua.
// Urutan: paling mendesak (sisa SLA terkecil / paling terlambat) di atas.
export const GET = route(async () => {
  const { user, error } = await requireUser(STAFF_ROLES);
  if (error) return error;

  const clock = await getClock();
  await syncOverdue(clock.now, clock.holidays);

  const apps = await Application.find({ status: { $in: OPEN_STATUSES } })
    .select("resi serviceName applicant.name channel status currentStep steps escalations createdAt")
    .lean();

  const seesAll = user.role === "pimpinan" || user.role === "admin";
  const mine = apps.filter((app) => {
    if (seesAll) return true;
    if (app.status === STATUS.PERLU_PERBAIKAN) return user.role === "petugas_loket";
    return app.steps[app.currentStep]?.role === user.role;
  });

  const items = mine.map((app) => queueItem(app, clock.now));
  const active = items
    .filter((i) => i.status !== STATUS.PERLU_PERBAIKAN)
    .sort((a, b) => (a.remainingMs ?? Infinity) - (b.remainingMs ?? Infinity));
  const waitingFix = items.filter((i) => i.status === STATUS.PERLU_PERBAIKAN);

  return ok({
    role: user.role,
    now: clock.now,
    active,
    waitingFix,
    counts: {
      active: active.length,
      overdue: active.filter((i) => i.stepState === "terlambat").length,
      waitingFix: waitingFix.length,
    },
  });
});
