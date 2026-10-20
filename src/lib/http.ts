// Klien untuk route API kita sendiri (format { data } | { error: { message, fields? } }).
// Selalu resolve, tidak pernah throw, supaya setiap form cukup memeriksa `ok`.

const NETWORK_ERROR = "Tidak bisa terhubung ke server. Periksa koneksi Anda lalu coba lagi.";
const SERVER_ERROR = "Terjadi kesalahan di server. Coba lagi sebentar.";

/**
 * POST JSON. Hasil: { ok: true, data } atau { ok: false, status, error: { message, fields } }.
 * `fields` selalu objek (boleh kosong) agar aman di-spread ke state error form.
 */
export async function postJson(url, body) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, error: { message: NETWORK_ERROR, fields: {} } };
  }

  const json = await res.json().catch(() => null);
  if (res.ok) return { ok: true, status: res.status, data: json?.data };
  return {
    ok: false,
    status: res.status,
    error: { message: json?.error?.message ?? SERVER_ERROR, fields: json?.error?.fields ?? {} },
  };
}
