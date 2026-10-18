// Tanda tangan & verifikasi token sesi. Terpisah dari session.js karena proxy.js
// juga memakainya, dan proxy tidak boleh mengimpor modul "server-only"/cookies().
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari, dalam detik

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET wajib diisi, minimal 32 karakter.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession({ id, name, role }) {
  return new SignJWT({ name, role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

/** Payload sesi { id, name, role } atau null jika token kosong/tidak sah/kedaluwarsa. */
export async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return { id: payload.sub, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}
