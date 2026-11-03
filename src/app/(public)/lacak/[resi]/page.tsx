import { redirect } from "next/navigation";
import TrackHero, { TrackSearchHero } from "@/components/application/TrackHero";
import { PageSlide, Skeleton, SuspenseReveal } from "@/components/ui";
import type { ParamsOf } from "@/lib/api";
import { ASSISTANT_DAILY_LIMIT } from "@/lib/applications";
import { questionsFor } from "@/lib/assist";
import { cn } from "@/lib/cn";
import { getClockInfo, getTracking } from "@/lib/dal";
import { pushPublicKey } from "@/lib/push";
import { receiptFor } from "@/lib/qr";
import { isValidResi, normalizeResi } from "@/lib/resi";
import TrackView from "./TrackView";

export const metadata = { title: "Lacak resi" };

/** Resi salah format / tidak ada: hero setinggi layar dengan kolom cek resi untuk mencoba lagi. */
function Problem({ title, body }: { title: string; body: string }) {
  return <TrackSearchHero title={title} body={body} />;
}

/** Kerangka saat data dimuat: bentuk kepala gelap + kartu yang sama dengan halaman aslinya. */
function TrackSkeleton() {
  const bar = "rounded-full bg-white/10 motion-safe:animate-pulse";
  return (
    <div aria-busy="true" aria-label="Memuat status permohonan">
      <TrackHero>
        <div className={cn(bar, "h-4 w-40")} />
        <div className={cn(bar, "mt-4 h-11 w-full max-w-md")} />
        <div className="mt-8 h-36 rounded-2xl border border-hero-line bg-hero-chip" />
        <div className="mt-8 h-44 rounded-2xl border border-hero-line bg-hero-chip" />
      </TrackHero>
      <div className="relative -mt-14 grid gap-5 px-page pb-16 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" delay={150} />
      </div>
    </div>
  );
}

// params = data saat request → dibaca di dalam <Suspense> (Cache Components).
async function Tracking({ params }: ParamsOf<{ resi: string }>) {
  const raw = decodeURIComponent((await params).resi);
  const resi = normalizeResi(raw);

  if (!isValidResi(resi)) {
    return (
      <Problem
        title="Format resi tidak dikenali"
        body={`"${raw}" bukan nomor resi yang valid. Nomor resi berbentuk RL-XXXX-XXXX, terdiri dari huruf dan angka 2–9.`}
      />
    );
  }
  if (resi !== raw) redirect(`/lacak/${resi}`);

  const [data, clock, receipt] = await Promise.all([getTracking(resi), getClockInfo(), receiptFor(resi)]);
  if (!data) {
    return (
      <Problem
        title="Resi tidak ditemukan"
        body={`Tidak ada permohonan dengan nomor ${resi}. Periksa kembali nomornya. Resi tidak pernah memakai huruf O/I maupun angka 0/1.`}
      />
    );
  }

  return (
    <TrackView
      data={data}
      serverNow={clock.now}
      offsetMs={clock.offsetMs}
      receipt={receipt}
      questions={questionsFor(data)}
      askLimit={process.env.DEEPSEEK_API_KEY ? ASSISTANT_DAILY_LIMIT : null}
      pushKey={pushPublicKey()}
    />
  );
}

export default function TrackPage({ params }: ParamsOf<{ resi: string }>) {
  return (
    <PageSlide>
      <SuspenseReveal fallback={<TrackSkeleton />}>
        <Tracking params={params} />
      </SuspenseReveal>
    </PageSlide>
  );
}
