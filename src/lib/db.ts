import dns from "node:dns";
import mongoose from "mongoose";

// Koneksi di-cache di globalThis: di serverless (Vercel) dan saat hot reload dev,
// modul bisa dievaluasi ulang, tapi koneksi tidak boleh dibuka berkali-kali.
const cached = globalThis.__mongoose ?? (globalThis.__mongoose = { conn: null, promise: null });

const OPTIONS = { bufferCommands: false, serverSelectionTimeoutMS: 8000 };
const PUBLIC_DNS = ["1.1.1.1", "8.8.8.8"];

/**
 * URI mongodb+srv:// butuh query DNS SRV. Sebagian DNS jaringan (hotspot HP, sebagian
 * DNS ISP) gagal menjawabnya (querySrv EBADRESP/ESERVFAIL/ETIMEOUT), padahal Atlas
 * baik-baik saja. Jika itu terjadi, coba sekali lagi lewat DNS publik. setServers
 * hanya memengaruhi dns.resolve* (dipakai driver untuk SRV/TXT), bukan lookup biasa.
 */
async function connect(uri) {
  try {
    return await mongoose.connect(uri, OPTIONS);
  } catch (error) {
    const srvFailed = uri.startsWith("mongodb+srv://") && error?.syscall === "querySrv";
    if (!srvFailed) throw error;
    console.warn(`[db] DNS jaringan gagal menjawab SRV Atlas (${error.code}); mencoba DNS publik.`);
    dns.setServers(PUBLIC_DNS);
    return mongoose.connect(uri, OPTIONS);
  }
}

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI belum diisi. Salin .env.example ke .env.local.");

  cached.promise ??= connect(uri);
  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
  return cached.conn;
}
