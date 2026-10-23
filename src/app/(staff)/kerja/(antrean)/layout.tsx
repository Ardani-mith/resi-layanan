import { type ReactNode, Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { getQueue, requireStaffPage } from "@/lib/dal";
import { STAFF_ROLES } from "@/lib/roles";
import QueueBoard from "./QueueBoard";

async function Queue() {
  const user = await requireStaffPage(STAFF_ROLES, "/kerja");
  return <QueueBoard {...await getQueue(user)} />;
}

/**
 * Antrean dua panel (seperti kotak masuk email): daftar di kiri, detail permohonan di kanan,
 * masing-masing menggulir sendiri. Di HP satu panel saja: halaman detail menandai dirinya
 * dengan `data-detail`, dan CSS :has() menyembunyikan daftar (dan sebaliknya di /kerja).
 */
export default function QueueLayout({ children }: { children: ReactNode }) {
  return (
    <div className="group/split lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(22rem,26rem)_1fr]">
      <div className="border-line group-has-[[data-detail]]/split:hidden lg:block! lg:overflow-y-auto lg:border-r lg:bg-surface">
        <Suspense fallback={<Skeleton className="m-4 h-96" />}>
          <Queue />
        </Suspense>
      </div>
      <div className="hidden group-has-[[data-detail]]/split:block lg:block lg:overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
