import { TrackSearchHero } from "@/components/application/TrackHero";
import { PageSlide } from "@/components/ui";

export const metadata = { title: "Lacak resi" };

export default function TrackSearchPage() {
  return (
    <PageSlide>
      <TrackSearchHero
        title="Lacak permohonan"
        body="Masukkan nomor resi yang Anda terima saat mengajukan, online maupun di loket."
        autoFocus
      >
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-hero-line bg-hero-chip px-4 py-1.5 text-sm text-hero-muted backdrop-blur">
          <span aria-hidden className="size-1.5 rounded-full bg-[#4ade80] motion-safe:animate-pulse" />
          Setiap tahap punya tenggat yang bisa Anda pantau
        </p>
      </TrackSearchHero>
    </PageSlide>
  );
}
