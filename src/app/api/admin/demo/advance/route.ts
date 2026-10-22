import { ok, parseBody, requireUser, route } from "@/lib/api";
import { advanceClock, getClock, resetClock } from "@/lib/clock";
import { syncOverdue } from "@/lib/escalation";
import { addWorkHours, DAY_MS } from "@/lib/sla";
import { advanceSchema } from "@/lib/validators";

// MODE DEMO: geser jam sistem agar keterlambatan & eskalasi bisa didemokan langsung.
// Body: { hours: 4 } = maju 4 JAM KERJA (satuan yang sama dengan SLA: Jumat 15.00 + 4 jam =
// Senin 11.00, jadi tenggat tetap terlewati walau melewati malam/akhir pekan); { reset: true } = kembali.
export const POST = route(async (request) => {
  const { error: authError } = await requireUser(["admin"]);
  if (authError) return authError;

  const { data, error } = await parseBody(request, advanceSchema);
  if (error) return error;

  const cancelled = data.reset ? await resetClock() : 0;
  if (!data.reset) {
    const before = await getClock();
    const target = addWorkHours(before.now, data.hours, before.holidays);
    await advanceClock(target.getTime() - before.now.getTime());
  }

  const clock = await getClock();
  const escalated = await syncOverdue(clock.now, clock.holidays);
  return ok({
    clockOffsetMs: clock.clockOffsetMs,
    offsetDays: clock.clockOffsetMs / DAY_MS,
    now: clock.now,
    escalated,
    cancelled,
  });
});
