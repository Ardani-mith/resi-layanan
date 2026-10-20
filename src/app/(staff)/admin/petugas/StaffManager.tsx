"use client";

// Kelola akun petugas: form tambah, baris akun (ubah, reset kata sandi, nonaktifkan),
// dan tampilan kata sandi sementara yang hanya muncul sekali.

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";
import { Alert, buttonClass, type ButtonVariant, Field } from "@/components/ui";
import { cn } from "@/lib/cn";
import { type FormErrors, formErrors, postJson } from "@/lib/http";
import { ROLE_LABELS, ROLES } from "@/lib/roles";
import type { StaffAccount } from "@/lib/users";

type TempResult = { account: StaffAccount; tempPassword: string };

/** Isian nama, peran, unit: dipakai form tambah & ubah petugas. */
function StaffFields({ errors, defaults = {} }: { errors: FormErrors; defaults?: Partial<StaffAccount> }) {
  return (
    <>
      <Field label="Nama lengkap" name="name" required defaultValue={defaults.name} error={errors.name} />
      <Field
        as="select"
        label="Peran"
        name="role"
        required
        defaultValue={defaults.role ?? ""}
        error={errors.role}
      >
        <option value="" disabled>
          Pilih peran
        </option>
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </Field>
      <Field
        label="Unit kerja"
        name="unit"
        defaultValue={defaults.unit ?? ""}
        hint="Opsional, mis. Loket Pelayanan."
        error={errors.unit}
      />
    </>
  );
}

/** Ambil isian StaffFields dari FormData. */
function readStaffFields(form: FormData) {
  return { name: form.get("name"), role: form.get("role"), unit: form.get("unit") };
}

/** Kata sandi sementara yang baru dibuat. Hanya tampil sekali: tidak disimpan dalam bentuk asli. */
function TempPassword({
  account,
  password,
  onClose,
}: {
  account: Pick<StaffAccount, "name" | "email">;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      // Clipboard diblokir browser: teks tetap bisa diseleksi (select-all) lalu disalin manual.
    }
  }

  return (
    <div role="status" className="rounded-xl border border-ok bg-ok-soft p-4 text-sm">
      <p className="font-semibold text-ok">Kata sandi sementara untuk {account.name}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded-lg bg-surface px-3 py-1.5 font-mono text-lg font-bold tracking-wider select-all">
          {password}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-ok hover:bg-surface"
        >
          {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
          {copied ? "Tersalin" : "Salin"}
        </button>
      </div>
      <p className="mt-2 text-text">
        Serahkan langsung ke petugas bersama email <span className="font-mono">{account.email}</span>. Kata
        sandi ini <strong>hanya ditampilkan sekali</strong> dan wajib diganti saat login pertama.
      </p>
      {onClose && (
        <button type="button" onClick={onClose} className="mt-2 font-semibold text-ok hover:underline">
          Sudah saya catat
        </button>
      )}
    </div>
  );
}

export function StaffCreateForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<TempResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setPending(true);
    setErrors({});
    setCreated(null);

    const res = await postJson<TempResult>("/api/admin/staff", {
      ...readStaffFields(form),
      email: form.get("email"),
    });
    setPending(false);
    if (!res.ok) {
      setErrors(formErrors(res.error));
      return;
    }
    formEl.reset();
    setCreated(res.data);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form method="post" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <StaffFields errors={errors} />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="off"
          required
          hint="Dipakai untuk login."
          error={errors.email}
        />
        <div className="space-y-3 sm:col-span-2">
          <Alert>{errors.form}</Alert>
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Menyimpan…" : "Tambah petugas"}
          </button>
        </div>
      </form>
      {created && (
        <TempPassword
          account={created.account}
          password={created.tempPassword}
          onClose={() => setCreated(null)}
        />
      )}
    </div>
  );
}

function Badge({ tone, children }: { tone: "ok" | "warn" | "muted"; children: ReactNode }) {
  const tones = {
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    muted: "bg-surface-2 text-muted",
  };
  return <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

const small = (variant: ButtonVariant) => buttonClass(variant, "min-h-9 px-3");

/** Satu akun di daftar petugas: info, ubah data, reset kata sandi, nonaktifkan. */
export function StaffRow({ account, isSelf }: { account: StaffAccount; isSelf: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function send(key: string, body: Record<string, unknown>) {
    setPending(key);
    setErrors({});
    const res = await postJson<Partial<TempResult>>(`/api/admin/staff/${account.id}`, body);
    setPending(null);
    if (!res.ok) {
      setErrors(formErrors(res.error));
      return null;
    }
    router.refresh();
    return res.data;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = await send("update", {
      action: "update",
      ...readStaffFields(new FormData(event.currentTarget)),
    });
    if (data) setEditing(false);
  }

  async function resetPassword() {
    if (!window.confirm(`Buat kata sandi sementara baru untuk ${account.name}? Sesi lamanya akan berakhir.`))
      return;
    const data = await send("reset", { action: "reset_password" });
    if (data?.tempPassword) setTempPassword(data.tempPassword);
  }

  async function toggleActive() {
    const next = !account.isActive;
    if (
      !next &&
      !window.confirm(`Nonaktifkan akun ${account.name}? Petugas ini langsung keluar dan tidak bisa login.`)
    ) {
      return;
    }
    await send("active", { action: "set_active", isActive: next });
  }

  return (
    <li className={cn("space-y-3 px-5 py-4", !account.isActive && "bg-surface-2/60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {account.name}
            {isSelf && <Badge tone="muted">Anda</Badge>}
            {!account.isActive && <Badge tone="muted">Nonaktif</Badge>}
            {account.isActive && account.mustChangePassword && <Badge tone="warn">Belum ganti sandi</Badge>}
          </p>
          <p className="truncate font-mono text-sm text-muted">{account.email}</p>
          <p className="text-sm">
            {ROLE_LABELS[account.role]}
            {account.unit && <span className="text-muted"> · {account.unit}</span>}
          </p>
        </div>
        {!isSelf && !editing && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditing(true)} className={small("secondary")}>
              Ubah
            </button>
            {account.isActive && (
              <button
                type="button"
                disabled={pending !== null}
                onClick={resetPassword}
                className={small("secondary")}
              >
                {pending === "reset" ? "Membuat…" : "Reset kata sandi"}
              </button>
            )}
            <button
              type="button"
              disabled={pending !== null}
              onClick={toggleActive}
              className={small(account.isActive ? "ghost" : "secondary")}
            >
              {pending === "active" ? "Menyimpan…" : account.isActive ? "Nonaktifkan" : "Aktifkan kembali"}
            </button>
          </div>
        )}
      </div>

      {editing && (
        <form method="post" onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-3">
          <StaffFields errors={errors} defaults={account} />
          <p className="text-sm text-muted sm:col-span-3">
            Mengganti peran membuat petugas ini keluar dan harus login ulang.
          </p>
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" disabled={pending !== null} className={small("primary")}>
              {pending === "update" ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setErrors({});
              }}
              className={small("secondary")}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      <Alert>{errors.form}</Alert>
      {tempPassword && (
        <TempPassword account={account} password={tempPassword} onClose={() => setTempPassword(null)} />
      )}
    </li>
  );
}
