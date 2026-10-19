"use client";

import { useSyncExternalStore } from "react";
import { THEME_EVENT, THEME_KEY } from "@/lib/theme";

function subscribe(onChange) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

/** Simpan pilihan; skrip tema di <head> (lib/theme.js) yang memasang data-theme di <html>. */
function setTheme(theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** `[theme, setTheme]`: pilihan tema pengguna. Saat render server: null (belum diketahui). */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);
  return [theme, setTheme];
}
