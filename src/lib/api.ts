import "server-only";
import type { NextRequest } from "next/server";
import { connection } from "next/server";
import type { z } from "zod";
import { dbConnect } from "./db.ts";
import type { Role } from "./roles.ts";
import { getSession } from "./session.ts";
import { AccountError, type SessionUser } from "./users.ts";
import { WorkflowError } from "./workflow.ts";

// Format respons seragam: sukses → { data }, gagal → { error: { message } }
// atau { error: { fields: { "applicant.phone": "..." } } } untuk validasi form.

export function ok(data: unknown, status = 200): Response {
  return Response.json({ data }, { status });
}

export function fail(status: number, message: string, fields?: Record<string, string>): Response {
  return Response.json({ error: fields ? { message, fields } : { message } }, { status });
}

/** Ubah ZodError menjadi { "path.ke.field": "pesan pertama" }. */
export function zodErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: Response };

/** Validasi body JSON dengan skema Zod. Mengembalikan { data } atau { error: Response }. */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<Result<z.output<S>>> {
  let body: unknown;
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

type UserResult = { user: SessionUser; error?: undefined } | { user?: undefined; error: Response };

/**
 * Pastikan ada sesi (dan perannya termasuk `roles` bila diberikan).
 * Akun yang masih memakai kata sandi sementara hanya boleh memanggil route yang
 * memberi `allowTempPassword` (ganti kata sandi). Mengembalikan { user } atau { error: Response }.
 */
export async function requireUser(
  roles?: readonly Role[] | null,
  { allowTempPassword = false } = {},
): Promise<UserResult> {
  const user = await getSession();
  if (!user) return { error: fail(401, "Silakan masuk terlebih dahulu.") };
  if (user.mustChangePassword && !allowTempPassword) {
    return { error: fail(403, "Ganti kata sandi sementara Anda terlebih dahulu.") };
  }
  if (roles && !roles.includes(user.role)) {
    return { error: fail(403, "Peran Anda tidak memiliki akses ke fitur ini.") };
  }
  return { user };
}

const WORKFLOW_STATUS: Record<string, number> = {
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
export function route<Ctx>(handler: (request: NextRequest, context: Ctx) => Promise<Response>) {
  return async (request: NextRequest, context: Ctx): Promise<Response> => {
    await connection();
    try {
      await dbConnect();
      return await handler(request, context);
    } catch (error) {
      if (error instanceof AccountError) return fail(error.status, error.message, error.fields);
      if (error instanceof WorkflowError) {
        return fail(WORKFLOW_STATUS[error.code] ?? 422, error.message);
      }
      if ((error as Error)?.name === "VersionError") {
        return fail(409, "Permohonan ini baru saja diubah petugas lain. Muat ulang halaman.");
      }
      console.error(`[api] ${request.method} ${request.url}`, error);
      return fail(500, "Terjadi kesalahan di server. Coba lagi sebentar.");
    }
  };
}

/** Konteks route/halaman dinamis, mis. ParamsOf<{ resi: string }> untuk /api/track/[resi]. */
export type ParamsOf<P> = { params: Promise<P> };

/** Props halaman yang membaca query string. */
export type SearchParamsOf = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Nilai pertama query string (?a=1&a=2 → "1"). */
export const firstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;
