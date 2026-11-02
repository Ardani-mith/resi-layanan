import { Suspense } from "react";
import { Panel, Skeleton, StaffHeader } from "@/components/ui";
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
      <Panel
        title="Tambah petugas"
        description="Sistem membuat kata sandi sementara. Serahkan ke petugas; mereka wajib menggantinya saat login pertama."
      >
        <StaffCreateForm />
      </Panel>

      <Panel
        title={
          <>
            Daftar akun{" "}
            <span className="ml-1 font-normal text-muted tabular-nums">
              {active} aktif dari {accounts.length}
            </span>
          </>
        }
        flush
      >
        <ul className="divide-y divide-line">
          {accounts.map((account) => (
            <StaffRow key={account.id} account={account} isSelf={account.id === user.id} />
          ))}
        </ul>
      </Panel>

      <AdminLog events={events} />
    </>
  );
}

export default function StaffPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <StaffHeader
        title="Kelola petugas"
        description="Akun dinonaktifkan, bukan dihapus, agar audit log tetap menunjuk ke orang yang menindak. Petugas yang dinonaktifkan atau diganti perannya langsung keluar dari semua perangkat."
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <StaffPanel />
      </Suspense>
    </div>
  );
}
