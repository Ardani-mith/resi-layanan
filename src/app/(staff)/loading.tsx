import { PageSkeleton } from "@/components/skeletons";

/**
 * Kerangka halaman petugas saat berpindah menu (loading global area petugas). Sidebar tetap
 * tampil karena berada di layout; halaman yang punya kerangka sendiri (antrean, detail,
 * dashboard) menggantinya begitu kerangka halaman itu siap.
 */
export default function StaffLoading() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <PageSkeleton />
    </div>
  );
}
