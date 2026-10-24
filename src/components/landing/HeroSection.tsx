import ResiSearch from "@/components/application/ResiSearch";
import ReceiptSlip from "@/components/landing/ReceiptSlip";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";

/** Jeda animasi (CSS murni) agar elemen hero muncul berurutan. */
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

export default function HeroSection({ hero }: { hero: typeof site.hero }) {
  const lastLine = hero.titleLines.length - 1;
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12 lg:pt-20 lg:pb-24">
        <div>
          {/* Baris kop: seperti kepala surat dinas, bukan label "pil". */}
          <p className="flex items-center gap-3 font-mono text-xs tracking-[0.14em] text-muted uppercase motion-safe:animate-fade-up">
            <span className="hidden sm:inline">{site.agency}</span>
            <span aria-hidden className="hidden h-px flex-1 bg-line sm:block" />
            <span className="text-brand">{hero.kicker}</span>
          </p>

          {/* HP: teks mengalir alami (text-balance) dan muncul sebagai satu blok.
              Desktop: tiap baris naik bergantian dari balik "jendela" overflow-hidden. */}
          <h1
            id="hero-title"
            className="mt-8 text-[clamp(2.3rem,9vw,3rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance motion-safe:animate-fade-up lg:text-[clamp(3rem,4.6vw,4.1rem)] lg:motion-safe:animate-none"
          >
            {hero.titleLines.map((line, i) => (
              <span key={line} className="lg:-mb-1 lg:block lg:overflow-hidden lg:pb-1">
                <span
                  className={cn(
                    "lg:block lg:whitespace-nowrap lg:motion-safe:animate-rise",
                    i === lastLine && "text-brand",
                  )}
                  style={delay(100 + i * 90)}
                >
                  {line}
                </span>
                {i < lastLine && " "}
              </span>
            ))}
          </h1>

          <p className="mt-6 max-w-md text-lg text-muted motion-safe:animate-fade-up" style={delay(350)}>
            {hero.body}
          </p>

          <div className="mt-8 max-w-xl motion-safe:animate-fade-up" style={delay(450)}>
            <ResiSearch example={hero.exampleResi} />
          </div>

          <ul
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5 text-sm text-muted motion-safe:animate-fade-up"
            style={delay(550)}
          >
            {hero.highlights.map((text, i) => (
              <li key={text} className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-brand">0{i + 1}</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            <span className="mr-2 rounded-sm border border-line px-1.5 py-0.5 font-semibold">
              {site.demo.badge}
            </span>
            {site.agency} (fiktif) · peta memakai contoh lokasi di DKI Jakarta
          </p>
        </div>

        <div className="motion-safe:animate-fade-up" style={delay(300)}>
          <ReceiptSlip resi={hero.exampleResi} />
        </div>
      </div>
    </section>
  );
}
