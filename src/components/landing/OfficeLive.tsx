import PixelOffice from "@/components/office/PixelOffice";
import { site } from "@/config/site";
import { getOfficeSnapshot, getTracking } from "@/lib/dal";
import { emptyOffice, roomForStep } from "@/lib/present";

/** Kantor transparan di beranda: isi ruangan dari data asli; resi contoh disorot di ruangannya. */
export default async function OfficeLive() {
  const [office, demo] = await Promise.all([getOfficeSnapshot(), getTracking(site.hero.exampleResi)]);
  const step = demo?.steps[demo.currentStep];
  const open = demo && demo.status !== "selesai" && demo.status !== "ditolak";
  return (
    <PixelOffice
      office={office}
      highlight={
        open
          ? {
              room: roomForStep(step?.key, demo.status === "perlu_perbaikan"),
              label: `Berkas ${demo.resi}`,
              late: demo.isLate,
            }
          : undefined
      }
    />
  );
}

/** Kerangka saat data dimuat: denah kosong (tetap terlihat utuh). */
export function OfficeSkeleton() {
  return <PixelOffice office={emptyOffice()} />;
}
