import { DetailSkeleton } from "@/components/skeletons";

/** Kerangka panel detail antrean saat pindah permohonan (daftar antrean tetap tampil). */
export default function DetailLoading() {
  return (
    <div data-detail className="p-4 sm:p-6 lg:p-8">
      <DetailSkeleton />
    </div>
  );
}
