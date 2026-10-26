import { fail, ok } from "@/lib/api";
import { renewSession } from "@/lib/session";

// Petugas berinteraksi (klik/ketik): perpanjang batas diam sesi. Dipanggil IdleGuard, maks. ~1x/menit.
export async function POST() {
  const user = await renewSession();
  if (!user) return fail(401, "Sesi berakhir. Silakan masuk lagi.");
  return ok({ renewed: true });
}
