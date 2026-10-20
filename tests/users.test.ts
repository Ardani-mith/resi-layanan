// Akun petugas dengan MongoDB sungguhan (in-memory): kata sandi sementara, sesi yang
// dicabut saat akun berubah, dan pembatas agar admin tidak mengunci dirinya sendiri.
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dbConnect } from "@/lib/db";
import {
  AccountError,
  authenticate,
  changeOwnPassword,
  createStaff,
  generateTempPassword,
  hashPassword,
  loadSessionUser,
  resetStaffPassword,
  setStaffActive,
  updateStaff,
} from "@/lib/users";
import { passwordChangeSchema, staffCreateSchema } from "@/lib/validators";
import { User, type UserData } from "@/models";

let mongod: MongoMemoryServer;
let admin: { id: string; name: string; role: UserData["role"] };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri("resi-users-test");
  await dbConnect();
  await User.syncIndexes();
  const doc = await User.create({
    name: "Admin Uji",
    email: "admin@uji.test",
    role: "admin",
    passwordHash: await hashPassword("kata-sandi-admin"),
  });
  admin = { id: String(doc._id), name: doc.name, role: doc.role };
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

/** Payload sesi seperti yang ditulis createSession saat login. */
async function sessionOf(email: string) {
  const user = (await User.findOne({ email }).lean<UserData>())!;
  return { id: String(user._id), name: user.name, role: user.role, ver: user.sessionVersion };
}

async function expectAccountError(promise: Promise<unknown>, status: number) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AccountError);
  expect((error as AccountError).status).toBe(status);
  return error as AccountError;
}

let seq = 0;
const newStaff = (overrides = {}) =>
  createStaff({
    name: "Petugas Uji",
    email: `petugas${++seq}@uji.test`,
    role: "petugas_loket",
    ...overrides,
  });

describe("kata sandi sementara", () => {
  it("format mudah didiktekan, tanpa karakter mirip", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateTempPassword()).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    }
  });

  it("akun baru wajib ganti kata sandi dan bisa login dengan kata sandi sementara", async () => {
    const { account, tempPassword } = await newStaff();
    expect(account.mustChangePassword).toBe(true);
    const user = await authenticate(account.email, tempPassword);
    expect(user?.mustChangePassword).toBe(true);
    expect(await authenticate(account.email, "salah-sekali")).toBeNull();
  });

  it("email ganda ditolak dengan pesan di field email", async () => {
    const { account } = await newStaff();
    const error = await expectAccountError(newStaff({ email: account.email }), 409);
    expect(error.fields?.email).toBeTruthy();
  });
});

describe("sesi dicabut saat akun berubah", () => {
  it("ganti nama: sesi tetap berlaku, nama terbaru dari DB", async () => {
    const { account } = await newStaff();
    const session = await sessionOf(account.email);
    await updateStaff(account.id, { name: "Nama Baru", role: account.role, unit: "" }, admin);
    expect((await loadSessionUser(session))?.name).toBe("Nama Baru");
  });

  it("ganti peran: sesi lama tidak berlaku", async () => {
    const { account } = await newStaff();
    const session = await sessionOf(account.email);
    await updateStaff(account.id, { name: account.name, role: "petugas_teknis" }, admin);
    expect(await loadSessionUser(session)).toBeNull();
    expect((await loadSessionUser(await sessionOf(account.email)))?.role).toBe("petugas_teknis");
  });

  it("nonaktif: sesi berakhir & tidak bisa login; aktif kembali bisa login lagi", async () => {
    const { account, tempPassword } = await newStaff();
    const session = await sessionOf(account.email);
    await setStaffActive(account.id, false, admin);
    expect(await loadSessionUser(session)).toBeNull();
    expect(await authenticate(account.email, tempPassword)).toBeNull();

    await setStaffActive(account.id, true, admin);
    expect(await authenticate(account.email, tempPassword)).not.toBeNull();
  });

  it("reset kata sandi: kata sandi lama & sesi lama tidak berlaku", async () => {
    const { account, tempPassword } = await newStaff();
    const session = await sessionOf(account.email);
    const reset = await resetStaffPassword(account.id, admin);
    expect(reset.tempPassword).not.toBe(tempPassword);
    expect(await loadSessionUser(session)).toBeNull();
    expect(await authenticate(account.email, tempPassword)).toBeNull();
    expect(await authenticate(account.email, reset.tempPassword)).not.toBeNull();
  });

  it("id tidak valid atau tidak ada → 404; sesi dengan id rusak → null", async () => {
    await expectAccountError(setStaffActive("bukan-id", false, admin), 404);
    await expectAccountError(setStaffActive(String(new mongoose.Types.ObjectId()), false, admin), 404);
    expect(await loadSessionUser({ id: "bukan-id", ver: 0 })).toBeNull();
  });
  it("akun lama tanpa field sessionVersion tetap bisa login", async () => {
    const { account } = await newStaff();
    await User.collection.updateOne({ email: account.email }, { $unset: { sessionVersion: "" } });
    expect(await loadSessionUser({ id: account.id, ver: 0 })).not.toBeNull();
  });
});

