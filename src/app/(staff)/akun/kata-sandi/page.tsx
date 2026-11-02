import { Suspense } from "react";
import { Alert, Skeleton, StaffHeader } from "@/components/ui";
import { requireStaffPage } from "@/lib/dal";
import { PASSWORD_PATH, STAFF_ROLES } from "@/lib/roles";
import PasswordForm from "./PasswordForm";

export const metadata = { title: "Ganti kata sandi" };

async function PasswordPanel() {
  const user = await requireStaffPage(STAFF_ROLES, PASSWORD_PATH);
  return (
    <div className="space-y-4">
      {user.mustChangePassword && (
        <Alert tone="warning">
          Anda masuk dengan kata sandi sementara dari admin. Buat kata sandi baru dulu sebelum mulai bekerja.
        </Alert>
      )}
      <div className="rounded-card border border-line bg-surface p-6">
        <PasswordForm temporary={user.mustChangePassword} />
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 p-4 sm:p-6 lg:py-14">
      <StaffHeader
        title="Ganti kata sandi"
        description="Setelah diganti, sesi di perangkat lain otomatis keluar. Perangkat ini tetap masuk."
      />
      <Suspense fallback={<Skeleton className="h-80" />}>
        <PasswordPanel />
      </Suspense>
    </div>
  );
}
