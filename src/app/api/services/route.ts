import { ok, route } from "@/lib/api";
import { getActiveServices } from "@/lib/dal";

// Daftar layanan aktif untuk form pengajuan & halaman /layanan.
export const GET = route(async () => ok(await getActiveServices()));
