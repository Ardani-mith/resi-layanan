import { ok, parseBody, requireUser, route } from "@/lib/api";
import { advanceClock, getClock, resetClock } from "@/lib/clock";
import { syncOverdue } from "@/lib/escalation";
import { addWorkdays, DAY_MS } from "@/lib/sla";
import { advanceSchema } from "@/lib/validators";

// MODE DEMO: geser jam sistem agar keterlambatan & eskalasi bisa didemokan langsung.
// Body: { days: 2 } = maju 2 HARI KERJA (satuan yang sama dengan SLA, jadi Kamis +2 tetap
// melewati tenggat 2 hari kerja, bukan berhenti di Sabtu); { reset: true } = kembali.
export const POST = route(async (request) => {
  const { error: authError } = await requireUser(["admin"]);
  if (authError) return authError;

  const { data, error } = await parseBody(request, advanceSchema);
  if (error) return error;

  const cancelled = data.reset ? await resetClock() : 0;
  if (!data.reset) {
    const before = await getClock();
    const target = addWorkdays(before.now, data.days, before.holidays);
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
