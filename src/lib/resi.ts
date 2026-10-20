// Nomor resi: format, normalisasi, dan pembangkit acak. Tanpa dependensi Node
// (Web Crypto), jadi aman dipakai di browser (form cek resi) maupun server.

// Tanpa karakter yang mudah tertukar saat dibacakan/diketik: O/0 dan I/1. Tepat 32
// karakter, sehingga byte acak & 31 memilih tiap karakter dengan peluang sama.
export const RESI_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const RESI_PATTERN = /^RL-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

/** Kode acak (CSPRNG) dari RESI_ALPHABET; dipakai untuk resi & kata sandi sementara. */
export function randomCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => RESI_ALPHABET[b & 31]).join("");
}

/** Resi acak, tidak berurutan sehingga tidak bisa ditebak dari resi lain. */
export function generateResi(): string {
  return `RL-${randomCode(4)}-${randomCode(4)}`;
}

/** Rapikan input warga: huruf besar, spasi dibuang, "RL" & tanda hubung boleh lupa. */
export function normalizeResi(input: unknown): string {
  const raw = String(input ?? "")
    .toUpperCase()
    .replace(/[\s-]/g, "");
  const body = raw.startsWith("RL") ? raw.slice(2) : raw;
  if (body.length !== 8)
    return String(input ?? "")
      .trim()
      .toUpperCase();
  return `RL-${body.slice(0, 4)}-${body.slice(4)}`;
}

export function isValidResi(value: string): boolean {
  return RESI_PATTERN.test(value);
}
