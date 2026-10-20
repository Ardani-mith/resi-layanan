import { type ReactNode, Suspense } from "react";
import Sidebar from "@/components/layout/Sidebar";
import StaffShell, { ContentHeader } from "@/components/layout/StaffShell";
import { getCurrentUser } from "@/lib/dal";

// Lebar sama dengan sidebar supaya konten tidak bergeser saat sidebar selesai dimuat.
const placeholder = <div aria-hidden className="hidden w-64 shrink-0 md:block" />;

// Sesi (cookie + DB) = data saat request, jadi dibaca di dalam <Suspense>.
async function StaffSidebar() {
  const user = await getCurrentUser();
  // Tanpa sesi: halaman sendiri yang mengalihkan ke /masuk (requireStaffPage).
  if (!user) return placeholder;
  return <Sidebar user={{ name: user.name, role: user.role, mustChangePassword: user.mustChangePassword }} />;
}

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <StaffShell>
      <a
        href="#konten"
        className="sr-only z-50 rounded-lg bg-brand px-3 py-2 text-on-brand focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Lewati ke konten
      </a>
      <Suspense fallback={placeholder}>
        <StaffSidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col md:pr-3 md:pb-3">
        <ContentHeader />
        <main id="konten" className="flex-1 bg-bg md:rounded-2xl md:border md:border-line">
          {children}
        </main>
      </div>
    </StaffShell>
  );
}
