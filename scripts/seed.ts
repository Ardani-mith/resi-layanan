// npm run seed         — HAPUS lalu isi ulang database dengan data demo lengkap.
// npm run seed:master  — hanya data master (3 layanan) TANPA menghapus apa pun: layanan
//                        dicocokkan lewat slug lalu diperbarui (upsert), aman diulang.
// Membaca .env.local (MONGODB_URI, DEMO_PASSWORD).

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { dbConnect } from "../src/lib/db.ts";
import { generateResi } from "../src/lib/resi.ts";
import { Application, Event, Service, Setting, User } from "../src/models.ts";
import { buildDemoApplications, HOLIDAYS, SERVICES, USERS } from "./demo-data.ts";

export async function seed({
  now = new Date(),
  password = process.env.DEMO_PASSWORD,
  log = console.log,
}: { now?: Date; password?: string; log?: (...args: unknown[]) => void } = {}) {
  if (!password || password.length < 8) {
    throw new Error("DEMO_PASSWORD wajib diisi di .env.local (minimal 8 karakter).");
  }

  // Lewat driver langsung: hook append-only di model Event sengaja tidak berlaku di sini.
  const models = [Application, Event, Service, Setting, User] as const;
  for (const model of models) await model.collection.deleteMany({});
  for (const model of models) await model.syncIndexes();

  await Setting.create({ key: "system", holidays: HOLIDAYS, clockOffsetMs: 0 });

  const passwordHash = await bcrypt.hash(password, 10);
  const users = await User.insertMany(USERS.map((u) => ({ ...u, passwordHash })));
  const services = (await Service.insertMany(SERVICES)).map((s) => s.toObject());

  const built = buildDemoApplications({ services, users, now, holidays: new Set(HOLIDAYS) });
  const used = new Set(built.map((b) => b.app.resi).filter(Boolean));
  for (const { app } of built) {
    while (!app.resi) {
      const resi = generateResi();
      if (!used.has(resi)) {
        used.add(resi);
        app.resi = resi;
      }
    }
  }

  // timestamps: false → createdAt/updatedAt hasil simulasi (mundur) tidak ditimpa waktu sekarang.
  const apps = await Application.insertMany(
    built.map((b) => b.app),
    { timestamps: false },
  );
  await Event.insertMany(
    built.flatMap(({ events }, i) => events.map((e) => ({ ...e, applicationId: apps[i]._id }))),
  );

  const byStatus = apps.reduce<Record<string, number>>(
    (acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }),
    {},
  );
  log(`✓ ${services.length} layanan, ${users.length} akun, ${apps.length} permohonan`, byStatus);
  return { users, services, apps };
}

export async function seedMaster({ log = console.log } = {}) {
  await Service.syncIndexes();
  const result = await Service.bulkWrite(
    SERVICES.map((service) => ({
      updateOne: { filter: { slug: service.slug }, update: { $set: service }, upsert: true },
    })),
  );
  log(`✓ ${SERVICES.length} layanan: ${result.upsertedCount} baru, ${result.modifiedCount} diperbarui`);
  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const master = process.argv.includes("--master");
  try {
    await dbConnect();
    const { name, host } = mongoose.connection;
    if (master) {
      console.log(`Mengisi data master ke database "${name}" di ${host} ...`);
      await seedMaster();
      for (const s of SERVICES) console.log(`  ${s.order}. ${s.name} (${s.steps.length} tahap)`);
    } else {
      console.log(`Mengisi ulang database "${name}" di ${host} ...`);
      await seed();
      console.log("\nAkun demo (kata sandi = DEMO_PASSWORD):");
      for (const u of USERS) console.log(`  ${u.role.padEnd(15)} ${u.email}`);
      console.log("\nResi demo: RL-HJ26-AKTA (terlambat, HP …1234), RL-HJ26-PRBK (perlu perbaikan, …5678),");
      console.log("           RL-HJ26-SLSE (selesai, …4321), RL-HJ26-TLAK (ditolak, …8765)");
    }
  } catch (error) {
    console.error(`✗ Seed ${master ? "data master " : ""}gagal:`, (error as Error).message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
