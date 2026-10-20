import { ok, parseBody, requireUser, route } from "@/lib/api";
import { advanceClock, getClock, resetClock } from "@/lib/clock";
import { syncOverdue } from "@/lib/escalation";
import { DAY_MS } from "@/lib/sla";
import { advanceSchema } from "@/lib/validators";

// MODE DEMO: geser jam sistem agar keterlambatan & eskalasi bisa didemokan langsung.
// Body: { days: 1 } untuk maju, { reset: true } untuk kembali ke waktu nyata.
export const POST = route(async (request) => {
  const { error: authError } = await requireUser(["admin"]);
  if (authError) return authError;

  const { data, error } = await parseBody(request, advanceSchema);
  if (error) return error;

  const cancelled = data.reset ? await resetClock() : 0;
  if (!data.reset) await advanceClock(data.days * DAY_MS);

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
