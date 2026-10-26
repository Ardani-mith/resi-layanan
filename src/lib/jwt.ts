// Tanda tangan & verifikasi token sesi. Terpisah dari session.ts karena proxy.ts
// juga memakainya, dan proxy tidak boleh mengimpor modul "server-only"/cookies().
import { jwtVerify, SignJWT } from "jose";
import { isRole, type Role, SESSION_IDLE_SECONDS, SESSION_MAX_AGE_SECONDS } from "./roles.ts";

/** Isi sesi menurut token. Status akun terkini dicek session.ts ke DB. */
export interface SessionClaims {
  id: string;
  name: string;
  role: Role;
  ver: number;
  mustChangePassword: boolean;
  /** Waktu login (detik epoch): batas mutlak sesi dihitung dari sini, tidak ikut diperpanjang. */
  authAt: number;
}

export const SESSION_COOKIE = "session";
/** Umur cookie = batas mutlak; token di dalamnya kedaluwarsa lebih cepat bila petugas diam. */
export const SESSION_MAX_AGE = SESSION_MAX_AGE_SECONDS;

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET wajib diisi, minimal 32 karakter.");
  }
  return new TextEncoder().encode(secret);
}

/**
 * `ver` = User.sessionVersion saat login (dicocokkan ulang ke DB oleh session.ts).
 * `pwd` = masih memakai kata sandi sementara; dipakai proxy untuk redirect cepat.
 * `auth` = waktu login. Kedaluwarsa = 30 menit dari sekarang (batas diam), tapi tidak melewati
 * 12 jam sejak login (batas mutlak). Diperpanjang hanya lewat renewSession() saat ada aktivitas.
 */
export async function signSession({
  id,
  name,
  role,
  ver = 0,
  mustChangePassword = false,
  authAt = Math.floor(Date.now() / 1000),
}: {
  id: unknown;
  name: string;
  role: Role;
  ver?: number;
  mustChangePassword?: boolean;
  authAt?: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = Math.min(now + SESSION_IDLE_SECONDS, authAt + SESSION_MAX_AGE_SECONDS);
  return new SignJWT({ name, role, ver, auth: authAt, ...(mustChangePassword && { pwd: true }) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(id))
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secretKey());
}

/**
 * Payload sesi { id, name, role, ver, mustChangePassword } atau null jika token kosong/tidak
 * sah/kedaluwarsa. Hanya bukti token asli; status akun terkini dicek session.ts ke DB.
 */
export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || !isRole(payload.role)) return null;
    return {
      id: payload.sub,
      name: String(payload.name ?? ""),
      role: payload.role,
      ver: typeof payload.ver === "number" ? payload.ver : 0,
      mustChangePassword: payload.pwd === true,
      authAt: typeof payload.auth === "number" ? payload.auth : (payload.iat ?? 0),
    };
  } catch {
    return null;
  }
}
