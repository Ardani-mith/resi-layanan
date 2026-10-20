// Tema tampilan: "system" (ikut OS), "light", atau "dark". Pilihan disimpan di localStorage
// (bukan cookie) agar halaman tetap bisa di-prerender; tanpa pilihan tersimpan = "system".
export const THEME_KEY = "theme";
export const THEME_EVENT = "themechange";
export const THEMES = ["system", "light", "dark"];

/**
 * Dijalankan inline di <head> (lihat app/layout.js) sebelum halaman digambar, jadi tidak ada
 * kedip tema. Mengisi <html data-theme="light|dark">, lalu tetap aktif selama dokumen hidup:
 * mengikuti perubahan tema OS, pilihan di tab lain, dan event THEME_EVENT dari tombol tema.
 * Diserialisasi dengan toString(), jadi tidak boleh memakai apa pun di luar fungsinya.
 */
function initTheme(key, eventName) {
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  function apply() {
    let stored = null;
    try {
      stored = localStorage.getItem(key);
    } catch {
      // localStorage diblokir (mis. pengaturan privasi ketat): ikut tema OS.
    }
    root.dataset.theme = stored === "light" || stored === "dark" ? stored : media.matches ? "dark" : "light";
  }
  apply();
  media.addEventListener("change", apply);
  window.addEventListener(eventName, apply);
  window.addEventListener("storage", (event) => event.key === key && apply());
}

export const themeScript = `(${initTheme})(${JSON.stringify(THEME_KEY)},${JSON.stringify(THEME_EVENT)})`;
