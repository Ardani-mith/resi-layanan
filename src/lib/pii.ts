// Perlindungan NIK (UU PDP: minimisasi & keamanan data pribadi). NIK asli tidak pernah disimpan
// apa adanya di database:
// - nikHash   HMAC-SHA256 berkunci → pencarian (permohonan ganda, batas harian, lupa resi, OTP);
//             tidak bisa dibalik, dan tanpa kunci tidak bisa ditebak dari daftar NIK.
// - nikEnc    AES-256-GCM → untuk kebutuhan resmi (mis. integrasi SIAK) lewat decryptNik().
// - nikMasked kode wilayah + 4 digit terakhir → tampilan petugas, tanpa perlu mendekripsi.
// Kunci diturunkan (HKDF) dari PII_SECRET, atau SESSION_SECRET bila tidak diisi. Mengganti
// rahasia itu membuat NIK lama tidak bisa dicari/didekripsi: perlakukan sebagai kunci permanen.

import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";
import { maskNik } from "./present.ts";

const keys = new Map<string, Buffer>();

function key(purpose: "nik-hash" | "nik-enc"): Buffer {
  const cached = keys.get(purpose);
  if (cached) return cached;
  const secret = process.env.PII_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("PII_SECRET atau SESSION_SECRET wajib diisi, minimal 32 karakter.");
  const derived = Buffer.from(hkdfSync("sha256", secret, "pantas-pii-v1", purpose, 32));
  keys.set(purpose, derived);
  return derived;
}

export function hashNik(nik: string): string {
  return createHmac("sha256", key("nik-hash")).update(nik).digest("hex");
}

/** "v1.<iv>.<tag>.<ciphertext>" (base64url). */
export function encryptNik(nik: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("nik-enc"), iv);
  const data = Buffer.concat([cipher.update(nik, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

export function decryptNik(token: string): string {
  const [version, iv, tag, data] = token.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Format NIK terenkripsi tidak dikenal.");
  const decipher = createDecipheriv("aes-256-gcm", key("nik-enc"), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/** Bentuk NIK yang disimpan di permohonan. */
export function protectNik(nik: string) {
  return { nikHash: hashNik(nik), nikEnc: encryptNik(nik), nikMasked: maskNik(nik) };
}
