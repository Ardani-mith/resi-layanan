import { type ReactNode, Suspense } from "react";
import { IdleGuard, StaffTabBar, StaffTopBar } from "@/components/layout/StaffShell";
import { getClockInfo, getCurrentUser } from "@/lib/dal";

// Tinggi sama dengan top bar supaya konten tidak bergeser saat sesi selesai dibaca.
const placeholder = <div aria-hidden className="h-14 border-b border-line bg-surface" />;

// Sesi (cookie + DB) & jam demo = data saat request, jadi dibaca di dalam <Suspense>.
async function StaffChrome() {
  const user = await getCurrentUser();
  // Tanpa sesi: halaman sendiri yang mengalihkan ke /masuk (requireStaffPage).
  if (!user) return placeholder;
  const { offsetMs } = await getClockInfo();
  const staff = { name: user.name, role: user.role, mustChangePassword: user.mustChangePassword };
  return (
    <>
      <StaffTopBar user={staff} offsetMs={offsetMs} />
      <StaffTabBar user={staff} />
      <IdleGuard />
    </>
  );
}

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <a
        href="#konten"
        className="sr-only z-50 rounded-lg bg-brand px-3 py-2 text-on-brand focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Lewati ke konten
      </a>
      <Suspense fallback={placeholder}>
        <StaffChrome />
      </Suspense>
      {/* pb: ruang untuk tab bar bawah di HP. */}
      <main id="konten" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
