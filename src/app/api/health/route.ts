import mongoose from "mongoose";
import { connection } from "next/server";
import { dbConnect } from "@/lib/db";

// Cek sebelum demo: buka /api/health di URL live, harus "db": "connected".
export async function GET() {
  await connection();
  try {
    await dbConnect();
    await mongoose.connection.db?.admin().ping();
    return Response.json({ status: "ok", db: "connected" });
  } catch (error) {
    console.error("[health]", error);
    return Response.json({ status: "error", db: "disconnected" }, { status: 503 });
  }
}
