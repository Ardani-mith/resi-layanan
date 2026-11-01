import { Quote } from "lucide-react";
import SpotlightCard from "@/components/landing/SpotlightCard";
import type { site } from "@/config/site";
import { cn } from "@/lib/cn";

type Data = typeof site.testimonials;
type Item = Data["items"][number];

const KIND_LABEL: Record<Item["kind"], string> = {
  pengalaman: "Pengalaman",
  demo: "Setelah mencoba demo",
};

/** Warna avatar inisial bergiliran (token status yang lembut). */
const AVATAR = ["bg-brand-soft text-brand", "bg-ok-soft text-ok", "bg-pause-soft text-pause"];

/**
 * Kutipan wawancara (tiga orang): grid kartu sorot, satu kolom di HP. Selama datanya contoh,
 * label "Data contoh" ditampilkan agar tidak terbaca sebagai kutipan asli.
 */
export default function Testimonials({ data }: { data: Data }) {
  return (
    <div>
      {data.mock && (
        <p className="mb-8 inline-flex items-center gap-2 rounded-full bg-warn-soft px-3 py-1 text-xs font-semibold text-warn">
          <span aria-hidden className="size-1.5 rounded-full bg-warn" />
          {data.mockNotice}
        </p>
      )}
      <ul className="grid gap-4 md:grid-cols-3">
        {data.items.map((item, i) => (
          <li key={item.name + item.quote} className="reveal">
            <SpotlightCard className="h-full">
              <figure className="flex h-full flex-col p-7">
                <div className="flex items-center justify-between gap-3">
                  <Quote aria-hidden className="size-7 text-brand/40" />
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      item.kind === "demo" ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted",
                    )}
                  >
                    {KIND_LABEL[item.kind]}
                  </span>
                </div>
                <blockquote className="mt-5 flex-1 text-lg leading-relaxed tracking-[-0.01em]">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-11 shrink-0 place-items-center rounded-full font-semibold",
                      AVATAR[i % AVATAR.length],
                    )}
                  >
                    {item.name.replace(/\W/g, "").slice(0, 2)}
                  </span>
                  <span className="min-w-0 text-sm leading-tight">
                    <span className="block font-semibold">{item.name}</span>
                    <span className="mt-0.5 block text-muted">{item.role}</span>
                  </span>
                </figcaption>
              </figure>
            </SpotlightCard>
          </li>
        ))}
      </ul>
    </div>
  );
}
