import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import RecoverForm from "./RecoverForm";

export const metadata = { title: "Lupa nomor resi" };

export default function ForgotResiPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <Link
        href="/lacak"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Lacak resi
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Lupa nomor resi?</h1>
      <p className="mt-1 text-muted">
        Masukkan NIK pemohon dan nomor HP yang didaftarkan saat mengajukan. Kami kirim kode ke nomor tersebut,
        lalu semua resi Anda tampil di sini.
      </p>
      <div className="mt-6">
        <RecoverForm />
      </div>
      <p className="mt-6 text-sm text-muted">
        Nomor HP sudah tidak aktif? Datang ke loket layanan dengan membawa KTP-el; petugas bisa mencarikan
        resi Anda.
      </p>
    </div>
  );
}
