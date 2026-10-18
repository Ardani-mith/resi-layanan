// Bilangan dalam teks, termasuk desimal berkoma ("6,8") sebagai satu bilangan.
const NUMBER = /\d+(?:,\d+)?/g;

/**
 * Teks `value` dengan setiap bilangannya di titik `progress` (0–1, ease-out),
 * format & jumlah desimal dipertahankan: countUpFrame("6,8 hari", 0) → "0,0 hari".
 */
export function countUpFrame(value, progress) {
  const eased = 1 - (1 - progress) ** 3;
  return value.replace(NUMBER, (match) => {
    const decimals = match.split(",")[1]?.length ?? 0;
    const current = Number(match.replace(",", ".")) * eased;
    return current.toFixed(decimals).replace(".", ",");
  });
}
