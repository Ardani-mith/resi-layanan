import ResiSearch from "@/components/application/ResiSearch";
import { Eyebrow, GuideLines, Hatch, Icon } from "@/components/landing/Decor";
import TrackingPreview from "@/components/landing/TrackingPreview";
import type { site } from "@/config/site";
import { cn } from "@/lib/cn";

/** Jeda animasi (CSS murni) agar elemen hero muncul berurutan. */
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

export default function HeroSection({ hero }: { hero: typeof site.hero }) {
  const lastLine = hero.titleLines.length - 1;
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden surface-hero">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 pattern-grid [mask-image:radial-gradient(ellipse_at_60%_35%,black,transparent_75%)]"
      />

      <div className="relative mx-auto max-w-6xl">
        <GuideLines />
        <div className="grid gap-14 px-4 pt-14 pb-20 sm:pt-20 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-16 lg:px-10 lg:pt-24 lg:pb-24">
          <div>
            <Eyebrow tone="hero" className="motion-safe:animate-fade-up">
              {hero.eyebrow}
            </Eyebrow>

            {/* HP: teks mengalir alami (text-balance) dan muncul sebagai satu blok.
                Desktop: tiap baris naik bergantian dari balik "jendela" overflow-hidden. */}
            <h1
              id="hero-title"
              className="mt-5 text-[clamp(2.1rem,8.5vw,2.6rem)] leading-[1.08] font-extrabold tracking-tight text-balance motion-safe:animate-fade-up lg:text-[clamp(2.6rem,3.5vw,3.1rem)] lg:motion-safe:animate-none"
            >
              {hero.titleLines.map((line, i) => (
                <span key={line} className="lg:-mb-1 lg:block lg:overflow-hidden lg:pb-1">
                  <span
                    className={cn(
                      "lg:block lg:whitespace-nowrap lg:motion-safe:animate-rise",
                      i === lastLine &&
                        "bg-linear-to-r from-hero-accent to-hero-accent-end bg-clip-text text-transparent",
                    )}
                    style={delay(100 + i * 90)}
                  >
                    {line}
                  </span>
                  {i < lastLine && " "}
                </span>
              ))}
            </h1>

            <p
              className="mt-5 max-w-lg text-lg text-hero-muted motion-safe:animate-fade-up"
              style={delay(350)}
            >
              {hero.body}
            </p>

            <div className="mt-8 max-w-xl motion-safe:animate-fade-up" style={delay(450)}>
              <ResiSearch example={hero.exampleResi} variant="hero" />
            </div>

            <ul
              className="mt-9 grid gap-3 text-sm text-hero-muted motion-safe:animate-fade-up sm:grid-cols-3"
              style={delay(550)}
            >
              {hero.highlights.map((item) => (
                <li key={item.text} className="flex items-start gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-hero-soft">
                    <Icon name={item.icon} className="size-4 text-hero-accent" />
                  </span>
                  <span className="pt-1">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="motion-safe:animate-fade-up" style={delay(300)}>
            <TrackingPreview resi={hero.exampleResi} {...hero.preview} />
          </div>
        </div>
      </div>

      <Hatch />
    </section>
  );
}
