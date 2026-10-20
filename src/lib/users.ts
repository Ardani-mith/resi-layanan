// Akun petugas: kata sandi, login, validasi sesi terhadap DB, dan kelola akun oleh admin.
// Tidak ada pendaftaran publik: admin pertama dibuat lewat `npm run user:create`,
// akun berikutnya oleh admin di /admin/petugas dengan kata sandi sementara.

import bcrypt from "bcryptjs";
import mongoose, { type UpdateQuery } from "mongoose";
import { User, type UserData } from "../models.ts";
import { randomCode } from "./resi.ts";
import type { Role } from "./roles.ts";
import type { PasswordChangeInput, StaffCreateInput } from "./validators.ts";

// --- Kata sandi ---------------------------------------------------------------------

// Hash tiruan agar waktu respons email-tidak-terdaftar ≈ kata-sandi-salah.
const DUMMY_HASH = "$2b$10$6ior4DJ.FZWSLJ0Fa25HmekHG9x5KIk7iKmfOuBg.up2lY/Cd2HGe";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** Selalu menjalankan bcrypt (juga saat `hash` kosong) supaya waktunya tidak membocorkan apa pun. */
export function verifyPassword(password: string, hash: string | undefined): Promise<boolean> {
  return bcrypt.compare(password, hash ?? DUMMY_HASH);
}

/**
 * Kata sandi sementara (CSPRNG), mis. "K7QM-2XPA-9DHT": 12 karakter tanpa huruf/angka
 * yang mirip (0/O, 1/I), mudah didiktekan ke petugas. 60 bit, cukup untuk sekali pakai.
 */
export function generateTempPassword(): string {
  return `${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`;
}

// --- Akun ---------------------------------------------------------------------------

/** Error yang aman ditampilkan ke pengguna; route() mengubahnya menjadi respons `status`. */
export class AccountError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/** Pengguna yang sedang login (hasil sesi yang sudah dicocokkan ke DB). */
export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
}

export type StaffAccount = ReturnType<typeof toAccount>;

const notFound = () => new AccountError(404, "Akun petugas tidak ditemukan.");

const toAccount = (user: UserData) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  unit: user.unit,
  isActive: user.isActive,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt,
});

/** Akun aktif dengan email & kata sandi cocok (lengkap dengan sessionVersion), atau null. */
export async function authenticate(email: string, password: string): Promise<UserData | null> {
  const user = await User.findOne({ email, isActive: true }).select("+passwordHash").lean<UserData>();
  const valid = await verifyPassword(password, user?.passwordHash);
  return user && valid ? user : null;
}

/**
 * Cocokkan payload sesi (JWT) dengan akun terkini. null jika akun sudah dihapus,
 * dinonaktifkan, atau sessionVersion berubah (peran diganti, kata sandi di-reset).
 * Nama & peran diambil dari DB, bukan dari token.
 */
export async function loadSessionUser(
  session: { id: string; ver: number } | null,
): Promise<SessionUser | null> {
  if (!session || !mongoose.isValidObjectId(session.id)) return null;
  const user = await User.findById(session.id)
    .select("name role isActive sessionVersion mustChangePassword")
    .lean<UserData>();
  // ?? 0: akun lama (dibuat sebelum field ini ada) belum punya sessionVersion di DB.
  if (!user?.isActive || (user.sessionVersion ?? 0) !== session.ver) return null;
  return {
    id: String(user._id),
    name: user.name,
    role: user.role,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

export async function listStaff(): Promise<StaffAccount[]> {
  const users = await User.find().sort({ isActive: -1, role: 1, name: 1 }).lean<UserData[]>();
  return users.map(toAccount);
}

/** Buat akun dengan kata sandi sementara. `tempPassword` hanya dikembalikan sekali ini. */
export async function createStaff({ name, email, role, unit }: StaffCreateInput) {
  const emailTaken = { email: "Email ini sudah dipakai akun lain." };
  if (await User.exists({ email })) throw new AccountError(409, "Email sudah terdaftar.", emailTaken);

  const tempPassword = generateTempPassword();
  try {
    const user = await User.create({
      name,
      email,
      role,
      unit: unit || null,
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
    });
    return { account: toAccount(user.toObject()), tempPassword };
  } catch (error) {
    // Dua admin mendaftarkan email yang sama bersamaan: indeks unik yang menolak.
    if ((error as { code?: number })?.code === 11000) {
      throw new AccountError(409, "Email sudah terdaftar.", emailTaken);
    }
    throw error;
  }
}

async function loadOther(id: string, actor: { id: string }, selfMessage: string): Promise<UserData> {
  if (!mongoose.isValidObjectId(id)) throw notFound();
  if (id === actor.id) throw new AccountError(409, selfMessage);
  const user = await User.findById(id).lean<UserData>();
  if (!user) throw notFound();
  return user;
}

async function save(id: string, update: UpdateQuery<UserData>): Promise<UserData> {
  const user = await User.findByIdAndUpdate(id, update, {
    returnDocument: "after",
    runValidators: true,
  }).lean<UserData>();
  if (!user) throw notFound();
  return user;
}

/**
 * Ubah nama, peran, dan unit. Admin tidak bisa mengubah akunnya sendiri di sini, jadi
 * selalu tersisa minimal satu admin aktif (dirinya). Ganti peran = sesi lama berakhir.
 */
export async function updateStaff(
  id: string,
  { name, role, unit }: { name: string; role: Role; unit?: string },
  actor: { id: string },
) {
  const user = await loadOther(id, actor, "Akun Anda sendiri tidak bisa diubah dari halaman ini.");
  const update: UpdateQuery<UserData> = { $set: { name, role, unit: unit || null } };
  if (role !== user.role) update.$inc = { sessionVersion: 1 };
  return toAccount(await save(id, update));
}

/** Nonaktifkan (bukan hapus: audit log tetap merujuk akun ini) atau aktifkan kembali. */
export async function setStaffActive(id: string, isActive: boolean, actor: { id: string }) {
  await loadOther(id, actor, "Anda tidak bisa menonaktifkan akun sendiri.");
  return toAccount(await save(id, { $set: { isActive }, $inc: { sessionVersion: 1 } }));
}

/** Kata sandi sementara baru; semua sesi akun ini berakhir dan wajib ganti saat login. */
export async function resetStaffPassword(id: string, actor: { id: string }) {
  await loadOther(id, actor, "Untuk akun Anda sendiri, gunakan halaman ganti kata sandi.");
  const tempPassword = generateTempPassword();
  const user = await save(id, {
    $set: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true },
    $inc: { sessionVersion: 1 },
  });
  return { account: toAccount(user), tempPassword };
}

/**
 * Pengguna mengganti kata sandinya sendiri. Sesi di perangkat lain berakhir; kembalikan
 * akun terbaru agar pemanggil bisa menerbitkan sesi baru untuk perangkat ini.
 */
export async function changeOwnPassword(
  userId: string,
  { currentPassword, newPassword }: Pick<PasswordChangeInput, "currentPassword" | "newPassword">,
): Promise<UserData> {
  const user = await User.findById(userId).select("+passwordHash").lean<UserData>();
  if (!user?.isActive) throw notFound();
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AccountError(422, "Periksa kembali isian Anda.", {
      currentPassword: "Kata sandi saat ini salah.",
    });
  }
  if (newPassword === currentPassword) {
    throw new AccountError(422, "Periksa kembali isian Anda.", {
      newPassword: "Kata sandi baru harus berbeda dari yang sekarang.",
    });
  }
  return save(userId, {
    $set: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
    $inc: { sessionVersion: 1 },
  });
}
