import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { getAdminEvents, getAdminHolidays, getClockInfo, requireStaffPage } from "@/lib/dal";
import { wibDateKey } from "@/lib/sla";
import AdminLog from "../AdminLog";
import HolidayEditor from "./HolidayEditor";

export const metadata = { title: "Hari libur" };

async function HolidaysPanel() {
  await requireStaffPage(["admin"], "/admin/libur");
  const [holidays, events, clock] = await Promise.all([
    getAdminHolidays(),
    getAdminEvents("holidays_", 10),
    getClockInfo(),
  ]);
  return (
    <>
      <section className="rounded-card border border-line bg-surface p-5">
        <HolidayEditor holidays={holidays} today={wibDateKey(clock.now)} />
      </section>
      <AdminLog events={events} />
    </>
  );
}

export default function AdminHolidaysPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hari libur</h1>
        <p className="mt-1 text-muted">
          Tanggal di sini tidak dihitung sebagai hari kerja, jadi tenggat yang jatuh di hari libur bergeser ke
          hari kerja berikutnya. Masukkan libur nasional & cuti bersama sesuai SKB 3 Menteri.
        </p>
        <p className="mt-3 rounded-xl border-l-4 border-warn bg-warn-soft px-3 py-2 text-sm">
          Hari libur baru hanya berlaku untuk tahap yang <strong>dimulai setelah disimpan</strong>. Tenggat
          tahap yang sedang berjalan tidak ikut bergeser.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <HolidaysPanel />
      </Suspense>
    </div>
  );
}
