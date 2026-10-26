// Server untuk `npm run test:e2e` (dijalankan oleh Playwright lewat webServer).
// MongoDB in-memory + data seed segar + build di .next-e2e: tidak menyentuh Atlas
// (.env.local) maupun .next milik server dev.

import { type ChildProcess, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { E2E_PASSWORD, E2E_PORT } from "../e2e/helpers.ts";
import { dbConnect } from "../src/lib/db.ts";
import { seed } from "./seed.ts";

const mongo = await MongoMemoryServer.create();
const env = {
  ...process.env,
  // Variabel yang sudah ada di process.env tidak ditimpa .env.local oleh Next.
  MONGODB_URI: mongo.getUri("resi-e2e"),
  SESSION_SECRET: randomBytes(48).toString("base64"),
  NEXT_DIST_DIR: ".next-e2e",
};

process.env.MONGODB_URI = env.MONGODB_URI;
// Seed & server wajib memakai rahasia yang sama: hash NIK (lib/pii.ts) dibuat saat seed
// dan dicocokkan server (mis. lupa resi).
process.env.SESSION_SECRET = env.SESSION_SECRET;
await dbConnect();
await seed({ password: E2E_PASSWORD, log: () => {} });
await mongoose.disconnect();

const next = (args: string[]) =>
  spawn(process.execPath, ["node_modules/next/dist/bin/next", ...args], { env, stdio: "inherit" });

let child: ChildProcess | undefined;
async function shutdown(code = 0) {
  child?.kill("SIGTERM");
  await mongo.stop();
  process.exit(code);
}
process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());

child = next(["build"]);
child.on("exit", (code) => {
  if (code !== 0) return shutdown(code ?? 1);
  child = next(["start", "-p", String(E2E_PORT)]);
  child.on("exit", (startCode) => shutdown(startCode ?? 0));
});
