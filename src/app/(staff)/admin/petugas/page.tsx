import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { getAdminEvents, getStaffAccounts, requireStaffPage } from "@/lib/dal";
import AdminLog from "../AdminLog";
import { StaffCreateForm, StaffRow } from "./StaffManager";

export const metadata = { title: "Kelola petugas" };

async function StaffPanel() {
  const user = await requireStaffPage(["admin"], "/admin/petugas");
  const [accounts, events] = await Promise.all([getStaffAccounts(), getAdminEvents("account_", 15)]);
  const active = accounts.filter((a) => a.isActive).length;

  return (
    <>
      <section className="rounded-card border border-line bg-surface p-5" aria-labelledby="tambah-petugas">
        <h2 id="tambah-petugas" className="text-lg font-bold">
          Tambah petugas
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Sistem membuat kata sandi sementara. Serahkan ke petugas; mereka wajib menggantinya saat login
          pertama.
        </p>
        <StaffCreateForm />
      </section>

      <section className="rounded-card border border-line bg-surface" aria-labelledby="daftar-petugas">
        <h2 id="daftar-petugas" className="border-b border-line p-5 text-lg font-bold">
          Daftar akun{" "}
          <span className="text-sm font-normal text-muted">
            ({active} aktif dari {accounts.length})
          </span>
        </h2>
        <ul className="divide-y divide-line">
          {accounts.map((account) => (
            <StaffRow key={account.id} account={account} isSelf={account.id === user.id} />
          ))}
        </ul>
      </section>

      <AdminLog events={events} />
    </>
  );
}

export default function StaffPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola petugas</h1>
        <p className="mt-1 text-muted">
          Akun dinonaktifkan, bukan dihapus, agar audit log tetap menunjuk ke orang yang menindak. Petugas
          yang dinonaktifkan atau diganti perannya langsung keluar dari semua perangkat.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <StaffPanel />
      </Suspense>
    </div>
  );
}
