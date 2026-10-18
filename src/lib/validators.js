import { z } from "zod";
import { normalizePhone } from "./privacy.js";
import { normalizeResi, RESI_PATTERN } from "./resi-format.js";
import { ACTIONS } from "./workflow.js";

// Pesan bawaan Zod (yang tidak kita tulis sendiri) dalam bahasa Indonesia.
z.config(z.locales.id());

const trimmed = (max) => z.string().trim().max(max);

export const loginSchema = z.object({
  email: z.email("Format email tidak valid.").trim().toLowerCase(),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^08\d{8,11}$/, "Nomor HP tidak valid, contoh: 081234567890."));

export const resiSchema = z
  .string()
  .transform(normalizeResi)
  .pipe(z.string().regex(RESI_PATTERN, "Format resi: RL-XXXX-XXXX."));

export const applicationSchema = z.object({
  serviceSlug: z.string().trim().min(1, "Pilih layanan."),
  channel: z.enum(["online", "loket"]).default("online"),
  applicant: z.object({
    name: trimmed(100).min(3, "Nama minimal 3 huruf."),
    phone: phoneSchema,
    email: z.union([z.email("Format email tidak valid.").trim().toLowerCase(), z.literal("")]).optional(),
    nik: z.string().regex(/^\d{16}$/, "NIK harus 16 digit angka."),
  }),
  requirementsChecked: z.array(z.string().trim().max(200)).max(20).default([]),
});

export const actionSchema = z.object({
  action: z.enum(ACTIONS),
  publicNote: trimmed(500).optional(),
  internalNote: trimmed(1000).optional(),
});

export const last4Schema = z.string().regex(/^\d{4}$/, "Masukkan 4 digit terakhir nomor HP.");

export const trackActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify"), phoneLast4: last4Schema }),
  z.object({ action: z.literal("resubmit"), phoneLast4: last4Schema }),
  z.object({
    action: z.literal("rate"),
    phoneLast4: last4Schema,
    score: z.number({ error: "Pilih 1–5 bintang." }).int().min(1, "Pilih 1–5 bintang.").max(5, "Pilih 1–5 bintang."),
    comment: trimmed(500).optional(),
  }),
]);

export const advanceSchema = z.object({
  days: z.number().int().min(-30).max(30).default(1),
  reset: z.boolean().default(false),
});
