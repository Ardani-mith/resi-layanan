import mongoose from "mongoose";

// Koneksi di-cache di globalThis: di serverless (Vercel) dan saat hot reload dev,
// modul bisa dievaluasi ulang, tapi koneksi tidak boleh dibuka berkali-kali.
const cached = globalThis.__mongoose ?? (globalThis.__mongoose = { conn: null, promise: null });

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI belum diisi. Salin .env.example ke .env.local.");

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 8000 })
      .then((m) => m);
  }
  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
  return cached.conn;
}
