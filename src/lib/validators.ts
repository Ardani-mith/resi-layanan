import { z } from "zod";
import { normalizePhone } from "./present.ts";
import { normalizeResi, RESI_PATTERN } from "./resi.ts";
import { PASSWORD_MIN, ROLES } from "./roles.ts";
import { ACTIONS } from "./workflow.ts";

// Pesan bawaan Zod (yang tidak kita tulis sendiri) dalam bahasa Indonesia.
z.config(z.locales.id());

const trimmed = (max: number) => z.string().trim().max(max);

// Pangkas & huruf kecil DULU, baru cek format: di Zod 4, z.email().trim() memvalidasi
// sebelum memangkas, sehingga " budi@contoh.id" (spasi dari salin-tempel) ditolak.
const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Format email tidak valid."));

export const loginSchema = z.object({
  email: emailSchema,
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
    email: z.union([z.literal(""), emailSchema]).optional(),
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
    score: z
      .number({ error: "Pilih 1–5 bintang." })
      .int()
      .min(1, "Pilih 1–5 bintang.")
      .max(5, "Pilih 1–5 bintang."),
    comment: trimmed(500).optional(),
  }),
]);

export const advanceSchema = z.object({
  days: z.number().int().min(-30).max(30).default(1),
  reset: z.boolean().default(false),
});

// --- Akun petugas ----------------------------------------------------------------

const staffFields = {
  name: trimmed(100).min(3, "Nama minimal 3 huruf."),
  role: z.enum(ROLES, { error: "Pilih peran." }),
  unit: trimmed(100).optional(),
};

export const staffCreateSchema = z.object({
  ...staffFields,
  email: emailSchema,
});

export const staffActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), ...staffFields }),
  z.object({ action: z.literal("set_active"), isActive: z.boolean() }),
  z.object({ action: z.literal("reset_password") }),
]);

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Masukkan kata sandi saat ini."),
    newPassword: z
      .string()
      .min(PASSWORD_MIN, `Kata sandi baru minimal ${PASSWORD_MIN} karakter.`)
      .max(128, "Kata sandi baru maksimal 128 karakter."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi tidak sama dengan kata sandi baru.",
  });

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type ActionInput = z.infer<typeof actionSchema>;
export type TrackActionInput = z.infer<typeof trackActionSchema>;
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type StaffActionInput = z.infer<typeof staffActionSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
