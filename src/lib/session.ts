import "server-only";
import { cookies } from "next/headers";
import type { UserData } from "../models.ts";
import { dbConnect } from "./db.ts";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./jwt.ts";
import { loadSessionUser, type SessionUser } from "./users.ts";

export async function createSession(
  user: Pick<UserData, "_id" | "name" | "role" | "sessionVersion" | "mustChangePassword">,
) {
  const token = await signSession({
    id: user._id,
    name: user.name,
    role: user.role,
    ver: user.sessionVersion,
    mustChangePassword: user.mustChangePassword,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions());
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
});

/**
 * Perpanjang batas diam sesi (dipanggil saat petugas berinteraksi). Waktu login tetap, jadi
 * batas mutlak 12 jam tidak ikut bergeser. null = sesi sudah tidak berlaku (diam terlalu lama,
 * lewat batas mutlak, atau akun berubah).
 */
export async function renewSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const claims = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  await dbConnect();
  const user = await loadSessionUser(claims);
  if (!user) return null;
  const token = await signSession({ ...claims, name: user.name, role: user.role });
  store.set(SESSION_COOKIE, token, cookieOptions());
  return user;
}

/**
 * Pengguna yang sedang login, atau null. Token saja tidak cukup: akun dicek ulang ke DB,
 * jadi akun yang dinonaktifkan, diganti perannya, atau di-reset kata sandinya langsung
 * kehilangan akses.
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  await dbConnect();
  return loadSessionUser(session);
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
