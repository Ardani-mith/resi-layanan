import "server-only";
import { connection } from "next/server";
import { dbConnect } from "./db.js";
import { getSession } from "./session.js";
import { WorkflowError } from "./workflow.js";

// Format respons seragam: sukses → { data }, gagal → { error: { message } }
// atau { error: { fields: { "applicant.phone": "..." } } } untuk validasi form.

export function ok(data, status = 200) {
  return Response.json({ data }, { status });
}

export function fail(status, message, fields) {
  return Response.json({ error: fields ? { message, fields } : { message } }, { status });
}

/** Ubah ZodError menjadi { "path.ke.field": "pesan pertama" }. */
export function zodErrors(error) {
  const fields = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/** Validasi body JSON dengan skema Zod. Mengembalikan { data } atau { error: Response }. */
export async function parseBody(request, schema) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { error: fail(400, "Body permintaan harus berupa JSON.") };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: fail(422, "Periksa kembali isian Anda.", zodErrors(result.error)) };
  }
  return { data: result.data };
}

/**
 * Pastikan ada sesi (dan perannya termasuk `roles` bila diberikan).
 * Mengembalikan { user } atau { error: Response }.
 */
export async function requireUser(roles) {
  const user = await getSession();
  if (!user) return { error: fail(401, "Silakan masuk terlebih dahulu.") };
  if (roles && !roles.includes(user.role)) {
    return { error: fail(403, "Peran Anda tidak memiliki akses ke fitur ini.") };
  }
  return { user };
}

const WORKFLOW_STATUS = {
  not_found: 404,
  forbidden: 403,
  invalid_state: 409,
  already_rated: 409,
  unknown_action: 400,
};

/**
 * Bungkus handler: tandai sebagai request-time (Cache Components tidak boleh
 * mem-prerender GET yang membaca DB saat build), sambungkan DB, ubah WorkflowError
 * menjadi 4xx, dan error tak terduga menjadi 500 tanpa membocorkan detail internal.
 */
export function route(handler) {
  return async (request, context) => {
    await connection();
    try {
      await dbConnect();
      return await handler(request, context);
    } catch (error) {
      if (error instanceof WorkflowError) {
        return fail(WORKFLOW_STATUS[error.code] ?? 422, error.message);
      }
      if (error?.name === "VersionError") {
        return fail(409, "Permohonan ini baru saja diubah petugas lain. Muat ulang halaman.");
      }
      console.error(`[api] ${request.method} ${request.url}`, error);
      return fail(500, "Terjadi kesalahan di server. Coba lagi sebentar.");
    }
  };
}
