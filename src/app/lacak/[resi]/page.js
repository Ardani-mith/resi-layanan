import { redirect } from "next/navigation";
import { Suspense } from "react";
import ResiSearch from "@/components/ResiSearch";
import { site } from "@/config/site";
import { loadByResi } from "@/lib/applications";
import { getClock } from "@/lib/clock";
import { dbConnect } from "@/lib/db";
import { publicView } from "@/lib/present";
import { isValidResi, normalizeResi } from "@/lib/resi-format";
import TrackView from "./TrackView";

export const metadata = { title: "Lacak resi" };

function Problem({ title, body }) {
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
      <div className="h-52 animate-pulse rounded-card bg-surface" />
      <div className="h-80 animate-pulse rounded-card bg-surface" />
    </div>
  );
}

// params = data saat request → dibaca di dalam <Suspense> (Cache Components).
async function Tracking({ params }) {
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

  await dbConnect();
  const clock = await getClock();
  const app = await loadByResi(resi, clock);
  if (!app) {
    return (
      <Problem
        title="Resi tidak ditemukan"
        body={`Tidak ada permohonan dengan nomor ${resi}. Periksa kembali nomornya. Resi tidak pernah memakai huruf O/I maupun angka 0/1.`}
      />
    );
  }

  return <TrackView data={publicView(app, clock)} serverNow={clock.now.toISOString()} offsetMs={clock.clockOffsetMs} />;
}

export default function TrackPage({ params }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Suspense fallback={<TrackSkeleton />}>
        <Tracking params={params} />
      </Suspense>
    </div>
  );
}
