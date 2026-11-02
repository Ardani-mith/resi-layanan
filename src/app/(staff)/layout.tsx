import { type ReactNode, Suspense } from "react";
import { IdleGuard, StaffMobileBar, StaffSidebar, StaffTabBar } from "@/components/layout/StaffShell";
import { getClockInfo, getCurrentUser } from "@/lib/dal";

// Selama sesi dibaca: sidebar kosong selebar aslinya (layar lebar) / top bar kosong (layar kecil),
// supaya konten tidak bergeser.
const placeholder = (
  <>
    <div aria-hidden className="hidden w-60 shrink-0 lg:block" />
    <div aria-hidden className="h-14 border-b border-line bg-surface lg:hidden" />
  </>
);

// Sesi (cookie + DB) & jam demo = data saat request, jadi dibaca di dalam <Suspense>.
async function StaffChrome() {
  const user = await getCurrentUser();
  // Tanpa sesi: halaman sendiri yang mengalihkan ke /masuk (requireStaffPage).
  if (!user) return placeholder;
  const { offsetMs } = await getClockInfo();
  const staff = { name: user.name, role: user.role, mustChangePassword: user.mustChangePassword };
  return (
    <>
      <StaffSidebar user={staff} offsetMs={offsetMs} />
      <StaffMobileBar user={staff} offsetMs={offsetMs} />
      <StaffTabBar user={staff} />
      <IdleGuard />
    </>
  );
}

/**
 * Kerangka area petugas. Layar lebar: sidebar di kiri, konten sebagai panel "inset" (bertepi,
 * menggulir sendiri) di atas bingkai abu. Layar kecil: top bar + konten + tab bar bawah.
 * .staff-ui: sudut kartu lebih kecil daripada halaman warga (nuansa alat kerja, bukan brosur).
 */
export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="staff-ui flex min-h-dvh flex-col bg-surface-2 lg:flex-row dark:bg-[#070c17]">
      <a
        href="#konten"
        className="sr-only z-50 rounded-lg bg-brand px-3 py-2 text-on-brand focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Lewati ke konten
      </a>
      <Suspense fallback={placeholder}>
        <StaffChrome />
      </Suspense>
      {/* pb: ruang untuk tab bar bawah di layar kecil. relative: elemen absolute di dalam konten
          (mis. input sr-only) ikut terpotong panel yang menggulir sendiri, tidak memanjangkan
          halaman di luar panel (layar kosong di bawah saat digulir). */}
      <main
        id="konten"
        className="relative min-w-0 flex-1 bg-bg pb-20 lg:my-2 lg:mr-2 lg:h-[calc(100dvh-1rem)] lg:overflow-y-auto lg:rounded-xl lg:border lg:border-line lg:pb-0"
      >
        {children}
      </main>
    </div>
  );
}
