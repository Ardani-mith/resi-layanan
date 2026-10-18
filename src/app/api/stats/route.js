import Application from "@/models/Application";
import Service from "@/models/Service";
import { ok, requireUser, route } from "@/lib/api";
import { getClock } from "@/lib/clock";
import { syncOverdue } from "@/lib/escalation";
import { computeStats, openEscalations } from "@/lib/stats";

// Publik (rapor SLA): agregat saja. ?scope=internal (pimpinan/admin): + daftar eskalasi.
export const GET = route(async (request) => {
  const internal = request.nextUrl.searchParams.get("scope") === "internal";
  if (internal) {
    const { error } = await requireUser(["pimpinan", "admin"]);
    if (error) return error;
  }

  const clock = await getClock();
  await syncOverdue(clock.now, clock.holidays);

  const [apps, services] = await Promise.all([
    Application.find()
      .select("resi serviceId serviceName applicant.name status currentStep steps escalations rating createdAt completedAt")
      .lean(),
    Service.find({ isActive: true }).sort({ order: 1, name: 1 }).select("name slug").lean(),
  ]);

  const stats = computeStats(apps, services, clock.now);
  if (internal) stats.escalations = openEscalations(apps, clock.now);
  return ok(stats);
});
