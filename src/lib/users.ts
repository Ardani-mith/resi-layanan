// Akun petugas: kata sandi, login, validasi sesi terhadap DB, dan kelola akun oleh admin.
// Tidak ada pendaftaran publik: admin pertama dibuat lewat `npm run user:create`,
// akun berikutnya oleh admin di /admin/petugas dengan kata sandi sementara.

import bcrypt from "bcryptjs";
import mongoose, { type UpdateQuery } from "mongoose";
import { Service, User, type UserData } from "../models.ts";
import { type AdminActor, logAdminEvent } from "./admin.ts";
import { randomCode } from "./resi.ts";
import { type Role, ROLE_LABELS } from "./roles.ts";
import type { PasswordChangeInput, StaffCreateInput } from "./validators.ts";
import { AppError } from "./workflow.ts";

// --- Kata sandi ---------------------------------------------------------------------

// Hash tiruan agar waktu respons email-tidak-terdaftar ≈ kata-sandi-salah.
const DUMMY_HASH = "$2b$10$6ior4DJ.FZWSLJ0Fa25HmekHG9x5KIk7iKmfOuBg.up2lY/Cd2HGe";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** Selalu menjalankan bcrypt (juga saat `hash` kosong) supaya waktunya tidak membocorkan apa pun. */
function verifyPassword(password: string, hash: string | undefined): Promise<boolean> {
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

/** Pengguna yang sedang login (hasil sesi yang sudah dicocokkan ke DB). */
export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
}

export type StaffAccount = ReturnType<typeof toAccount>;

const notFound = () => new AppError(404, "Akun petugas tidak ditemukan.");

/** Sasaran di audit log admin: "Nama <email>". */
const label = (user: Pick<UserData, "name" | "email">) => `${user.name} <${user.email}>`;

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

/** Menahan tebak kata sandi: 5 kali salah beruntun → akun dikunci 15 menit. */
export const LOGIN_MAX_FAILS = 5;
export const LOGIN_LOCK_MS = 15 * 60_000;

const lockedError = (until: Date, now: Date) =>
  new AppError(
    429,
    `Terlalu banyak percobaan masuk yang gagal. Coba lagi dalam ${Math.ceil((until.getTime() - now.getTime()) / 60_000)} menit, atau minta admin me-reset kata sandi.`,
  );

/**
 * Akun aktif dengan email & kata sandi cocok (lengkap dengan sessionVersion), atau null.
 * Gagal ke-5 beruntun mengunci akun sementara (AppError 429); berhasil = hitungan kembali 0.
 */
export async function authenticate(
  email: string,
  password: string,
  now = new Date(),
): Promise<UserData | null> {
  const user = await User.findOne({ email, isActive: true })
    .select("+passwordHash +failedLogins +lockedUntil")
    .lean<UserData>();
  if (user?.lockedUntil && user.lockedUntil > now) throw lockedError(user.lockedUntil, now);
  // Tetap membandingkan hash walau email tidak terdaftar: waktu respons tidak membocorkan akun.
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user) return null;
  if (valid) {
    if (user.failedLogins || user.lockedUntil) {
      await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lockedUntil: null } });
    }
    return user;
  }
  // $inc atomik: percobaan paralel tetap terhitung semua.
  const after = await User.findOneAndUpdate(
    { _id: user._id },
    { $inc: { failedLogins: 1 } },
    { returnDocument: "after" },
  )
    .select("+failedLogins")
    .lean<UserData>();
  if ((after?.failedLogins ?? 0) >= LOGIN_MAX_FAILS) {
    const until = new Date(now.getTime() + LOGIN_LOCK_MS);
    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lockedUntil: until } });
    throw lockedError(until, now);
  }
  return null;
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
export async function createStaff({ name, email, role, unit }: StaffCreateInput, actor: AdminActor) {
  const emailTaken = { email: "Email ini sudah dipakai akun lain." };
  if (await User.exists({ email })) throw new AppError(409, "Email sudah terdaftar.", emailTaken);

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
    await logAdminEvent(actor, "account_created", label(user), { role });
    return { account: toAccount(user.toObject()), tempPassword };
  } catch (error) {
    // Dua admin mendaftarkan email yang sama bersamaan: indeks unik yang menolak.
    if ((error as { code?: number })?.code === 11000) {
      throw new AppError(409, "Email sudah terdaftar.", emailTaken);
    }
    throw error;
  }
}

