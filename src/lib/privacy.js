/** "Ardani Setiawan" → "Ar*** S***". Nama lengkap tidak pernah keluar ke tampilan publik. */
export function maskName(name) {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "***";
  return words.map((word, i) => `${word.slice(0, i === 0 ? 2 : 1)}***`).join(" ");
}

/** "081234567890" → "0812****7890". */
export function maskPhone(phone) {
  const digits = String(phone ?? "");
  if (digits.length < 8) return "****";
  return `${digits.slice(0, 4)}${"*".repeat(digits.length - 8)}${digits.slice(-4)}`;
}

/** Nomor HP dinormalisasi ke format 08xxxxxxxxxx. */
export function normalizePhone(input) {
  const digits = String(input ?? "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+62")) return `0${digits.slice(3)}`;
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

export function phoneMatchesLast4(phone, last4) {
  return String(phone ?? "").slice(-4) === String(last4 ?? "");
}
