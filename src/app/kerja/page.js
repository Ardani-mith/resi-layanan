import { Suspense } from "react";
import DemoClockBanner from "@/components/layout/DemoClockBanner";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { getQueue, requireStaffPage } from "@/lib/dal";
import { ROLE_LABELS, STAFF_ROLES } from "@/lib/roles";
import QueueBoard from "./QueueBoard";

export const metadata = { title: "Antrean petugas" };

async function Queue() {
  const user = await requireStaffPage(STAFF_ROLES, "/kerja");
  const queue = await getQueue(user);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Antrean</h1>
          <p className="text-muted">
            {user.name} · {ROLE_LABELS[user.role]}. Paling mendesak di atas.
          </p>
        </div>
        {(user.role === "petugas_loket" || user.role === "admin") && (
          <Button href="/kerja/baru">+ Input warga di loket</Button>
        )}
      </div>
      <DemoClockBanner offsetMs={queue.offsetMs} />
      <QueueBoard {...queue} />
    </>
  );
}

export default function WorkPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <Suspense fallback={<Skeleton />}>
        <Queue />
      </Suspense>
    </div>
  );
}
