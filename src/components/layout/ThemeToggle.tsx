"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { type Theme, THEME_EVENT, THEME_KEY, THEMES } from "@/lib/theme";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

/** Simpan pilihan; skrip tema di <head> yang memasang data-theme di <html>. */
function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** `[theme, setTheme]`: pilihan tema pengguna. Saat render server: null (belum diketahui). */
function useTheme(): [Theme | null, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);
  return [theme, setTheme];
}

const OPTIONS = {
  system: { label: "Sistem", Icon: Monitor },
  light: { label: "Terang", Icon: Sun },
  dark: { label: "Gelap", Icon: Moon },
};

/** Tombol tema: tiap klik berganti Sistem → Terang → Gelap. */
export default function ThemeToggle({ className }: { className?: string }) {
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
