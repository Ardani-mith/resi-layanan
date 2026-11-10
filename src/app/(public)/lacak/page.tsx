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
        {/* HP: teks lebih pendek agar pil tetap satu baris. */}
        <p className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-hero-line bg-hero-chip px-4 py-1.5 text-sm whitespace-nowrap text-hero-muted backdrop-blur">
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-[#4ade80] motion-safe:animate-pulse"
          />
          <span className="sm:hidden">Tenggat tiap tahap bisa Anda pantau</span>
          <span className="hidden sm:inline">Setiap tahap punya tenggat yang bisa Anda pantau</span>
        </p>
      </TrackSearchHero>
    </PageSlide>
  );
}
