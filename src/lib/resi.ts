// Format resi tanpa dependensi Node, aman dipakai di browser (form cek resi).

// Tanpa karakter yang mudah tertukar saat dibacakan/diketik: O/0 dan I/1.
export const RESI_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const RESI_PATTERN = /^RL-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

/** Rapikan input warga: huruf besar, spasi dibuang, "RL" & tanda hubung boleh lupa. */
export function normalizeResi(input) {
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

export function isValidResi(value) {
  return RESI_PATTERN.test(value);
}