async function loadOther(id: string, actor: AdminActor, selfMessage: string): Promise<UserData> {
  if (!mongoose.isValidObjectId(id)) throw notFound();
  if (id === actor.id) throw new AppError(409, selfMessage);
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
  actor: AdminActor,
) {
  const user = await loadOther(id, actor, "Akun Anda sendiri tidak bisa diubah dari halaman ini.");
  if (role !== user.role) await ensureRoleCovered(user, "mengganti peran");
  const update: UpdateQuery<UserData> = { $set: { name, role, unit: unit || null } };
  if (role !== user.role) update.$inc = { sessionVersion: 1 };
  const saved = await save(id, update);
  if (role !== user.role) {
    await logAdminEvent(actor, "account_role_changed", label(saved), { from: user.role, to: role });
  }
  if (name !== user.name || (unit || null) !== user.unit) {
    await logAdminEvent(actor, "account_updated", label(saved), { name, unit: unit || null });
  }
  return toAccount(saved);
}

/**
 * Tolak perubahan yang membuat suatu peran tanpa akun aktif padahal peran itu memegang tahap
 * di layanan aktif: permohonan akan macet di tahap tersebut tanpa ada yang bisa menindak.
 */
async function ensureRoleCovered(user: UserData, action: string) {
  if (!user.isActive) return;
  const needed =
    user.role === "petugas_loket" || (await Service.exists({ isActive: true, "steps.role": user.role }));
  if (!needed) return;
  const others = await User.countDocuments({ _id: { $ne: user._id }, role: user.role, isActive: true });
  if (others === 0) {
    throw new AppError(
      409,
      `Tidak bisa ${action}: ini satu-satunya akun aktif ${ROLE_LABELS[user.role]}, padahal peran ini memegang tahap layanan. Buat atau aktifkan akun pengganti dulu.`,
    );
  }
}

/** Nonaktifkan (bukan hapus: audit log tetap merujuk akun ini) atau aktifkan kembali. */
export async function setStaffActive(id: string, isActive: boolean, actor: AdminActor) {
  const user = await loadOther(id, actor, "Anda tidak bisa menonaktifkan akun sendiri.");
  if (!isActive) await ensureRoleCovered(user, "menonaktifkan akun");
  const saved = await save(id, { $set: { isActive }, $inc: { sessionVersion: 1 } });
  await logAdminEvent(actor, isActive ? "account_activated" : "account_deactivated", label(saved));
  return toAccount(saved);
}

/** Kata sandi sementara baru; semua sesi akun ini berakhir dan wajib ganti saat login. */
export async function resetStaffPassword(id: string, actor: AdminActor) {
  await loadOther(id, actor, "Untuk akun Anda sendiri, gunakan halaman ganti kata sandi.");
  const tempPassword = generateTempPassword();
  const user = await save(id, {
    // Reset oleh admin juga membuka kunci login (jalur pemulihan bila akun terkunci).
    $set: {
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      failedLogins: 0,
      lockedUntil: null,
    },
    $inc: { sessionVersion: 1 },
  });
  await logAdminEvent(actor, "account_password_reset", label(user));
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
    throw new AppError(422, "Periksa kembali isian Anda.", {
      currentPassword: "Kata sandi saat ini salah.",
    });
  }
  if (newPassword === currentPassword) {
    throw new AppError(422, "Periksa kembali isian Anda.", {
      newPassword: "Kata sandi baru harus berbeda dari yang sekarang.",
    });
  }
  const saved = await save(userId, {
    $set: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
    $inc: { sessionVersion: 1 },
  });
  await logAdminEvent({ id: userId, name: saved.name }, "account_password_changed", label(saved));
  return saved;
}
