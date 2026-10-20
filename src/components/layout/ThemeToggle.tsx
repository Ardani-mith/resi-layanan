"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";
import { THEMES } from "@/lib/theme";

const OPTIONS = {
  system: { label: "Sistem", Icon: Monitor },
  light: { label: "Terang", Icon: Sun },
  dark: { label: "Gelap", Icon: Moon },
};

/** Tombol tema: tiap klik berganti Sistem → Terang → Gelap. */
export default function ThemeToggle({ className }) {
  const [theme, setTheme] = useTheme();
  // Render server belum tahu pilihan pengguna: tampilkan "Sistem" sampai hydration selesai.
  const current = theme ?? "system";
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  const { label, Icon } = OPTIONS[current];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Tema: ${label}. Ganti ke ${OPTIONS[next].label.toLowerCase()}`}
      title={`Tema: ${label}`}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text",
        className,
      )}
    >
      <Icon aria-hidden className="size-4.5" />
    </button>
  );
}