describe("admin tidak bisa mengunci dirinya sendiri", () => {
  it("menolak menonaktifkan, mengubah, atau me-reset akun sendiri", async () => {
    await expectAccountError(setStaffActive(admin.id, false, admin), 409);
    await expectAccountError(updateStaff(admin.id, { name: "X Y Z", role: "petugas_loket" }, admin), 409);
    await expectAccountError(resetStaffPassword(admin.id, admin), 409);
    expect((await User.findById(admin.id).lean<UserData>())?.role).toBe("admin");
  });
});

describe("ganti kata sandi sendiri", () => {
  it("kata sandi saat ini salah atau sama → error di field yang tepat", async () => {
    const { account, tempPassword } = await newStaff();
    const wrong = await expectAccountError(
      changeOwnPassword(account.id, { currentPassword: "keliru", newPassword: "kata-sandi-baru-1" }),
      422,
    );
    expect(wrong.fields?.currentPassword).toBeTruthy();
    const same = await expectAccountError(
      changeOwnPassword(account.id, { currentPassword: tempPassword, newPassword: tempPassword }),
      422,
    );
    expect(same.fields?.newPassword).toBeTruthy();
  });

  it("berhasil: tidak wajib ganti lagi, sesi lain berakhir, kata sandi baru berlaku", async () => {
    const { account, tempPassword } = await newStaff();
    const session = await sessionOf(account.email);
    const updated = await changeOwnPassword(account.id, {
      currentPassword: tempPassword,
      newPassword: "frasa sandi baru",
    });
    expect(updated.mustChangePassword).toBe(false);
    expect(updated.sessionVersion).toBe(session.ver + 1);
    expect(await loadSessionUser(session)).toBeNull();
    expect(await authenticate(account.email, "frasa sandi baru")).not.toBeNull();
  });
});

describe("validasi isian", () => {
  it("konfirmasi kata sandi harus sama & minimal 10 karakter", () => {
    const short = passwordChangeSchema.safeParse({
      currentPassword: "x",
      newPassword: "pendek",
      confirmPassword: "pendek",
    });
    expect(short.success).toBe(false);
    const mismatch = passwordChangeSchema.safeParse({
      currentPassword: "x",
      newPassword: "cukup-panjang-1",
      confirmPassword: "cukup-panjang-2",
    });
    expect(mismatch.error?.issues[0].path).toEqual(["confirmPassword"]);
  });

  it("email dinormalisasi & peran harus dikenal", () => {
    const ok = staffCreateSchema.parse({
      name: "Budi Santoso",
      email: " Budi@Contoh.GO.ID ",
      role: "pimpinan",
    });
    expect(ok.email).toBe("budi@contoh.go.id");
    expect(staffCreateSchema.safeParse({ name: "Budi", email: "b@c.id", role: "superadmin" }).success).toBe(
      false,
    );
  });
});
