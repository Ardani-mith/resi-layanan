import { z } from "zod";
import { BLOOD_TYPES, MARITAL_STATUSES, normalizePhone, RELIGIONS } from "./present.ts";
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

/** Teks KTP: dipangkas & huruf kapital, seperti tercetak di kartu. */
const ktpText = (max: number, message: string) =>
  trimmed(max)
    .min(2, message)
    .transform((s) => s.toUpperCase());

/** Isi KTP-el. Tanggal lahir & jenis kelamin tidak diminta: dibaca dari NIK di server. */
export const ktpSchema = z.object({
  birthPlace: ktpText(60, "Isi tempat lahir."),
  bloodType: z.enum(BLOOD_TYPES, { error: "Pilih golongan darah." }),
  address: ktpText(120, "Isi alamat."),
  rtRw: z
    .string()
    .trim()
    .regex(/^\d{1,3}\/\d{1,3}$/, "Format RT/RW, mis. 003/005.")
    .transform((s) =>
      s
        .split("/")
        .map((n) => n.padStart(3, "0"))
        .join("/"),
    ),
  village: ktpText(60, "Isi kelurahan/desa."),
  district: ktpText(60, "Isi kecamatan."),
  religion: z.enum(RELIGIONS, { error: "Pilih agama/kepercayaan." }),
  marital: z.enum(MARITAL_STATUSES, { error: "Pilih status perkawinan." }),
  job: ktpText(60, "Isi pekerjaan."),
});

export const applicationSchema = z.object({
  serviceSlug: z.string().trim().min(1, "Pilih layanan."),
  channel: z.enum(["online", "loket"]).default("online"),
  applicant: z.object({
    name: trimmed(100).min(3, "Nama minimal 3 huruf."),
    phone: phoneSchema,
    email: z.union([z.literal(""), emailSchema]).optional(),
    nik: z.string().regex(/^\d{16}$/, "NIK harus 16 digit angka."),
    ktp: ktpSchema.optional(),
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
  /** Hari kerja yang ditambahkan ke jam sistem. */
  days: z.number().int().min(1).max(30).default(1),
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

// --- Layanan & hari libur (admin) ---------------------------------------------------

const stepInputSchema = z.object({
  name: trimmed(80).min(3, "Nama tahap minimal 3 huruf."),
  role: z.enum(ROLES, { error: "Pilih peran." }),
  // null = tanpa tenggat (mis. menunggu warga mengambil dokumen).
  slaDays: z.number().int("Hari kerja harus bilangan bulat.").min(1).max(60).nullable(),
});

export const serviceSchema = z.object({
  name: trimmed(100).min(3, "Nama layanan minimal 3 huruf."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Hanya huruf kecil, angka, dan tanda hubung, mis. akta-kelahiran."),
  description: trimmed(600).default(""),
  output: trimmed(120).default(""),
  requirements: z.array(trimmed(200).min(1)).max(20, "Maksimal 20 persyaratan."),
  steps: z.array(stepInputSchema).min(2, "Layanan minimal punya 2 tahap.").max(12, "Maksimal 12 tahap."),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).max(999).default(0),
});

export const holidaysSchema = z.object({
  holidays: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD."))
    .max(200, "Maksimal 200 tanggal."),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type ActionInput = z.infer<typeof actionSchema>;
export type TrackActionInput = z.infer<typeof trackActionSchema>;
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type StaffActionInput = z.infer<typeof staffActionSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type HolidaysInput = z.infer<typeof holidaysSchema>;
