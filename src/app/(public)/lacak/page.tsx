import Link from "next/link";
import ResiSearch from "@/components/application/ResiSearch";
import { PageSlide } from "@/components/ui";
import { site } from "@/config/site";

export const metadata = { title: "Lacak resi" };

export default function TrackSearchPage() {
  return (
    <PageSlide className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-2xl font-bold tracking-tight">Lacak permohonan</h1>
      <p className="mt-1 text-muted">
        Masukkan nomor resi yang Anda terima saat mengajukan, online maupun di loket.
      </p>
      <div className="mt-6">
        <ResiSearch example={site.hero.exampleResi} autoFocus />
      </div>
      <p className="mt-6 text-sm text-muted">
        Lupa nomor resi?{" "}
        <Link
          href="/lacak/lupa"
          transitionTypes={["nav-forward"]}
          className="font-semibold text-brand hover:underline"
        >
          Cari dengan NIK & nomor HP
        </Link>
      </p>
    </PageSlide>
  );
}
