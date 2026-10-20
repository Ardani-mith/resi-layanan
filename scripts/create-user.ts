// npm run user:create -- --email admin@contoh.go.id --name "Nama Admin" [--role admin] [--unit "Bidang PIAK"]
// npm run user:create -- --email admin@contoh.go.id --reset
//
// Membuat akun petugas (bawaan: admin) dengan kata sandi sementara yang wajib diganti saat
// login pertama. Dipakai untuk admin PERTAMA; akun berikutnya dibuat admin di /admin/petugas.
// --reset: jalur pemulihan bila admin lupa kata sandi (akun juga diaktifkan kembali).
// Membaca .env.local (MONGODB_URI).

import { parseArgs } from "node:util";
import mongoose from "mongoose";
import { dbConnect } from "../src/lib/db.ts";
import { ROLE_LABELS } from "../src/lib/roles.ts";
import { createStaff, generateTempPassword, hashPassword } from "../src/lib/users.ts";
import { staffCreateSchema } from "../src/lib/validators.ts";
import { User, type UserData } from "../src/models.ts";

const USAGE = `Pemakaian:
  npm run user:create -- --email <email> --name "<nama>" [--role admin] [--unit "<unit>"]
  npm run user:create -- --email <email> --reset
Peran: ${Object.keys(ROLE_LABELS).join(", ")}`;

async function resetByEmail(email: string) {
  const tempPassword = generateTempPassword();
  const user = await User.findOneAndUpdate(
    { email: email.trim().toLowerCase() },
    {
      $set: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true, isActive: true },
      $inc: { sessionVersion: 1 },
    },
    { returnDocument: "after" },
  ).lean<UserData>();
  if (!user) throw new Error(`Akun dengan email ${email} tidak ditemukan.`);
  return { account: user, tempPassword };
}

async function create(values: { email: string; name?: string; role?: string; unit?: string }) {
  const parsed = staffCreateSchema.safeParse({ ...values, role: values.role ?? "admin" });
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => `  --${i.path.join(".")}: ${i.message}`);
    throw new Error(`Isian tidak valid:\n${messages.join("\n")}`);
  }
  return createStaff(parsed.data);
}

let values!: { email?: string; name?: string; role?: string; unit?: string; reset: boolean };
try {
  ({ values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      role: { type: "string" },
      unit: { type: "string" },
      reset: { type: "boolean", default: false },
    },
  }));
  if (!values.email) throw new Error("--email wajib diisi.");
} catch (error) {
  console.error(`✗ ${(error as Error).message}\n\n${USAGE}`);
  process.exit(1);
}

try {
  await dbConnect();
  console.log(`Database "${mongoose.connection.name}" di ${mongoose.connection.host}`);
  const email = values.email!;
  const { account, tempPassword } = values.reset
    ? await resetByEmail(email)
    : await create({ ...values, email });
  console.log(
    `\n✓ ${values.reset ? "Kata sandi di-reset" : "Akun dibuat"}: ${account.name} (${ROLE_LABELS[account.role]})`,
  );
  console.log(`  Email                 : ${account.email}`);
  console.log(`  Kata sandi sementara  : ${tempPassword}`);
  console.log("\nKata sandi ini hanya ditampilkan sekali dan wajib diganti saat login pertama.");
} catch (error) {
  console.error("✗", (error as Error).message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
