// Klien untuk route API kita sendiri (format { data } | { error: { message, fields? } }).
// Selalu resolve, tidak pernah throw, supaya setiap form cukup memeriksa `ok`.

const NETWORK_ERROR = "Tidak bisa terhubung ke server. Periksa koneksi Anda lalu coba lagi.";
const SERVER_ERROR = "Terjadi kesalahan di server. Coba lagi sebentar.";

export type ApiError = { message: string; fields: Record<string, string> };

/** Pesan error per field form; `form` = pesan umum di bawah form. */
export type FormErrors = Record<string, string | null | undefined>;

/** Ubah ApiError menjadi FormErrors: pesan umum hanya tampil jika tidak ada error per field. */
export function formErrors({ fields, message }: ApiError): FormErrors {
  return { ...fields, form: Object.keys(fields).length ? null : message };
}
export type ApiResult<T> =
  { ok: true; status: number; data: T } | { ok: false; status: number; error: ApiError };

/**
 * POST JSON. Hasil: { ok: true, data } atau { ok: false, status, error: { message, fields } }.
 * `fields` selalu objek (boleh kosong) agar aman di-spread ke state error form.
 * `T` = bentuk `data` yang dijanjikan route (tidak divalidasi ulang di sini).
 */
export async function postJson<T = unknown>(url: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response;
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
