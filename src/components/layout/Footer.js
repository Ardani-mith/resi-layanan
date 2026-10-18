import { site } from "@/config/site";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted sm:flex-row sm:justify-between">
        <p>
          <span className="font-semibold text-text">{site.name}</span> · {site.agency}
        </p>
        <p>{site.demoNotice}</p>
      </div>
    </footer>
  );
}
