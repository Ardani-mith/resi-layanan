import { redirect } from "next/navigation";
import { Suspense } from "react";
import ResiSearch from "@/components/application/ResiSearch";
import { Skeleton } from "@/components/ui";
import { site } from "@/config/site";
import type { ParamsOf } from "@/lib/api";
import { getClockInfo, getTracking } from "@/lib/dal";
import { receiptFor } from "@/lib/qr";
import { isValidResi, normalizeResi } from "@/lib/resi";
import TrackView from "./TrackView";

export const metadata = { title: "Lacak resi" };

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-6 shadow-card">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">{body}</p>
      <div className="mt-5">
        <ResiSearch example={site.hero.exampleResi} />
      </div>
    </div>
  );
}

function TrackSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat status permohonan">
      <Skeleton className="h-52" />
      <Skeleton className="h-80" />
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

  return <TrackView data={data} serverNow={clock.now} offsetMs={clock.offsetMs} receipt={receipt} />;
}

export default function TrackPage({ params }: ParamsOf<{ resi: string }>) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Suspense fallback={<TrackSkeleton />}>
        <Tracking params={params} />
      </Suspense>
    </div>
  );
}
