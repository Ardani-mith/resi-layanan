import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Masuk petugas" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-2xl font-bold tracking-tight">Masuk petugas</h1>
      <p className="mt-1 text-muted">Untuk petugas loket, petugas teknis, pimpinan, dan admin.</p>
      <div className="mt-6 rounded-card border border-line bg-surface p-6 shadow-card">
        {/* useSearchParams (?next=) adalah data saat request → wajib di dalam Suspense. */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-4 text-sm text-muted">Warga tidak perlu akun: cukup lacak dengan nomor resi.</p>
    </div>
  );
}
