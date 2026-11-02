import { DashboardSkeleton } from "@/components/skeletons";

/** Kerangka dashboard pimpinan saat dibuka dari menu. */
export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <DashboardSkeleton />
    </div>
  );
}
