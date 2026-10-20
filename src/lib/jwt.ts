// Tanda tangan & verifikasi token sesi. Terpisah dari session.ts karena proxy.ts
// juga memakainya, dan proxy tidak boleh mengimpor modul "server-only"/cookies().
import { jwtVerify, SignJWT } from "jose";
import { isRole, type Role } from "./roles.ts";

/** Isi sesi menurut token. Status akun terkini dicek session.ts ke DB. */
export interface SessionClaims {
  id: string;
  name: string;
  role: Role;
  ver: number;
  mustChangePassword: boolean;
}

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari, dalam detik

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
 */
export async function signSession({
  id,
  name,
  role,
  ver = 0,
  mustChangePassword = false,
}: {
  id: unknown;
  name: string;
  role: Role;
  ver?: number;
  mustChangePassword?: boolean;
}): Promise<string> {
  return new SignJWT({ name, role, ver, ...(mustChangePassword && { pwd: true }) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
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
    };
  } catch {
    return null;
  }
}
